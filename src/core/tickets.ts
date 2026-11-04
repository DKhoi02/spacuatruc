import type { ComboDef, Customer, GameState, ServiceDef, Side, TaskItem, HealthCondition } from "./types";
import { C, acupoint, muscle, zone, serviceDef, characterName, chapterDef } from "./content";
import { currentDayDef, keyOf, learnedItems, todaysNewItems, itemChapter, chapterItems, hasFeature, type LearnRef } from "./chapters";
import { getMastery, weakness, dueItems } from "./mastery";
import { rngDay, type Rng } from "./rng";
import { activeEventEffect } from "./events";
import { chairPatienceBonus, shopLevelDef } from "./equipment";

export const PREGNANT: HealthCondition = { id: "pregnant", label: "Đang mang thai 4 tháng" };

function sidesOf(ref: LearnRef): Side[] {
  if (ref.kind === "point") return acupoint(ref.id)?.sides ?? ["center"];
  if (ref.kind === "muscle") return muscle(ref.id)?.sides ?? ["center"];
  return [];
}

/** Expand an item reference into task items. `both`: bilateral items require both sides. */
export function expand(ref: LearnRef, rng: Rng, both: boolean): TaskItem[] {
  if (ref.kind === "zone") {
    const only = zone(ref.id)?.onlyFoot;
    if (only) return [{ kind: "zone", id: ref.id, foot: only }];
    return both ? [{ kind: "zone", id: ref.id, foot: "left" }, { kind: "zone", id: ref.id, foot: "right" }] : [{ kind: "zone", id: ref.id, foot: rng.chance(0.5) ? "left" : "right" }];
  }
  const sides = sidesOf(ref);
  const kind = ref.kind;
  if (sides.length <= 1) return [{ kind, id: ref.id, side: sides[0] ?? "center" }];
  if (sides.includes("front") || sides.includes("back")) return sides.map((side) => ({ kind, id: ref.id, side }));
  const lr = sides.filter((x) => x === "left" || x === "right");
  if (both) return lr.map((side) => ({ kind, id: ref.id, side }));
  return [{ kind, id: ref.id, side: rng.pick(lr) }];
}

export function poolRefs(svc: ServiceDef): LearnRef[] {
  return [
    ...(svc.pool.points ?? []).map((id) => ({ kind: "point" as const, id })),
    ...(svc.pool.muscles ?? []).map((id) => ({ kind: "muscle" as const, id })),
    ...(svc.pool.zones ?? []).map((id) => ({ kind: "zone" as const, id })),
  ];
}

export function learnedPool(s: GameState, svc: ServiceDef): LearnRef[] {
  const learned = new Set(learnedItems(s).map(keyOf));
  return poolRefs(svc).filter((r) => learned.has(keyOf(r)));
}

const flagOf = (r: LearnRef) => (r.kind === "point" ? acupoint(r.id)?.pregnancy : undefined);

/** Can a ticket be generated for this service right now? */
export function generatable(s: GameState, svc: ServiceDef): boolean {
  if (learnedPool(s, svc).length > 0) return true;
  return poolRefs(svc).length === 0 && (svc.pool.steps?.length ?? 0) > 0;
}

interface TicketOpts { regular?: boolean; pregnant?: boolean; /** combo part: fewer items per service */ scale?: number }

export function makeTicket(s: GameState, svc: ServiceDef, rng: Rng, opts: TicketOpts = {}): TaskItem[] {
  const steps: TaskItem[] = (svc.pool.steps ?? []).map((id) => ({ kind: "step", id }));
  const cands = learnedPool(s, svc);
  if (!cands.length) return steps;
  const [lo, hi] = svc.itemCount;
  let n = Math.min(cands.length, Math.max(1, Math.round(rng.int(lo, hi) * (opts.scale ?? 1))));
  const fresh = new Set(todaysNewItems(s).map(keyOf));
  const prio = (r: LearnRef) => {
    const k = keyOf(r);
    const m = getMastery(s, k);
    let p = rng.next() * 2;
    if (fresh.has(k)) p += 10;
    if (m.attempts > 0 && m.dueDay <= s.day) p += 2;
    p += weakness(s, k) * (opts.regular ? 1.5 : 0.3);
    return p;
  };
  const scored = cands.map((r) => ({ r, p: prio(r) })).sort((a, b) => b.p - a.p);
  let chosen: LearnRef[];
  if (s.chapter >= 2 && !s.freeMode) {
    const old = scored.filter((x) => itemChapter(keyOf(x.r)) < s.chapter);
    const cur = scored.filter((x) => itemChapter(keyOf(x.r)) >= s.chapter);
    let nOld = Math.round(n * 0.3);
    if (cur.length < n - nOld) nOld = n - cur.length;
    if (old.length < nOld) nOld = old.length;
    chosen = [...old.slice(0, nOld), ...cur.slice(0, n - nOld)].map((x) => x.r);
  } else chosen = scored.slice(0, n).map((x) => x.r);
  if (opts.pregnant && !chosen.some(flagOf)) {
    const flagged = cands.filter(flagOf).sort((a, b) => (flagOf(a) === "contraindicated" ? -1 : 1) - (flagOf(b) === "contraindicated" ? -1 : 1));
    if (flagged.length) { if (chosen.length >= n) chosen.pop(); chosen.push(flagged[0]); }
  }
  const items = chosen.flatMap((r) => expand(r, rng, rng.chance(0.7)));
  return [...steps, ...items];
}

function pickCharacters(rng: Rng): () => string {
  const ids = C().CUSTOMER_CHARACTER_IDS.length ? rng.shuffle(C().CUSTOMER_CHARACTER_IDS) : ["khach"];
  let i = 0;
  return () => ids[i++ % ids.length];
}

/** Waiting patience in game minutes for customers arriving today (receptionist on duty adds minutes). */
export function basePatience(s: GameState): number {
  const p = C().CONFIG.patience;
  return p.baseMin + (hasReceptionist(s) ? p.receptionistBonusMin : 0) + chairPatienceBonus(s);
}

export const hasReceptionist = (s: GameState) => s.staff.some((x) => x.role === "receptionist" && !x.sickToday);

const round5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);

/** Player session length (game minutes) of a service or combo. */
export function sessionMinutes(svc: ServiceDef | undefined, combo?: ComboDef): number {
  if (combo) {
    const sum = combo.services.reduce((a, id) => a + (serviceDef(id)?.durationMin ?? 30), 0);
    return round5(sum * C().CONFIG.combo.durationPct);
  }
  return svc?.durationMin ?? 30;
}

/** List price sum of a combo's services. */
export function comboListPrice(combo: { services: string[] }): number {
  return combo.services.reduce((a, id) => a + (serviceDef(id)?.basePrice ?? 0), 0);
}

/** Combos customers can order today: every service unlocked, available and with a generatable ticket. */
export function orderableCombos(s: GameState): ComboDef[] {
  const avail = new Set(availableServices(s).map((x) => x.id));
  return s.combos.filter((c) => c.services.length >= 2 && c.services.every((id) => avail.has(id)));
}

/** Chance a customer orders this combo: higher the bigger the discount vs list prices (GAME_DESIGN §11.5). */
export function comboChance(combo: ComboDef): number {
  const cfg = C().CONFIG.combo;
  const list = comboListPrice(combo);
  const discount = list > 0 ? Math.max(0, 1 - combo.price / list) : 0;
  return Math.max(0, cfg.baseChance + cfg.chancePerDiscount * discount);
}

/** Ticket for a combo: each service contributes fewer items (steps stay), duplicates removed. */
export function makeComboTicket(s: GameState, combo: ComboDef, rng: Rng): TaskItem[] {
  const out: TaskItem[] = [];
  const seen = new Set<string>();
  for (const id of combo.services) {
    const svc = serviceDef(id);
    if (!svc) continue;
    for (const it of makeTicket(s, svc, rng, { scale: C().CONFIG.combo.itemsPct })) {
      const k = it.kind === "step" ? `S:${it.id}` : it.kind === "zone" ? `Z:${it.id}:${it.foot}` : `${it.kind}:${it.id}:${it.side}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

function serviceWeights(s: GameState, services: ServiceDef[], pregnant: boolean): number[] {
  const fresh = new Set(todaysNewItems(s).map(keyOf));
  return services.map((svc) => {
    let w = 1;
    const pool = poolRefs(svc).map(keyOf);
    if (pool.some((k) => fresh.has(k))) w += 3;
    if (svc.chapter === s.chapter) w += 1;
    const mult = s.priceMultiplier[svc.id] ?? 1;
    w *= Math.max(0.2, 1 - (mult - 1) * 2.5);
    if (pregnant && learnedPool(s, svc).some(flagOf)) w += 5;
    return w;
  });
}

function weightedPick<T>(rng: Rng, arr: T[], w: number[]): T {
  const total = w.reduce((a, b) => a + b, 0);
  let x = rng.next() * total;
  for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; }
  return arr[arr.length - 1];
}

export function availableServices(s: GameState): ServiceDef[] {
  const vip = s.equipment.some((e) => e.id === "vip-room");
  return s.unlocked.services.map((id) => serviceDef(id)).filter((x): x is ServiceDef => !!x)
    .filter((svc) => !svc.vipOnly || vip).filter((svc) => generatable(s, svc));
}

/** Base expected customers for today (before randomness). */
export function customerRange(s: GameState): [number, number] {
  const def = currentDayDef(s);
  let [lo, hi]: [number, number] = s.freeMode || !def ? [4, 7] : def.customers;
  const rep = hasFeature(s, "reputation") || s.chapter > 1 ? 1 + (s.reputation - 3) * 0.1 : 1;
  const mults = s.unlocked.services.map((id) => s.priceMultiplier[id] ?? 1);
  const avg = mults.length ? mults.reduce((a, b) => a + b, 0) / mults.length : 1;
  const price = 1 - (avg - 1);
  let bonus = 0, bonusHi = 0;
  if (s.adsDaysLeft > 0) { bonus += ADS_BONUS[0]; bonusHi += ADS_BONUS[1]; }
  // GAME_DESIGN §12.1: every shop level brings more customers (total extra per level from CONFIG.shopLevels).
  const lvl = shopLevelDef(s.shopLevel ?? 0).customers;
  bonus += lvl[0]; bonusHi += lvl[1];
  // Parallel capacity: every KTV with a station of their own (the player keeps one bed) lets the shop take more bookings.
  const staffed = staffedStations(s);
  bonus += staffed * STAFFED_BONUS[0]; bonusHi += staffed * STAFFED_BONUS[1];
  lo = Math.max(1, Math.round(lo * rep * price) + bonus);
  hi = Math.max(lo, Math.round(hi * rep * price) + bonusHi);
  return [lo, hi];
}

/**
 * Size of a later arrival wave (customers arriving together after one more service is done).
 * Mostly singles with occasional pairs/trios: bursts still overflow a 2-seat queue (walkout lesson,
 * reason to buy chairs) without a steady ~25% walkout rate. Balance-tuned (was uniform 1..max).
 */
export function waveSize(rng: Rng, maxWave: number): number {
  const x = rng.next();
  if (maxWave >= 3) return x < 0.7 ? 1 : x < 0.92 ? 2 : 3;
  return x < 0.8 ? 1 : 2;
}


/**
 * Extra customers per day [lo, hi] per KTV working a station of their own / while ads run (shop levels: CONFIG.shopLevels).
 * Balance pass 04/11/2026: staffed [1,3]→[2,3], ads [1,2]→[2,3], expansion [2,3]→[1,2]; a cheap combo no longer
 * adds a customer (it only changes what customers order).
 */
export const STAFFED_BONUS: [number, number] = [2, 3];
export const ADS_BONUS: [number, number] = [2, 3];

/** KTVs (working today, able to do at least one unlocked service) that have a station besides the player's. */
export function staffedStations(s: GameState): number {
  const ktv = s.staff.filter((x) => x.role === "ktv" && !x.sickToday).length;
  if (!ktv) return 0;
  const stations = s.equipment.filter((e) => (e.id === "E01" || e.id === "E01-upgraded" || e.id === "vip-room") && e.usesLeft > 0).length;
  const canWork = s.unlocked.services.some((id) => {
    const svc = serviceDef(id);
    if (!svc) return false;
    const learned = learnedPool(s, svc);
    if (poolRefs(svc).length > 0 && learned.length === 0) return false;
    return learned.every((r) => getMastery(s, keyOf(r)).level >= 3);
  });
  return canWork ? Math.min(ktv, Math.max(0, stations - 1)) : 0;
}

/** Generate today's arrivals (mutates nothing; returns customers sorted by arrival minute). */
export function generateArrivals(s: GameState, examPlaceholder?: Customer): Customer[] {
  const rng = rngDay(s, "arrivals");
  const def = currentDayDef(s);
  const [lo, hi] = customerRange(s);
  const n = rng.int(lo, hi);
  const services = availableServices(s);
  const combos = orderableCombos(s);
  const out: Customer[] = [];
  const nextChar = pickCharacters(rng);
  const patience = basePatience(s);
  const healthOn = hasFeature(s, "health-profile");
  const regularsOn = s.chapter > 1 || s.freeMode || (def?.kind === "review") || (def?.chapterDay ?? 0) >= 6;
  let pregnantUsed = false;
  let regularIdx = 0;
  const regularIds = rng.shuffle(C().REGULAR_CHARACTER_IDS);
  const vipOwned = s.equipment.some((e) => e.id === "vip-room");
  const cc = C().CONFIG.combo;
  const comboW = combos.map(comboChance);
  const comboTotal = Math.min(cc.maxChance, comboW.reduce((a, b) => a + b, 0));
  for (let i = 0; i < n && services.length; i++) {
    const pregnant = healthOn && !pregnantUsed && rng.chance(def?.kind === "review" ? 0.5 : 0.2);
    const regular = !pregnant && regularsOn && regularIds.length > 0 && (rng.chance(def?.kind === "review" ? 0.5 : 0.2));
    const vip = !pregnant && !regular && vipOwned && rng.chance(0.15);
    const combo = !pregnant && !regular && combos.length > 0 && rng.chance(comboTotal) ? weightedPick(rng, combos, comboW) : undefined;
    const svc = combo ? serviceDef(combo.services[0])! : weightedPick(rng, services, serviceWeights(s, services, pregnant));
    const items = combo ? makeComboTicket(s, combo, rng) : makeTicket(s, svc, rng, { regular, pregnant });
    let characterId = nextChar();
    let special: Customer["special"];
    if (pregnant) { pregnantUsed = true; characterId = C().SPECIAL_CHARACTER_IDS.pregnant || characterId; special = "pregnant"; }
    else if (regular) characterId = regularIds[regularIdx++ % regularIds.length];
    else if (vip) { characterId = C().SPECIAL_CHARACTER_IDS.vip || characterId; special = "vip"; }
    out.push({
      id: `c${s.day}-${i + 1}`, characterId, name: characterName(characterId), serviceId: svc.id, items,
      ...(pregnant ? { health: PREGNANT } : {}), regular, ...(special ? { special } : {}),
      ...(combo ? { combo: { ...combo, services: [...combo.services] } } : {}),
      patience, arriveAt: 0, durationMin: sessionMinutes(svc, combo),
    });
  }
  // Group booking event: they come together.
  const groups: Customer[] = [];
  if (activeEventEffect(s) === "group-booking" && services.length) {
    const svc = rng.pick(services);
    const g = rng.int(2, 3);
    for (let j = 0; j < g; j++) {
      const office = s.chapter >= 5 && C().SPECIAL_CHARACTER_IDS.office && j === 0;
      const characterId = office ? C().SPECIAL_CHARACTER_IDS.office : nextChar();
      groups.push({ id: `c${s.day}-g${j + 1}`, characterId, name: characterName(characterId), serviceId: svc.id, items: makeTicket(s, svc, rng), regular: false, ...(office ? { special: "office" as const } : {}), patience: patience + 15, arriveAt: 0, durationMin: sessionMinutes(svc) });
    }
  }
  scheduleArrivals(s, out, groups, rng);
  const all = [...out, ...groups];
  if (examPlaceholder) {
    // anh Khôi comes in the quietest stretch of the day (middle of the longest gap between arrivals), so the
    // ~1 hour exam doesn't leave a just-arrived customer waiting (balance pass: was the median arrival).
    const { open, lastArrival } = C().CONFIG.clock;
    const times = [open, ...[...out, ...groups].map((c) => c.arriveAt).sort((a, b) => a - b), lastArrival];
    let at = open, best = -1;
    for (let i = 0; i + 1 < times.length; i++) {
      const gap = times[i + 1] - times[i];
      if (gap > best) { best = gap; at = times[i] + gap / 2 - 15; }
    }
    examPlaceholder.arriveAt = Math.max(open, Math.min(lastArrival, Math.round(at / 5) * 5));
    all.push(examPlaceholder);
  }
  return all.sort((a, b) => a.arriveAt - b.arriveAt);
}

/**
 * Arrival minutes: customers come in small waves spread over opening hours (first wave at 9:00, last
 * arrival before CONFIG.clock.lastArrival). Members of a wave arrive a few minutes apart, so bursts can
 * still overflow a 2-seat queue (walkout lesson, reason to buy chairs / beds / staff). Mutates.
 */
export function scheduleArrivals(s: GameState, out: Customer[], groups: Customer[], rng: Rng): void {
  const { open, lastArrival } = C().CONFIG.clock;
  const def = currentDayDef(s);
  const intro = def && def.chapterDay === s.chapterDay ? def.introduce : [];
  const firstWave = intro.includes("walkout") ? 3 : intro.includes("queue") ? 2 : 1;
  const maxWave = s.chapter >= 3 || s.freeMode ? 3 : 2;
  const sizes: number[] = [];
  for (let left = out.length; left > 0;) {
    const size = Math.min(left, sizes.length === 0 ? firstWave : waveSize(rng, maxWave));
    sizes.push(size);
    left -= size;
  }
  const W = sizes.length + (groups.length ? 1 : 0);
  const span = lastArrival - open;
  const slot = span / Math.max(1, W);
  const starts: number[] = [];
  for (let w = 0; w < W; w++) {
    if (w === 0) { starts.push(open); continue; }
    const jitter = rng.int(-Math.floor(slot / 4), Math.floor(slot / 4));
    starts.push(Math.min(lastArrival - 10, Math.max(open + 10, Math.round(open + slot * w + jitter))));
  }
  let idx = 0;
  sizes.forEach((size, w) => {
    let t = starts[w];
    for (let k = 0; k < size; k++) {
      if (k > 0) t += w === 0 ? rng.int(0, 5) : rng.int(0, 12);
      out[idx++].arriveAt = Math.min(lastArrival, t);
    }
  });
  if (groups.length) {
    // the group gets its own wave somewhere in the day (not the 9:00 one)
    const w = W > 1 ? rng.int(1, W - 1) : 0;
    let t = starts[w] + 20;
    for (const g of groups) { g.arriveAt = Math.min(lastArrival, t); t += rng.int(0, 3); }
  }
}

function bestService(s: GameState, refs: LearnRef[]): ServiceDef | undefined {
  const keys = new Set(refs.map(keyOf));
  const all = C().SERVICES;
  let best: ServiceDef | undefined, bestN = -1;
  for (const svc of all) {
    const n = poolRefs(svc).filter((r) => keys.has(keyOf(r))).length;
    if (n > bestN || (n === bestN && best && svc.chapter === s.chapter && best.chapter !== s.chapter)) { best = svc; bestN = n; }
  }
  return best;
}

/** Exam customers (anh Khôi), 1 session or 3 for the final exam; plus a pregnant case when required. Deterministic per day. */
export function buildExam(s: GameState): Customer[] {
  const ch = chapterDef(s.chapter);
  if (!ch) return [];
  const rng = rngDay(s, "exam");
  const examiner = C().EXAMINER_CHARACTER_ID;
  const own = chapterItems(ch.no);
  const ownKeys = new Set(own.map(keyOf));
  const earlier = learnedItems(s).filter((r) => !ownKeys.has(keyOf(r)) && itemChapter(keyOf(r)) < ch.no);
  const byWeak = (arr: LearnRef[]) => arr.map((r) => ({ r, p: weakness(s, keyOf(r)) + rng.next() * 3 })).sort((a, b) => b.p - a.p).map((x) => x.r);
  const out: Customer[] = [];
  const mk = (i: number, refs: LearnRef[], pregnant = false): Customer => {
    const svc = bestService(s, refs);
    const characterId = pregnant ? (C().SPECIAL_CHARACTER_IDS.pregnant || examiner) : examiner;
    return {
      id: `exam-${s.day}-${i}`, characterId, name: characterName(characterId), serviceId: svc?.id ?? s.unlocked.services[0] ?? "",
      items: refs.flatMap((r) => expand(r, rng, true)), regular: false,
      special: pregnant ? "pregnant" : "examiner", ...(pregnant ? { health: PREGNANT } : {}), ...examWait(svc),
    };
  };
  const learned = learnedItems(s);
  const flagged = learned.filter(flagOf);
  if (ch.exam.sessions <= 1) {
    const refs = [...own, ...byWeak(earlier).slice(0, ch.exam.reviewCount)];
    out.push(mk(1, refs));
    if (ch.exam.requirePregnantCase && flagged.length) {
      const f = flagged.sort((a, b) => itemChapter(keyOf(b)) - itemChapter(keyOf(a))).slice(0, 2);
      const svc = bestService(s, f);
      const extra = svc ? rng.shuffle(learnedPool(s, svc).filter((r) => !flagOf(r))).slice(0, 2) : [];
      out.push(mk(2, [...f, ...extra], true));
    }
    return out;
  }
  // Final exam: ~30 task items from every chapter, split into sessions by region.
  const chosen: LearnRef[] = [...own];
  const count = () => chosen.reduce((a, r) => a + expand(r, rng, true).length, 0);
  for (const r of byWeak(earlier)) { if (count() >= 30) break; chosen.push(r); }
  const regionOf = (r: LearnRef) => (r.kind === "point" ? acupoint(r.id)?.region : r.kind === "muscle" ? muscle(r.id)?.region : "leg-foot") ?? "z";
  chosen.sort((a, b) => regionOf(a).localeCompare(regionOf(b)));
  const per = Math.ceil(chosen.length / ch.exam.sessions);
  for (let i = 0; i < ch.exam.sessions; i++) {
    const refs = chosen.slice(i * per, (i + 1) * per);
    const last = i === ch.exam.sessions - 1;
    const pregnant = last && ch.exam.requirePregnantCase && flagged.length > 0;
    if (pregnant && !refs.some(flagOf)) refs.push(flagged.find((f) => flagOf(f) === "contraindicated") ?? flagged[0]);
    if (refs.length) out.push(mk(i + 1, refs, pregnant));
  }
  return out;
}

export function examPlaceholder(s: GameState): Customer {
  const sessions = buildExam(s);
  const id = C().EXAMINER_CHARACTER_ID;
  return {
    id: `exam-${s.day}`, characterId: id, name: characterName(id), serviceId: sessions[0]?.serviceId ?? s.unlocked.services[0] ?? "",
    items: sessions.flatMap((c) => c.items), regular: false, special: "examiner", ...examWait(serviceDef(sessions[0]?.serviceId ?? "")),
  };
}

export function dailyChallenge(s: GameState): Customer {
  const rng = rngDay(s, "challenge");
  const learned = learnedItems(s);
  const byKey = new Map(learned.map((r) => [keyOf(r), r]));
  const keys = dueItems(s, 10);
  for (const r of rng.shuffle(learned)) { if (keys.length >= 10) break; const k = keyOf(r); if (!keys.includes(k)) keys.push(k); }
  const refs = keys.map((k) => byKey.get(k)).filter((r): r is LearnRef => !!r);
  const items = refs.flatMap((r) => expand(r, rng, false)).slice(0, 10);
  const svc = s.unlocked.services.map((id) => serviceDef(id)).find((x) => x && refs[0] && poolRefs(x).some((r) => keyOf(r) === keyOf(refs[0]))) ?? serviceDef(s.unlocked.services[0]);
  const characterId = C().CUSTOMER_CHARACTER_IDS.length ? rng.pick(C().CUSTOMER_CHARACTER_IDS) : C().EXAMINER_CHARACTER_ID;
  return { id: `challenge-${s.day}`, characterId, name: characterName(characterId), serviceId: svc?.id ?? "", items, regular: false, ...examWait(svc) };
}


/** Exam / challenge customers never walk out and need no greeting. */
function examWait(svc: ServiceDef | undefined): Pick<Customer, "arriveAt" | "patience" | "checkedIn" | "durationMin"> {
  return { arriveAt: C().CONFIG.clock.open, patience: 9999, checkedIn: true, durationMin: svc?.durationMin ?? 30 };
}
