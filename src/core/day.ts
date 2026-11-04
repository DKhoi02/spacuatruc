import type { ChapterNo, Complaint, Customer, DayLedger, DaySummary, GameState, InService, ItemKey, ServiceId, ServiceRecord, TreatmentResult, SupplyId } from "./types";
import { C, acupoint, equipmentDef, serviceDef, supplyDef } from "./content";
import { currentDayDef, hasFeature, isExamDay, syncUnlocks } from "./chapters";
import { applyForgetting, applyScoredItems, isExamCustomer } from "./mastery";
import { scoreService, pregnancyFlag, type ScoredItem } from "./scoring";
import { availableServices, customerRange, examPlaceholder, generateArrivals, hasReceptionist } from "./tickets";
import { activeEventEffect, rollEvent } from "./events";
import { computeBill, consumeSupplies, customerServices, missingSupply, suppliesNeeded, type Bill } from "./economy";
import { durabilityPct, isElectric, isStationId, maxUsesOf, queueSeats, requiredTools, stationIdsForAll, stationsFor, tierComplaint, tierElectricity, tierOf, usable, useEquipment, newUid, slotsFor } from "./equipment";
import { autoRefreshCandidates, staffCanPerform, staffEndOfDay, staffStars } from "./staff";
import { rngFor } from "./rng";
import { addReputation, clone, meta, newDayState, round2, roundK, vErr, type DayStateX, type WalkoutReason } from "./util";

// ───────────── helpers ─────────────

const DEFAULT_COMPLAINTS: Record<string, string> = {
  "safety-eye": "Ui, chị ấn vào mắt em!",
  "safety-artery": "Chỗ đó ấn mạnh làm em choáng quá.",
  "safety-contra": "Em đang mang thai mà sao lại ấn huyệt đó?",
  "one-star": "Làm chưa tới, em chưa thấy dễ chịu gì cả.",
  "low-durability": "Giường cũ quá, nằm không thoải mái.",
  "long-wait": "Em phải chờ lâu quá.",
  "over-force": "Ấn mạnh quá, đau em!",
};
const DEFAULT_WALKOUTS: Record<string, string> = {
  patience: "Chờ lâu quá, khách bỏ về.",
  "queue-full": "Hết ghế chờ, khách bỏ về.",
  "no-supplies": "Hết vật tư cho dịch vụ khách muốn, khách bỏ về.",
  "no-bed": "Không có giường hoặc máy dùng được, khách bỏ về.",
  "no-equipment": "Tiệm chưa có (hoặc đang hỏng) đồ cần cho dịch vụ khách muốn, khách bỏ về.",
  "sent-away": "Khách được mời về.",
  closing: "Tiệm đóng cửa, khách ra về.",
};

function complaintText(s: GameState, key: string, salt: string): string {
  const list = (C().TEXTS.complaintReasons as Record<string, string[] | undefined>)[key];
  if (list && list.length) return rngFor(s, salt).pick(list);
  return DEFAULT_COMPLAINTS[key] ?? "Em chưa hài lòng lắm.";
}

export function walkoutReasonText(reason: WalkoutReason): string {
  const t = (C().TEXTS.walkoutReasons as Record<string, string | undefined>)[reason];
  return t ?? DEFAULT_WALKOUTS[reason];
}

/** Reason a customer walked out today (for UI). */
export function walkoutReason(s: GameState, customerId: string): { key: WalkoutReason; text: string } | undefined {
  const r = (s.today as DayStateX).meta?.walkoutReasons?.[customerId];
  return r ? { key: r, text: walkoutReasonText(r) } : undefined;
}

function requireOpen(s: GameState) {
  if (s.today.phase !== "open") throw vErr("Tiệm chưa mở cửa.");
}

function requirePlayerFree(s: GameState) {
  const p = s.today.inService.find((x) => x.performer === "player");
  if (p) throw vErr(`Bạn đang làm cho ${servingCustomer(s, p.customerId)?.name ?? "khách"}. Làm xong ca đó trước nhé.`);
}

function serving(s: GameState): Record<string, Customer> {
  const m = meta(s);
  if (!m.serving) m.serving = {};
  return m.serving;
}

function walkOut(s: GameState, c: Customer, reason: WalkoutReason) {
  s.today.walkouts.push(c.id);
  const m = meta(s);
  (m.walkoutReasons ??= {})[c.id] = reason;
  if (!isExamCustomer(c) && reason !== "closing") addReputation(s, C().CONFIG.reputation.walkout);
}

const walkoutOn = (s: GameState) => hasFeature(s, "walkout") || hasFeature(s, "patience") || s.chapter > 1 || s.freeMode;
const drainRate = (c: Customer) => (c.checkedIn ? 1 : C().CONFIG.patience.uncheckedRate);
const round5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);

/** Stations in use: someone being served there, or the cleaner working on it. */
function busyStations(s: GameState): Set<string> {
  return new Set([...s.today.inService.map((x) => x.bedSlot), ...(s.today.cleaning ?? []).map((x) => x.stationUid)]);
}

type Block = { kind: "no-supplies" | "no-bed" | "no-equipment" | "busy" | "dirty"; reason: string; bedSlot?: string };

/** Why a customer can't be served now (undefined → ok; bedSlot set). */
function blockFor(s: GameState, c: Customer): Block | { kind: "ok"; bedSlot: string } {
  const svcs = customerServices(c);
  if (isExamCustomer(c) || !svcs.length) {
    const busy = new Set(s.today.inService.map((x) => x.bedSlot));
    const bed = s.equipment.find((e) => ["E01", "E01-upgraded"].includes(e.id) && !busy.has(e.uid)) ?? s.equipment.find((e) => !busy.has(e.uid));
    return { kind: "ok", bedSlot: bed?.uid ?? "exam" };
  }
  const miss = missingSupply(s, c);
  if (miss) return { kind: "no-supplies", reason: `Hết vật tư: ${supplyDef(miss)?.name ?? miss}.` };
  for (const tid of requiredTools(svcs)) {
    const owned = s.equipment.filter((e) => e.id === tid);
    if (!owned.length) return { kind: "no-equipment", reason: `Cần có ${equipmentDef(tid)?.name ?? tid}.` };
    if (!owned.some((e) => usable(s, e))) {
      const outage = activeEventEffect(s) === "power-outage" && isElectric(equipmentDef(tid));
      return { kind: "no-equipment", reason: outage ? `Mất điện, không dùng được ${equipmentDef(tid)?.name ?? tid}.` : `${equipmentDef(tid)?.name ?? tid} đã hỏng, cần sửa.` };
    }
  }
  let stations = stationsFor(s, svcs).filter((e) => usable(s, e));
  // VIP customers only use the VIP room when the shop has one.
  if (c.special === "vip" && s.equipment.some((e) => e.id === "vip-room")) stations = s.equipment.filter((e) => e.id === "vip-room" && usable(s, e));
  if (!stations.length) {
    // non-bed stations (shampoo chair, foot-bath chair...) are equipment the shop may simply not own yet
    const ids = stationIdsForAll(svcs);
    const bedLike = ids.some((id) => (equipmentDef(id)?.effect.beds ?? 0) > 0);
    if (!bedLike) {
      const name = equipmentDef(ids[0])?.name ?? ids[0];
      return { kind: "no-equipment", reason: s.equipment.some((e) => ids.includes(e.id)) ? `${name} đã hỏng, cần sửa.` : `Cần có ${name}.` };
    }
    return { kind: "no-bed", reason: "Không có giường dùng được." };
  }
  const busy = busyStations(s);
  const free = stations.find((e) => !busy.has(e.uid) && !e.dirty);
  if (free) return { kind: "ok", bedSlot: free.uid };
  if (stations.some((e) => !busy.has(e.uid) && e.dirty)) return { kind: "dirty", reason: "Giường chưa dọn: dọn giường trước khi mời khách mới." };
  return { kind: "busy", reason: "Giường đang bận." };
}

function admit(s: GameState, c: Customer) {
  if (isExamCustomer(c)) { s.today.queue.push({ ...c, checkedIn: true }); return; }
  const b = blockFor(s, c);
  if (b.kind === "no-supplies" || b.kind === "no-bed" || b.kind === "no-equipment") { walkOut(s, c, b.kind); return; }
  if (s.today.queue.filter((q) => !isExamCustomer(q)).length >= queueSeats(s)) { walkOut(s, c, "queue-full"); return; }
  s.today.queue.push(c);
  // extra chairs wear out when used
  if (s.today.queue.length > C().CONFIG.startSeats) {
    const chair = s.equipment.find((e) => (equipmentDef(e.id)?.effect.queueSeats ?? 0) > 0 && e.usesLeft > 0);
    if (chair) useEquipment(s, chair.uid);
  }
}

/**
 * Receptionist greets everyone; an idle cleaner starts on the next dirty station; while the player is busy with a
 * treatment, an idle KTV greets and takes the first waiting customer they can serve (balance pass: otherwise the
 * extra bed stood empty during every player session). Mutates.
 */
function autoStaff(s: GameState) {
  if (hasReceptionist(s)) for (const c of s.today.queue) c.checkedIn = true;
  if (s.today.inService.some((x) => x.performer === "player")) {
    for (const st of s.staff) {
      if (st.role !== "ktv" || st.sickToday || st.servicesToday >= KTV_AUTO_MAX || s.today.inService.some((x) => x.performer === st.uid)) continue;
      for (const c of s.today.queue) {
        if (isExamCustomer(c) || !customerServices(c).length || !customerServices(c).every((svc) => staffCanPerform(s, svc.id))) continue;
        const b = blockFor(s, c);
        if (b.kind !== "ok") continue;
        c.checkedIn = true;
        startStaff(s, c, st.uid, st.tier, b.bedSlot);
        (meta(s).autoAssigned ??= []).push(c.id);
        break;
      }
    }
  }
  const cleaner = s.staff.find((x) => x.role === "cleaner" && !x.sickToday);
  s.today.cleaning ??= [];
  if (cleaner && !s.today.cleaning.some((j) => j.staffUid === cleaner.uid)) {
    const inUse = new Set(s.today.inService.map((x) => x.bedSlot));
    const dirty = s.equipment.find((e) => e.dirty && !inUse.has(e.uid));
    if (dirty) s.today.cleaning.push({ stationUid: dirty.uid, staffUid: cleaner.uid, startAt: s.today.clock, endsAt: s.today.clock + C().CONFIG.clock.cleanMin });
  }
}

/** Minute the first waiting customer runs out of patience (walkouts on), else Infinity. */
function nextPatienceExpiry(s: GameState): number {
  if (!walkoutOn(s)) return Infinity;
  let t = Infinity;
  for (const c of s.today.queue) {
    if (isExamCustomer(c)) continue;
    t = Math.min(t, s.today.clock + Math.max(0, Math.ceil(c.patience / drainRate(c) - 1e-9)));
  }
  return t;
}

export type ClockEvent = { at: number; kind: "arrival" | "staff" | "cleaning"; label: string };

/** Next thing "Chờ" can wait for: an arrival, a KTV finishing, the cleaner finishing. */
export function nextEvent(s: GameState): ClockEvent | undefined {
  const ev: ClockEvent[] = [];
  const a = s.today.arrivals[0] && s.today.arrivals.reduce((m, x) => (x.arriveAt < m.arriveAt ? x : m));
  if (a) ev.push({ at: a.arriveAt, kind: "arrival", label: isExamCustomer(a) ? "anh Khôi đến kiểm tra" : "khách tiếp theo" });
  for (const x of s.today.inService) {
    if (x.performer === "player") continue;
    const st = s.staff.find((y) => y.uid === x.performer);
    ev.push({ at: x.endsAt, kind: "staff", label: `${st ? `KTV ${st.name}` : "KTV"} làm xong` });
  }
  for (const j of s.today.cleaning ?? []) ev.push({ at: j.endsAt, kind: "cleaning", label: "tạp vụ dọn xong" });
  if (!ev.length) return undefined;
  ev.sort((x, y) => x.at - y.at || (x.kind === "staff" ? -1 : 1));
  return { ...ev[0], at: Math.max(ev[0].at, s.today.clock) };
}

/** Waiting customers lose patience for `dt` minutes (×1.5 before check-in). Mutates. */
function drain(s: GameState, dt: number) {
  if (dt <= 0) return;
  const on = walkoutOn(s);
  for (const c of s.today.queue) {
    if (isExamCustomer(c)) continue;
    c.patience = Math.max(on ? -1 : 0, c.patience - dt * drainRate(c));
  }
}

/** Everything due at the current clock: KTV done, cleaning done, arrivals, patience walkouts. Mutates. */
function processDue(s: GameState) {
  const now = s.today.clock;
  for (const x of s.today.inService.filter((y) => y.performer !== "player" && y.endsAt <= now).sort((a, b) => a.endsAt - b.endsAt)) finishStaffService(s, x);
  for (const j of (s.today.cleaning ?? []).filter((y) => y.endsAt <= now)) {
    const e = s.equipment.find((x) => x.uid === j.stationUid);
    if (e) e.dirty = false;
  }
  s.today.cleaning = (s.today.cleaning ?? []).filter((y) => y.endsAt > now);
  autoStaff(s);
  const due = s.today.arrivals.filter((a) => a.arriveAt <= now).sort((a, b) => a.arriveAt - b.arriveAt);
  if (due.length) {
    s.today.arrivals = s.today.arrivals.filter((a) => a.arriveAt > now);
    for (const c of due) { admit(s, c); autoStaff(s); }
  }
  if (walkoutOn(s)) {
    const stay: Customer[] = [];
    for (const c of s.today.queue) {
      if (!isExamCustomer(c) && c.patience <= 1e-6) walkOut(s, c, "patience");
      else stay.push(c);
    }
    s.today.queue = stay;
  }
}

/** Advance the clock to `t`, processing every event on the way in order. Mutates. */
export function advanceTo(s: GameState, t: number) {
  for (let guard = 0; guard < 2000; guard++) {
    autoStaff(s);
    const ev = nextEvent(s);
    const e = Math.min(ev ? ev.at : Infinity, nextPatienceExpiry(s));
    if (e > t) break;
    const at = Math.max(e, s.today.clock);
    drain(s, at - s.today.clock);
    s.today.clock = at;
    processDue(s);
  }
  drain(s, t - s.today.clock);
  s.today.clock = Math.max(s.today.clock, t);
  processDue(s);
}

/** Time passes for `minutes` (exam session...). Mutates. */
export function passTime(s: GameState, minutes: number) {
  if (s.today.phase === "open") advanceTo(s, s.today.clock + minutes);
}

function complaintChance(s: GameState, stationUid?: string): number {
  let delta = 0;
  for (const e of s.equipment) {
    const d = equipmentDef(e.id);
    if (!d || e.usesLeft <= 0 || !d.effect.complaintChanceDelta) continue;
    const v = d.effect.complaintChanceDelta;
    delta += Math.abs(v) > 1 ? v / 100 : v;
  }
  if (s.staff.some((x) => x.role === "cleaner" && !x.sickToday)) delta -= 0.15;
  // GAME_DESIGN §12.2: an upgraded station (bed / chair) makes complaints less likely.
  delta += tierComplaint(s.equipment.find((e) => e.uid === stationUid));
  return Math.max(0.05, Math.min(0.9, 0.5 + delta));
}

function safetyKey(items: ScoredItem[], c: Customer): string {
  const it = items.find((x) => x.safetyErrors > 0);
  if (!it) return "safety-eye";
  const item = it.result.item;
  if (c.health?.id === "pregnant" && pregnancyFlag(item) && !it.result.skipped) return "safety-contra";
  if (item.kind === "point") {
    const d = acupoint(item.id);
    if (d?.region === "eye-forehead") return "safety-eye";
    if (d?.sensitive) return "safety-artery";
    return it.result.forceScore !== undefined ? "over-force" : "safety-eye";
  }
  if (item.kind === "muscle") return "safety-artery";
  return "over-force";
}

function makeComplaint(s: GameState, c: Customer, key: string, total: number): Complaint {
  const comp: Complaint = {
    id: `cp-${c.id}`, customerId: c.id, customerName: c.name, reason: complaintText(s, key, `cp-${c.id}`),
    refundIfApologize: roundK(total * C().CONFIG.refundPct),
  };
  s.today.complaints.push(comp);
  meta(s).complaintsTotal++;
  return comp;
}

function pickComplaintKey(s: GameState, c: Customer, stars: number, safety: number, items: ScoredItem[], stationUid: string, waitedLong: boolean): string | undefined {
  if (safety > 0) return safetyKey(items, c);
  if (!(hasFeature(s, "complaint") || s.chapter > 1 || s.freeMode)) return undefined;
  if (stars === 1) return "one-star";
  const rng = rngFor(s, `complaint-${c.id}`);
  const p = complaintChance(s, stationUid);
  const st = s.equipment.find((e) => e.uid === stationUid);
  if (st && durabilityPct(st) < C().CONFIG.lowDurabilityPct && rng.chance(p)) return "low-durability";
  if (waitedLong && rng.chance(p * 0.5)) return "long-wait";
  return undefined;
}

function applyServiceReputation(s: GameState, stars: number, safety: number) {
  const r = C().CONFIG.reputation;
  if (stars === 3) addReputation(s, r.threeStar);
  if (safety > 0) addReputation(s, r.safetyError); // (instead of the 1★ penalty)
  else if (stars === 1) addReputation(s, r.oneStar);
}

/** Uses supplies + station + tools for a service (mutates). */
function consumeFor(s: GameState, c: Customer, bedSlot: string) {
  const svcs = customerServices(c);
  if (!svcs.length || isExamCustomer(c)) return;
  consumeSupplies(s, c);
  if (s.equipment.some((e) => e.uid === bedSlot)) useEquipment(s, bedSlot);
  for (const tid of requiredTools(svcs)) {
    const e = s.equipment.filter((x) => x.id === tid && usable(s, x)).sort((a, b) => tierOf(b) - tierOf(a))[0];
    if (e) useEquipment(s, e.uid);
  }
  for (const svc of svcs) s.today.ledger.electricity += svc.electricityPerUse;
}

// ───────────── public day flow ─────────────

export function getMorningBrief(s: GameState): { expectedCustomers: [number, number]; likelyServices: ServiceId[]; tips: string[]; rentDueInDays: number; event?: { title: string; description: string } } {
  const range = customerRange(s);
  const exam = isExamDay(s);
  const expected: [number, number] = exam ? [range[0] + 1, range[1] + 1] : range;
  const likely = availableServices(s).map((x) => x.id);
  const tips: string[] = [];
  const def = currentDayDef(s);
  if (def && def.chapterDay === s.chapterDay) tips.push(...def.tips);
  tips.push(...((s.today as DayStateX).meta?.notes ?? []));
  if (exam && !tips.some((t) => /kiểm tra/i.test(t))) tips.push("Hôm nay anh Khôi đến kiểm tra tay nghề. Chỉ hiện tên huyệt, cần đạt từ " + (C().CHAPTERS.find((c) => c.no === s.chapter)?.exam.passScore ?? 80) + " điểm và không có lỗi an toàn.");
  const rentDueInDays = s.rent.nextDueDay - s.day;
  if (rentDueInDays <= 2 && rentDueInDays >= 0) tips.push(rentDueInDays === 0 ? `Cuối ngày hôm nay trả tiền thuê ${s.rent.amount.toLocaleString("vi-VN")}đ.` : `Tiền thuê ${s.rent.amount.toLocaleString("vi-VN")}đ đến hạn sau ${rentDueInDays} ngày.`);
  if (s.rent.missedPayments > 0) tips.push("Chủ nhà nhắc: tuần trước chưa trả tiền thuê. Lần này mà chưa trả thì tiệm phải làm lại từ đầu chương.");
  // supply warnings (receptionist, or always in chapter 1)
  const warn = s.staff.some((x) => x.role === "receptionist") || s.chapter === 1;
  if (warn) {
    const need: Partial<Record<SupplyId, number>> = {};
    for (const id of likely) {
      const svc = serviceDef(id);
      if (!svc) continue;
      for (const [k, n] of Object.entries(suppliesNeeded(s, svc)) as [SupplyId, number][]) need[k] = Math.max(need[k] ?? 0, n * Math.ceil(expected[1] / Math.max(1, likely.length)));
    }
    for (const [k, n] of Object.entries(need) as [SupplyId, number][]) {
      const have = s.inventory[k] ?? 0;
      if (have <= 0) tips.push(`Hết ${supplyDef(k)?.name ?? k}: khách gọi dịch vụ cần vật tư này sẽ bỏ về. Nhập thêm trước khi mở cửa.`);
      else if (have < n) tips.push(`Sắp hết ${supplyDef(k)?.name ?? k} (còn ${have}).`);
    }
  }
  // required tools that the shop doesn't own yet (customers for that service would walk out on arrival)
  const missingTools = new Map<string, string[]>();
  for (const id of likely) {
    const svc = serviceDef(id);
    if (!svc) continue;
    for (const tid of svc.requiresEquipment) {
      if ((equipmentDef(tid)?.effect.beds ?? 0) > 0 || s.equipment.some((e) => e.id === tid)) continue;
      missingTools.set(tid, [...(missingTools.get(tid) ?? []), svc.name]);
    }
  }
  for (const [tid, names] of missingTools) tips.push(`Chưa có ${equipmentDef(tid)?.name ?? tid}: khách gọi ${names.join(", ")} sẽ bỏ về. Mua trong Cửa hàng → Đồ dùng.`);
  for (const e of s.equipment) {
    const d = equipmentDef(e.id);
    if (!d) continue;
    if (e.usesLeft <= 0) tips.push(`${d.name} đã hỏng, cần sửa.`);
    else if (durabilityPct(e) < C().CONFIG.lowDurabilityPct) tips.push(`${d.name} còn độ bền thấp, khách dễ phàn nàn.`);
  }
  for (const st of s.staff) {
    if (st.promotionRequested) tips.push(`${st.name} đang xin lên trình độ.`);
    if (st.quitNoticeDaysLeft !== undefined) tips.push(`${st.name} sắp nghỉ việc (còn ${st.quitNoticeDaysLeft} ngày).`);
  }
  const ev = s.today.event;
  return { expectedCustomers: expected, likelyServices: likely, tips, rentDueInDays, ...(ev ? { event: { title: ev.title, description: ev.description } } : {}) };
}

export function openShop(s0: GameState): GameState {
  if (s0.today.phase !== "prep") throw vErr("Tiệm đã mở cửa rồi.");
  const s = clone(s0);
  s.today.phase = "open";
  s.today.clock = C().CONFIG.clock.open;
  s.today.cleaning = [];
  for (const e of s.equipment) delete e.dirty;
  const exam = isExamDay(s);
  s.today.examActive = exam;
  s.today.arrivals = generateArrivals(s, exam ? examPlaceholder(s) : undefined);
  for (const c of s.today.arrivals) if (c.regular && !s.regulars.includes(c.characterId)) s.regulars.push(c.characterId);
  if (s.adsDaysLeft > 0) s.adsDaysLeft--;
  advanceTo(s, s.today.clock);
  return s;
}

/** Processes everything due at the current minute (no time passes). */
export function processArrivals(s0: GameState): GameState {
  const s = clone(s0);
  if (s.today.phase === "open") advanceTo(s, s.today.clock);
  return s;
}

/** "Chờ": jump to the next event (arrival, KTV finished, cleaner finished). */
export function advanceTime(s0: GameState): GameState {
  requireOpen(s0);
  requirePlayerFree(s0);
  const ev = nextEvent(s0);
  if (!ev) throw vErr("Không còn gì để chờ. Hết khách thì có thể đóng cửa.");
  const s = clone(s0);
  advanceTo(s, ev.at);
  return s;
}

/** Đón khách (check-in) by the player: 5 game minutes. */
export function checkIn(s0: GameState, customerId: string): GameState {
  requireOpen(s0);
  const c0 = s0.today.queue.find((x) => x.id === customerId);
  if (!c0) throw vErr("Khách không còn trong hàng chờ.");
  if (c0.checkedIn) throw vErr("Khách đã được đón rồi.");
  requirePlayerFree(s0);
  const s = clone(s0);
  s.today.queue.find((x) => x.id === customerId)!.checkedIn = true;
  advanceTo(s, s.today.clock + C().CONFIG.clock.checkInMin);
  return s;
}

/** Dọn giường by the player: 10 game minutes. */
export function cleanStation(s0: GameState, stationUid: string): GameState {
  requireOpen(s0);
  const e0 = s0.equipment.find((x) => x.uid === stationUid);
  if (!e0) throw vErr("Không tìm thấy giường.");
  if (!e0.dirty) throw vErr("Giường này đang sạch.");
  if ((s0.today.cleaning ?? []).some((j) => j.stationUid === stationUid)) throw vErr("Tạp vụ đang dọn giường này.");
  if (s0.today.inService.some((x) => x.bedSlot === stationUid)) throw vErr("Giường đang có khách.");
  requirePlayerFree(s0);
  const s = clone(s0);
  delete s.equipment.find((x) => x.uid === stationUid)!.dirty;
  advanceTo(s, s.today.clock + C().CONFIG.clock.cleanMin);
  return s;
}

/** True when the shop may close now although customers are still expected (nobody waiting or being served). */
export function canCloseEarly(s: GameState): boolean {
  const t = s.today;
  return t.phase === "open" && t.queue.length === 0 && t.inService.length === 0 && !t.arrivals.some(isExamCustomer);
}

export function canServe(s: GameState, customerId: string): { ok: true; bedSlot: string } | { ok: false; reason: string } {
  if (s.today.phase !== "open") return { ok: false, reason: "Tiệm chưa mở cửa." };
  const c = s.today.queue.find((x) => x.id === customerId);
  if (!c) return { ok: false, reason: "Khách không còn trong hàng chờ." };
  if (!customerServices(c).length && !isExamCustomer(c)) return { ok: false, reason: "Dịch vụ không tồn tại." };
  if (!c.checkedIn && !isExamCustomer(c)) return { ok: false, reason: "Cần đón khách trước (5 phút)." };
  const b = blockFor(s, c);
  return b.kind === "ok" ? { ok: true, bedSlot: b.bedSlot } : { ok: false, reason: b.reason };
}

export function startPlayerService(s0: GameState, customerId: string): GameState {
  requireOpen(s0);
  if (s0.today.inService.some((x) => x.performer === "player")) throw vErr("Bạn đang làm cho khách khác.");
  const cs = canServe(s0, customerId);
  if (!cs.ok) throw vErr(cs.reason);
  const s = clone(s0);
  const c = s.today.queue.find((x) => x.id === customerId)!;
  s.today.queue = s.today.queue.filter((x) => x.id !== customerId);
  const now = s.today.clock;
  s.today.inService.push({ customerId, performer: "player", bedSlot: cs.bedSlot, startAt: now, endsAt: now + (c.durationMin || 30) });
  serving(s)[customerId] = c;
  consumeFor(s, c, cs.bedSlot);
  return s;
}

function finishBilling(s: GameState, c: Customer, record: ServiceRecord, bill: Bill, items: ScoredItem[], bedSlot: string, waitedLong: boolean) {
  s.money += bill.total;
  s.today.records.push(record);
  (meta(s).bills ??= {})[c.id] = bill;
  applyServiceReputation(s, bill.stars, record.safetyErrors);
  const key = pickComplaintKey(s, c, bill.stars, record.safetyErrors, items, bedSlot, waitedLong);
  return key ? makeComplaint(s, c, key, bill.total) : undefined;
}

/** Waited until less than ~25% of the normal patience was left (complaint "long-wait" possible). */
const waitedLong = (c: Customer) => c.patience < C().CONFIG.patience.baseMin * C().CONFIG.patience.longWaitPct;

/** A station was used: it needs cleaning; the service leaves it. Mutates. */
function leaveStation(s: GameState, bedSlot: string, customerId: string) {
  s.today.inService = s.today.inService.filter((x) => x.customerId !== customerId);
  const e = s.equipment.find((x) => x.uid === bedSlot);
  if (e && isStationId(e.id)) e.dirty = true;
  delete serving(s)[customerId];
  s.today.servicesCompleted++;
}

const recordFor = (c: Customer, performer: string, stars: 1 | 2 | 3, score: number, bill: Bill, safetyErrors: number): ServiceRecord => ({
  customerId: c.id, customerName: c.name, serviceId: c.serviceId, ...(c.combo ? { comboName: c.combo.name } : {}),
  performer, stars, score, price: bill.price, tip: bill.tip, discount: bill.discount, safetyErrors,
});

export function completePlayerService(s0: GameState, result: TreatmentResult): { state: GameState; record: ServiceRecord; bill: Bill; complaint?: { reason: string } } {
  requireOpen(s0);
  const slot0 = s0.today.inService.find((x) => x.customerId === result.customerId && x.performer === "player");
  if (!slot0) throw vErr("Khách này không ở trong phòng trị liệu.");
  const s = clone(s0);
  const c = serving(s)[result.customerId];
  if (!c) throw vErr("Không tìm thấy thông tin khách.");
  if (isExamCustomer(c)) throw vErr("Bài kiểm tra dùng finishExam.");
  // The clock jumps by the service duration (KTVs finish, customers arrive, patience runs meanwhile).
  advanceTo(s, slot0.endsAt);
  const svc = customerServices(c)[0];
  const sc = scoreService(result, c);
  const usePatience = s.chapter >= 2 || hasFeature(s, "patience");
  const bill = computeBill(s, c, svc, sc.stars, sc.score, { patienceLeft: usePatience ? result.patienceLeft : undefined, stationUid: slot0.bedSlot });
  s.today.ledger.revenuePlayer += bill.price;
  s.today.ledger.tips += bill.tip;
  applyScoredItems(s, sc.items);
  const record = recordFor(c, "player", sc.stars, sc.score, bill, sc.safetyErrors);
  const comp = finishBilling(s, c, record, bill, sc.items, slot0.bedSlot, waitedLong(c));
  leaveStation(s, slot0.bedSlot, c.id);
  advanceTo(s, s.today.clock);
  return { state: s, record, bill, ...(comp ? { complaint: { reason: comp.reason } } : {}) };
}

/** Session length of a KTV for a customer (service duration × tier factor, rounded to 5 minutes). */
export function staffMinutes(c: Customer, tier: 1 | 2 | 3): number {
  return round5((c.durationMin || 30) * (C().CONFIG.ktvTimeFactor[tier] ?? 1));
}

/** Hand a checked-in customer to a free KTV: supplies used now, bed busy until the KTV finishes (billed then). */
export function assignToStaff(s0: GameState, customerId: string, staffUid: string): { state: GameState; service: InService } {
  requireOpen(s0);
  const st0 = s0.staff.find((x) => x.uid === staffUid);
  if (!st0 || st0.role !== "ktv") throw vErr("Không tìm thấy kỹ thuật viên.");
  if (st0.sickToday) throw vErr(`${st0.name} nghỉ hôm nay.`);
  if (s0.today.inService.some((x) => x.performer === staffUid)) throw vErr(`${st0.name} đang làm cho khách khác.`);
  const c0 = s0.today.queue.find((x) => x.id === customerId);
  if (!c0) throw vErr("Khách không còn trong hàng chờ.");
  if (isExamCustomer(c0)) throw vErr("Bài kiểm tra phải do bạn tự làm.");
  if (!customerServices(c0).every((svc) => staffCanPerform(s0, svc.id))) throw vErr("KTV chưa làm được dịch vụ này: bạn cần thành thạo mức 3 mọi huyệt/cơ của dịch vụ.");
  const cs = canServe(s0, customerId);
  if (!cs.ok) throw vErr(cs.reason);
  const s = clone(s0);
  const c = s.today.queue.find((x) => x.id === customerId)!;
  const service = startStaff(s, c, staffUid, st0.tier, cs.bedSlot);
  return { state: s, service };
}

/** KTV sessions a KTV takes on their own (while the player treats) per day; more is overwork (GAME_DESIGN §7.5). */
const KTV_AUTO_MAX = 6;

/** A KTV starts on a waiting customer (supplies used now, billed when done). Mutates. */
function startStaff(s: GameState, c: Customer, staffUid: string, tier: 1 | 2 | 3, bedSlot: string): InService {
  s.today.queue = s.today.queue.filter((x) => x.id !== c.id);
  consumeFor(s, c, bedSlot);
  const now = s.today.clock;
  const service: InService = { customerId: c.id, performer: staffUid, bedSlot, startAt: now, endsAt: now + staffMinutes(c, tier) };
  s.today.inService.push(service);
  serving(s)[c.id] = c;
  return service;
}

/** A KTV finished: stars from tier, bill, record, commission base, exp. Mutates. */
function finishStaffService(s: GameState, x: InService) {
  const c = serving(s)[x.customerId];
  if (!c) { s.today.inService = s.today.inService.filter((y) => y !== x); return; }
  const st = s.staff.find((y) => y.uid === x.performer);
  const svc = customerServices(c)[0];
  const rng = rngFor(s, `staff-${c.id}-${x.performer}`);
  const stars = st ? staffStars(s, st, rng) : 2;
  const score = stars === 3 ? rng.int(90, 98) : stars === 2 ? rng.int(72, 88) : rng.int(45, 68);
  const bill = computeBill(s, c, svc, stars, score, { stationUid: x.bedSlot });
  s.today.ledger.revenueStaff += bill.price;
  s.today.ledger.tips += bill.tip;
  const m = meta(s);
  (m.staffRevenue ??= {})[x.performer] = (m.staffRevenue[x.performer] ?? 0) + bill.price;
  if (st) { st.exp++; st.servicesToday++; }
  finishBilling(s, c, recordFor(c, x.performer, stars, score, bill, 0), bill, [], x.bedSlot, waitedLong(c));
  leaveStation(s, x.bedSlot, c.id);
}

/** Bill of a finished service today (player or KTV). */
export function billOf(s: GameState, customerId: string): Bill | undefined {
  return (s.today as DayStateX).meta?.bills?.[customerId];
}

export function sendAway(s0: GameState, customerId: string): GameState {
  const c0 = s0.today.queue.find((x) => x.id === customerId);
  if (!c0) throw vErr("Khách không còn trong hàng chờ.");
  const s = clone(s0);
  const c = s.today.queue.find((x) => x.id === customerId)!;
  s.today.queue = s.today.queue.filter((x) => x.id !== customerId);
  if (isExamCustomer(c)) s.today.examActive = false;
  walkOut(s, c, "sent-away");
  return s;
}

export function resolveComplaint(s0: GameState, complaintId: string, choice: "apologize-refund" | "apologize"): GameState {
  const cp = s0.today.complaints.find((x) => x.id === complaintId);
  if (!cp) throw vErr("Không tìm thấy phàn nàn.");
  const s = clone(s0);
  applyResolution(s, cp, choice);
  return s;
}

function applyResolution(s: GameState, cp: Complaint, choice: "apologize-refund" | "apologize") {
  const r = C().CONFIG.reputation;
  if (choice === "apologize-refund") {
    s.money -= cp.refundIfApologize;
    s.today.ledger.refunds += cp.refundIfApologize;
    const rec = s.today.records.find((x) => x.customerId === cp.customerId);
    if (rec) rec.discount += cp.refundIfApologize;
    addReputation(s, r.complaintRefund);
  } else addReputation(s, r.complaintApology);
  s.today.complaints = s.today.complaints.filter((x) => x.id !== cp.id);
}

export function isDayOver(s: GameState): boolean {
  return s.today.phase === "open" && s.today.arrivals.length === 0 && s.today.queue.length === 0 && s.today.inService.length === 0;
}

export function dailyElectricity(s: GameState): number {
  const outage = activeEventEffect(s) === "power-outage";
  let e = C().CONFIG.baseDailyElectricity;
  for (const x of s.equipment) {
    const d = equipmentDef(x.id);
    if (!d || x.usesLeft <= 0) continue;
    if (outage && isElectric(d)) continue;
    e += Math.round(d.dailyElectricity * tierElectricity(x));
  }
  return e;
}

export function closeDay(s0: GameState): { state: GameState; summary: DaySummary } {
  requireOpen(s0);
  if (s0.today.inService.some((x) => x.performer === "player")) throw vErr("Còn khách đang trị liệu, làm xong ca trước khi đóng cửa.");
  const s = clone(s0);
  const notes: string[] = [];
  // KTVs still working finish their session (billed today); leftovers go home; the shop is cleaned overnight.
  for (const x of [...s.today.inService].sort((a, b) => a.endsAt - b.endsAt)) finishStaffService(s, x);
  for (const c of [...s.today.queue, ...s.today.arrivals]) walkOut(s, c, "closing");
  s.today.queue = []; s.today.arrivals = []; s.today.inService = []; s.today.cleaning = [];
  for (const e of s.equipment) delete e.dirty;
  for (const cp of [...s.today.complaints]) applyResolution(s, cp, "apologize");
  // GAME_DESIGN §11.6: a day without complaints slowly rebuilds a low reputation.
  const R = C().CONFIG.reputation;
  // Balance pass: the further below the target, the faster it recovers; days with complaints recover at half speed.
  if (s.reputation < R.recoveryTarget - 0.005) {
    const gap = R.recoveryTarget - s.reputation;
    const calm = meta(s).complaintsTotal === 0;
    const rec = Math.max(R.dailyRecovery, gap * R.recoveryRate) * (calm ? 1 : R.recoveryWithComplaints);
    addReputation(s, Math.min(rec, gap));
    notes.push(calm ? "Hôm nay không có phàn nàn: uy tín hồi lại một chút." : "Khách quen vẫn ghé: uy tín hồi lại chút ít.");
  }
  // hygiene check event
  if (activeEventEffect(s) === "hygiene-check") {
    const clean = s.staff.some((x) => x.role === "cleaner") && !s.equipment.some((e) => durabilityPct(e) < C().CONFIG.lowDurabilityPct);
    if (clean) { addReputation(s, 0.1); notes.push("Kiểm tra vệ sinh: tiệm sạch sẽ, uy tín tăng."); }
    else { s.money -= 200_000; s.today.ledger.other += 200_000; notes.push("Kiểm tra vệ sinh: bị phạt 200.000đ."); }
  }
  // electricity (per-use already accumulated)
  s.today.ledger.electricity += dailyElectricity(s);
  s.money -= s.today.ledger.electricity;
  // staff
  notes.push(...staffEndOfDay(s, meta(s).staffRevenue ?? {}));
  // rent
  const cfg = C().CONFIG;
  if (s.day >= s.rent.nextDueDay) {
    if (s.money >= s.rent.amount) {
      s.money -= s.rent.amount;
      s.today.ledger.rent += s.rent.amount;
      s.rent.missedPayments = 0;
      notes.push(`Đã trả tiền thuê ${s.rent.amount.toLocaleString("vi-VN")}đ.`);
    } else {
      s.rent.missedPayments++;
      notes.push(s.rent.missedPayments >= 2
        ? "Lại không đủ tiền thuê. Tiệm phải làm lại từ đầu chương (độ thành thạo vẫn giữ nguyên)."
        : "Chủ nhà cảnh báo: chưa trả được tiền thuê. Tuần sau vẫn chưa trả thì tiệm phải làm lại từ đầu chương.");
    }
    s.rent.nextDueDay += cfg.rentPeriodDays;
  } else {
    const d = s.rent.nextDueDay - s.day;
    if (d <= 2) notes.push(d === 1 ? `Tiền thuê ${s.rent.amount.toLocaleString("vi-VN")}đ đến hạn ngày mai.` : `Tiền thuê đến hạn sau ${d} ngày.`);
  }
  const L = s.today.ledger;
  const revenue = ledgerRevenue(L);
  const costs = L.supplies + L.electricity + L.repairs + L.refunds + L.rent + L.wagesBase + L.wagesCommission + L.severance + L.bonuses + L.other;
  const m = meta(s);
  const itemsPracticed = Object.entries(m.practice).map(([key, [correct, total]]) => ({ key, correct, total }));
  const toReview: ItemKey[] = itemsPracticed.filter((x) => x.correct < x.total).map((x) => x.key);
  for (const [k, rec] of Object.entries(s.mastery)) if (!toReview.includes(k) && rec.attempts > 0 && rec.level <= 1 && rec.lastSeenDay === s.day) toReview.push(k);
  const summary: DaySummary = {
    day: s.day, chapter: s.chapter, chapterDay: s.chapterDay,
    served: s.today.records.length, servedByStaff: s.today.records.filter((r) => r.performer !== "player").length,
    walkouts: s.today.walkouts.filter((id) => m.walkoutReasons?.[id] !== "closing" && !id.startsWith("exam-")).length,
    complaints: m.complaintsTotal,
    reputationDelta: round2(s.reputation - s.today.reputationStart),
    ledger: { ...L }, profit: revenue - costs - L.depreciation, moneyEnd: s.money,
    itemsPracticed, toReview, notes: [...m.notes, ...notes],
  };
  s.today.phase = "summary";
  s.history = [...s.history, summary].slice(-30);
  return { state: s, summary };
}

/** Revenue side of the day ledger: services, tips and exam/challenge rewards. */
export function ledgerRevenue(L: DayLedger): number {
  return L.revenuePlayer + L.revenueStaff + L.tips + (L.rewards ?? 0);
}

/** Credits a cash reward (exam/challenge) to money and today's ledger. After closing, it also amends today's summary. */
export function creditReward(s: GameState, amount: number) {
  if (amount <= 0) return;
  s.money += amount;
  s.today.ledger.rewards = (s.today.ledger.rewards ?? 0) + amount;
  if (s.today.phase === "summary") {
    const h = s.history[s.history.length - 1];
    if (h && h.day === s.day) {
      s.history = [...s.history.slice(0, -1), { ...h, ledger: { ...h.ledger, rewards: (h.ledger.rewards ?? 0) + amount }, profit: h.profit + amount, moneyEnd: h.moneyEnd + amount }];
    }
  }
}

/** Defaults the shop returns to after a second missed rent (mastery kept). */
function bankruptReset(s: GameState) {
  const cfg = C().CONFIG;
  s.money = cfg.startMoney;
  s.reputation = cfg.startReputation || 3;
  s.staff = [];
  s.shopLevel = 0;
  s.adsDaysLeft = 0;
  s.rent = { amount: cfg.rentPerWeek, nextDueDay: s.day + cfg.rentPeriodDays - 1, missedPayments: 0 };
  s.inventory = startInventory();
  s.equipment = [];
  for (const id of startEquipmentIds()) addOwned(s, id);
  // keep whatever stations/tools the unlocked services need so they stay playable
  for (const sid of s.unlocked.services) {
    const svc = serviceDef(sid);
    if (!svc) continue;
    for (const id of svc.requiresEquipment) if (!s.equipment.some((e) => e.id === id) && equipmentDef(id)) addOwned(s, id);
  }
  s.chapterDay = 1;
  s.candidates = [];
  s.candidatesRefreshDay = 0;
  meta(s).notes.push("Tiệm đã làm lại từ đầu chương vì hai lần không trả được tiền thuê. Độ thành thạo huyệt và cơ vẫn được giữ.");
}

export function startInventory(): GameState["inventory"] {
  const inv = { I01: 0, I02: 0, I03: 0, I04: 0, I05: 0, I06: 0, I07: 0, I08: 0 } as GameState["inventory"];
  for (const [k, v] of Object.entries(C().CONFIG.startInventory)) if (k in inv && typeof v === "number") inv[k as SupplyId] = v;
  return inv;
}

export function startEquipmentIds(): ("E01")[] { return ["E01"]; }

export function addOwned(s: GameState, id: GameState["equipment"][number]["id"]) {
  const d = equipmentDef(id);
  const taken = new Set(s.equipment.map((e) => e.slot));
  const slot = slotsFor(id, s.shopLevel ?? 0).find((x) => !taken.has(x));
  s.equipment.push({ uid: newUid(s, "eq"), id, usesLeft: d?.maxUses ?? 300, tier: 1, ...(slot ? { slot } : {}) });
}

export function startNextDay(s0: GameState): GameState {
  if (s0.today.phase !== "summary") throw vErr("Hãy đóng cửa và xem tổng kết trước khi sang ngày mới.");
  const s = clone(s0);
  s.day++;
  if (!s.freeMode && s.chapter < 8 && s.chaptersPassed.includes(s.chapter)) {
    s.chapter = (s.chapter + 1) as ChapterNo; // exam passed yesterday → next chapter, day 1
    s.chapterDay = 1;
  } else s.chapterDay++;
  s.today = newDayState(s.reputation);
  if (s.rent.missedPayments >= 2) bankruptReset(s);
  for (const st of s.staff) { st.servicesToday = 0; st.sickToday = false; }
  syncUnlocks(s);
  autoRefreshCandidates(s);
  if (s.freeMode) applyForgetting(s);
  rollEvent(s);
  // Chapter-1 tutorial staging: the day "durability" is introduced the bed shows wear (~80%).
  const def = currentDayDef(s);
  if (def && def.chapterDay === s.chapterDay && def.introduce.includes("durability")) {
    const bed = s.equipment.find((e) => e.id === "E01" || e.id === "E01-upgraded");
    const max = bed ? maxUsesOf(bed) : 0;
    if (bed && max) bed.usesLeft = Math.min(bed.usesLeft, Math.round(max * 0.8));
  }
  return s;
}


export function servingCustomer(s: GameState, customerId: string): Customer | undefined {
  return (s.today as DayStateX).meta?.serving?.[customerId];
}
