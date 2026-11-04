/**
 * Shared bot for tests and simulators: drives one open day through the real core API with the
 * day-clock rules (GAME_DESIGN §11): greet customers (check-in), hand customers to free KTVs, serve,
 * clean beds, and press "Chờ" when nothing else can be done.
 */
import * as api from "../api";
import type { Complaint, Customer, GameState, Staff, TreatmentResult } from "../types";
import { C } from "../content";

export interface BotHooks {
  /** Treatment result the "player" produces for a customer. */
  treat: (s: GameState, c: Customer) => TreatmentResult;
  /** Examiner waiting in the queue (default: send away). */
  exam?: (s: GameState, c: Customer) => GameState;
  /** Complaint resolution (default: apologize). */
  resolve?: (s: GameState, cp: Complaint) => "apologize" | "apologize-refund";
  /** May this free KTV take this customer now? (default: yes) */
  allowKtv?: (s: GameState, ktv: Staff, c: Customer) => boolean;
  /** KTVs take customers even when the player is free for them (e.g. a weak player). Default: player first. */
  ktvFirst?: boolean;
  /** Called after each finished player service. */
  onServed?: (s: GameState, c: Customer) => void;
  /** Optional counters (filled while playing). */
  stats?: BotStats;
  /** Optional action log (debugging the simulator). */
  log?: (s: GameState, action: string) => void;
}

/** What the player spent the day on (game minutes / counts). */
export interface BotStats { treatments: number; treatMin: number; checkIns: number; cleans: number; waits: number; idleMin: number; endClock: number }
export const newBotStats = (): BotStats => ({ treatments: 0, treatMin: 0, checkIns: 0, cleans: 0, waits: 0, idleMin: 0, endClock: 0 });

const SOFT = /bận|dọn|đón/; // busy bed / dirty bed / not greeted yet: wait or act, don't send away

function freeKtvs(s: GameState): Staff[] {
  return s.staff.filter((x) => x.role === "ktv" && !x.sickToday && !s.today.inService.some((i) => i.performer === x.uid));
}

/** Plays the open day until it is over (or nothing can progress). Returns the still-open state. */
export function botDay(s: GameState, h: BotHooks): GameState {
  const hasCleaner = () => s.staff.some((x) => x.role === "cleaner" && !x.sickToday);
  for (let guard = 0; guard < 600; guard++) {
    for (const cp of s.today.complaints) s = api.resolveComplaint(s, cp.id, h.resolve?.(s, cp) ?? "apologize");
    if (api.isDayOver(s)) break;
    const q = s.today.queue;
    const examiner = q.find((c) => c.special === "examiner");
    if (examiner) { s = h.exam ? h.exam(s, examiner) : api.sendAway(s, examiner.id); continue; }
    // 1) greet everyone first (unchecked customers lose patience ×1.5)
    const unchecked = q.find((c) => !c.checkedIn);
    if (unchecked) { h.log?.(s, `checkIn ${unchecked.id} (patience ${unchecked.patience.toFixed(0)})`); s = api.checkIn(s, unchecked.id); if (h.stats) h.stats.checkIns++; continue; }
    // 2) hard blocks (no supplies / broken equipment): send away
    const hard = q.find((c) => { const r = api.canServe(s, c.id); return !r.ok && !SOFT.test(r.reason); });
    if (hard) { s = api.sendAway(s, hard.id); continue; }
    // 3) free KTVs take performable customers — when there is more than the player can take right now (2+ ready,
    //    or the next customer arrives soon), unless the hook says KTVs go first. Otherwise the player serves.
    let assigned = false;
    const ready = s.today.queue.filter((x) => api.canServe(s, x.id).ok).length;
    const nx = api.nextEvent(s);
    const busyAhead = ready >= 2 || (!!nx && nx.kind === "arrival" && nx.at - s.today.clock <= 30) || !!h.ktvFirst;
    for (const k of busyAhead ? freeKtvs(s) : []) {
      const c = s.today.queue.find((x) => (x.combo ? x.combo.services : [x.serviceId]).every((id) => api.staffCanPerform(s, id)) && api.canServe(s, x.id).ok && (h.allowKtv?.(s, k, x) ?? true));
      if (!c) continue;
      h.log?.(s, `ktv ${k.name} ← ${c.id}`);
      s = api.assignToStaff(s, c.id, k.uid).state;
      assigned = true;
    }
    if (assigned) continue;
    // 4) the player serves the first customer that has a clean free station
    const c = s.today.queue.find((x) => api.canServe(s, x.id).ok);
    if (c) {
      h.log?.(s, `serve ${c.id} ${c.combo ? "combo" : c.serviceId} ${c.durationMin}m (patience ${c.patience.toFixed(0)}) q=${s.today.queue.map((x) => `${x.id}:${x.patience.toFixed(0)}${x.checkedIn ? "" : "*"}`).join(",")}`);
      s = api.startPlayerService(s, c.id);
      const live = api.servingCustomer(s, c.id) ?? c;
      s = api.completePlayerService(s, h.treat(s, live)).state;
      if (h.stats) { h.stats.treatments++; h.stats.treatMin += live.durationMin || 30; }
      h.onServed?.(s, live);
      continue;
    }
    // 5) dirty beds: clean them yourself unless a cleaner works today
    const dirty = s.equipment.find((e) => e.dirty && !s.today.inService.some((x) => x.bedSlot === e.uid) && !(s.today.cleaning ?? []).some((j) => j.stationUid === e.uid));
    if (dirty && (!hasCleaner() || (q.length > 0 && !api.nextEvent(s)))) { h.log?.(s, "clean"); s = api.cleanStation(s, dirty.uid); if (h.stats) h.stats.cleans++; continue; }
    // 6) wait for the next event
    if (api.nextEvent(s)) {
      const t0 = s.today.clock;
      h.log?.(s, `wait → ${api.nextEvent(s)!.label}`);
      s = api.advanceTime(s);
      if (h.stats) { h.stats.waits++; h.stats.idleMin += s.today.clock - t0; }
      continue;
    }
    if (q.length) { s = api.sendAway(s, q[0].id); continue; }
    break;
  }
  for (const cp of s.today.complaints) s = api.resolveComplaint(s, cp.id, h.resolve?.(s, cp) ?? "apologize");
  if (h.stats) h.stats.endClock = s.today.clock;
  return s;
}

// ───────────── management decisions (morning) ─────────────

/** One played day as the bot remembers it (for hiring decisions). */
export interface DayLoad {
  /** player minutes spent on treatments + check-ins + cleaning */
  busyMin: number;
  /** walkouts because of waiting (patience) or a full queue: lost to capacity, not to supplies/equipment */
  capWalkouts: number;
  recep: boolean;
  cleaner: boolean;
}

/** Player time is the bottleneck: busy most of the opening hours, or customers leave because nobody gets to them. */
export function playerIsBottleneck(recent: DayLoad[], busyShare = 0.65): boolean {
  if (recent.length < 2) return false;
  const n = recent.length;
  const busy = recent.reduce((a, x) => a + x.busyMin, 0) / n;
  const walk = recent.reduce((a, x) => a + x.capWalkouts, 0) / n;
  const open = 600; // 9:00–19:00
  return walk >= 0.6 || busy >= busyShare * open;
}

/**
 * Which support role to hire today (GAME_DESIGN §11.3): only when the player's own time is the bottleneck,
 * judged on the last days played with the current support staff. Walkouts → receptionist first (greets on arrival,
 * +20 min patience); just busy → cleaner first (saves 10 min per service).
 */
export function supportToHire(s: GameState, history: DayLoad[], busyShare = 0.65): "receptionist" | "cleaner" | undefined {
  const hasR = s.staff.some((x) => x.role === "receptionist");
  const hasC = s.staff.some((x) => x.role === "cleaner");
  if (hasR && hasC) return undefined;
  const same = history.filter((x) => x.recep === hasR && x.cleaner === hasC).slice(-3);
  if (!playerIsBottleneck(same, busyShare)) return undefined;
  const walk = same.reduce((a, x) => a + x.capWalkouts, 0) / same.length;
  if (!hasR && (walk >= 0.6 || hasC)) return "receptionist";
  return hasC ? undefined : "cleaner";
}

/**
 * Combo the bot would create: the two available services with the best price per minute (preferring ones the KTVs
 * can do), priced at `pricePct` of their list prices (within the allowed 70–100%).
 */
export function planCombo(s: GameState, pricePct: number): { name: string; services: string[]; price: number } | undefined {
  const owned = (ids: string[]) => ids.every((id) => (C().EQUIPMENT.find((e) => e.id === id)?.effect.beds ?? 0) > 0 || s.equipment.some((e) => e.id === id && e.usesLeft > 0));
  const svcs = s.unlocked.services.map((id) => C().SERVICES.find((x) => x.id === id)!).filter((x) => x && !x.vipOnly && owned(x.requiresEquipment));
  if (svcs.length < 2) return undefined;
  const score = (x: (typeof svcs)[number]) => x.basePrice / x.durationMin + (api.staffCanPerform(s, x.id) ? 1000 : 0);
  const pick = [...svcs].sort((a, b) => score(b) - score(a)).slice(0, 2);
  const list = pick.reduce((a, x) => a + x.basePrice, 0);
  const { minPricePct, maxPricePct } = C().CONFIG.combo;
  const pct = Math.min(maxPricePct, Math.max(minPricePct, pricePct));
  return { name: "Combo thư giãn", services: pick.map((x) => x.id), price: Math.ceil((list * pct) / 1000) * 1000 };
}
