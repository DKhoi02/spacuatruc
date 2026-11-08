/**
 * Balance simulator: plays the REAL core (api + @/data) with simulated players.
 * - Profiles model skill (item score), learning speed, safety errors, force-bar score, in-session patience.
 * - Strategies model shop management (frugal / normal / aggressive) with A/B flags for expansion, ads, VIP, staff.
 * Used by balance.test.ts (regression ranges) and balance.report.test.ts (full report, opt-in).
 */
import * as api from "../api";
import { C, acupoint, equipmentDef, serviceDef, supplyDef } from "../content";
import { makeRng, hashString, type Rng } from "../rng";
import type { Customer, DaySummary, EquipmentId, GameState, ItemResult, SupplyId, TaskItem, TreatmentResult } from "../types";
import { botDay, newBotStats, planCombo, supportToHire, type BotStats, type DayLoad } from "./bot";

export type ProfileId = "beginner" | "average" | "expert";
export type StrategyId = "frugal" | "normal" | "aggressive";

export interface Profile {
  /** item quality (expected position score 0–100) on a brand-new item / after lots of practice */
  base: number; cap: number; learnK: number;
  /** miss probability at base skill (shrinks with practice) */
  miss: number;
  /** chance that a miss on an eye-region / sensitive point lands in a forbidden zone */
  forbidOnMiss: number;
  /** force-bar score mean / sd (chapter ≥ 2) */
  force: number; forceSd: number;
  /** chance of an over-force safety error on a sensitive point (or a caution point on a pregnant customer) */
  overForce: number;
  /** chance to correctly skip a contraindicated point on a pregnant customer */
  pregSkip: number;
  /** in-session patience left at the end of a service */
  patience: [number, number];
  /** quality drop in the exam (names only) */
  examPenalty: number;
}

export const PROFILES: Record<ProfileId, Profile> = {
  beginner: { base: 60, cap: 86, learnK: 14, miss: 0.16, forbidOnMiss: 0.12, force: 72, forceSd: 12, overForce: 0.08, pregSkip: 0.75, patience: [0.05, 0.45], examPenalty: 5 },
  average: { base: 76, cap: 92, learnK: 8, miss: 0.07, forbidOnMiss: 0.06, force: 86, forceSd: 8, overForce: 0.025, pregSkip: 0.92, patience: [0.45, 0.8], examPenalty: 3 },
  expert: { base: 92, cap: 99, learnK: 4, miss: 0.015, forbidOnMiss: 0.02, force: 95, forceSd: 4, overForce: 0.003, pregSkip: 1, patience: [0.8, 0.97], examPenalty: 1 },
};

/**
 * Management style. `support`: hire receptionist/cleaner when the player's time is the bottleneck (bot.supportToHire,
 * busy share threshold `supportBusy`). `combo`: create one combo when the feature opens, priced at `comboPct` of list.
 */
/**
 * GAME_DESIGN §12 investment knobs: `maxLevel` highest shop level bought (`expansion` false → 0), `maxTier` highest
 * equipment tier, `ktvPerLevel` KTV cap at each shop level (beds follow: 1 + KTVs), `paybackDays` an expansion /
 * upgrade is bought only when its estimated payback (price ÷ estimated extra profit per day) is at most this,
 * `investCushion` money kept on top of the reserve after an investment.
 */
export interface StrategyFlags {
  chairs: number; staff: boolean; maxKtv: number; secondBed: boolean; upgrades: boolean; expansion: boolean; ads: boolean; vip: boolean;
  support: boolean; supportBusy: number; combo: boolean; comboPct: number; buffer: number;
  maxLevel: number; maxTier: number; ktvPerLevel: number[]; paybackDays: number; investCushion: number;
}

export const STRATEGIES: Record<StrategyId, StrategyFlags> = {
  frugal: { chairs: 1, staff: false, maxKtv: 0, secondBed: false, upgrades: false, expansion: false, ads: false, vip: false, support: false, supportBusy: 1, combo: false, comboPct: 1, buffer: 600_000, maxLevel: 0, maxTier: 1, ktvPerLevel: [0, 0, 0, 0], paybackDays: 0, investCushion: 0 },
  normal: { chairs: 2, staff: true, maxKtv: 1, secondBed: true, upgrades: true, expansion: true, ads: false, vip: false, support: true, supportBusy: 0.8, combo: true, comboPct: 0.9, buffer: 800_000, maxLevel: 3, maxTier: 3, ktvPerLevel: [1, 2, 3, 4], paybackDays: 60, investCushion: 1_500_000 },
  aggressive: { chairs: 4, staff: true, maxKtv: 3, secondBed: true, upgrades: true, expansion: true, ads: true, vip: true, support: true, supportBusy: 0.6, combo: true, comboPct: 0.85, buffer: 300_000, maxLevel: 3, maxTier: 3, ktvPerLevel: [1, 3, 5, 7], paybackDays: 75, investCushion: 500_000 },
};

export interface DayRow {
  day: number; chapter: number; chapterDay: number; free: boolean;
  money: number; profit: number; revenue: number; served: number; byStaff: number; walkouts: number; complaints: number;
  reputation: number; rentMissed: boolean; reset: boolean; ktv: number; beds: number;
  staffRevenue: number; staffWages: number; staffSupplies: number;
  walkoutReasons: Record<string, number>;
  /** player time use (bot stats) */
  playerTreat: number; checkIns: number; cleans: number; endClock: number; busyMin: number;
  recep: boolean; cleaner: boolean; comboServed: number;
  repairs: number; rent: number; shopLevel: number;
}

export interface RunResult {
  profile: ProfileId; strategy: StrategyId; seed: number;
  rows: DayRow[];
  exams: { chapter: number; day: number; passed: boolean; score: number }[];
  /** equipment id → { unlockedDay, boughtDay } for required tools */
  required: Record<string, { unlockedDay: number; boughtDay?: number }>;
  purchases: { day: number; id: string; price: number }[];
  daysToFree?: number;
  final: GameState;
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

function gauss(r: Rng): number {
  const u = Math.max(1e-9, r.next()), v = r.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ───────────── player skill → treatment results ─────────────

function quality(p: Profile, s: GameState, key: string, exam: boolean): { q: number; miss: number } {
  const m = api.getMastery(s, key);
  const prog = 1 - Math.exp(-m.attempts / p.learnK);
  let q = p.base + (p.cap - p.base) * prog;
  let miss = p.miss * (1 - 0.6 * prog);
  if (exam) { q -= p.examPenalty; miss *= 1.3; }
  else if (m.level === 0) { q = Math.max(q, 92); miss = Math.min(miss, 0.02); } // intro card + dot shown
  else if (m.level <= 2) { q += 3; miss *= 0.8; } // hint blob
  return { q: clamp(q, 0, 100), miss: clamp(miss, 0, 0.6) };
}

function positionScore(r: Rng, q: number, miss: number): number {
  // mixture: miss → 0, good → 70, perfect → 100 with mean ≈ q
  const pPerfect = clamp((q - 70 * (1 - miss)) / 30, 0, 1 - miss);
  const x = r.next();
  if (x < miss) return 0;
  if (x < miss + pPerfect) return 100;
  return 70;
}

export function simulateItem(p: Profile, s: GameState, c: Customer, item: TaskItem, useForce: boolean, exam: boolean, r: Rng): ItemResult {
  if (item.kind === "step") {
    // Choice mini-games (mask type, essential oil + drops): a normal player is usually right, sometimes picks a
    // merely-OK option or misjudges the amount (mean ≈ 90). Plain care steps always complete at 100.
    if (item.id !== "mask" && item.id !== "blend-oil") return { item, positionScore: 100, attempts: 1, safetyErrors: 0 };
    // own hash (not `r`): keeps every other random stream of the simulation unchanged
    let h = 2166136261;
    for (const ch of `${c.id}|${item.id}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    const x = ((h >>> 0) % 10000) / 10000;
    return { item, positionScore: x < 0.6 ? 100 : x < 0.85 ? 85 : 60, attempts: 1, safetyErrors: 0 };
  }
  const key = api.itemKey(item);
  const { q, miss } = quality(p, s, key, exam);
  const pregnant = c.health?.id === "pregnant";
  if (item.kind === "point") {
    const d = acupoint(item.id);
    if (pregnant && d?.pregnancy === "contraindicated" && r.chance(p.pregSkip)) return { item, positionScore: 0, attempts: 0, safetyErrors: 0, skipped: true };
    const pos = positionScore(r, q, miss);
    let safety = 0;
    if (pos === 0 && (d?.region === "eye-forehead" || d?.sensitive) && r.chance(p.forbidOnMiss)) safety++;
    const res: ItemResult = { item, positionScore: pos, attempts: pos === 0 ? 2 : 1, safetyErrors: 0 };
    if (useForce) {
      res.forceScore = Math.round(clamp(p.force + gauss(r) * p.forceSd, 0, 100));
      const risky = d?.sensitive || (pregnant && d?.pregnancy === "caution");
      if (risky && r.chance(p.overForce)) safety++;
    }
    res.safetyErrors = safety;
    return res;
  }
  if (item.kind === "muscle") {
    const sw = Math.round(clamp(q + gauss(r) * 8 - (r.chance(miss) ? 15 : 0), 0, 100));
    return { item, positionScore: sw, swipeScore: sw, attempts: 3, safetyErrors: 0 };
  }
  return { item, positionScore: positionScore(r, q, miss), attempts: 1, safetyErrors: 0 };
}

export function simulateTreatment(p: Profile, s: GameState, c: Customer, r: Rng, exam = false): TreatmentResult {
  const cfg = api.buildTreatmentConfig(s, c);
  const items = c.items.map((it) => simulateItem(p, s, c, it, cfg.useForceBar, exam || cfg.examMode, r));
  const res: TreatmentResult = { customerId: c.id, items };
  if (cfg.usePatience) res.patienceLeft = Math.round((p.patience[0] + (p.patience[1] - p.patience[0]) * r.next()) * 100) / 100;
  return res;
}

// ───────────── shop management ─────────────

function reserve(s: GameState, f: StrategyFlags): number {
  const due = s.rent.nextDueDay - s.day;
  const rentPart = due <= 3 ? s.rent.amount : s.rent.amount * 0.5;
  const wages = s.staff.reduce((a, x) => a + x.wage, 0) * 2;
  return rentPart + wages + f.buffer;
}

function tryBuy(s: GameState, id: EquipmentId, out: RunResult, slot?: string): GameState {
  try {
    const ns = api.buyEquipment(s, id, slot);
    out.purchases.push({ day: s.day, id, price: equipmentDef(id)?.price ?? 0 });
    const req = out.required[id];
    if (req && req.boughtDay === undefined) req.boughtDay = s.day;
    return ns;
  } catch { return s; }
}

function stationCount(s: GameState): number {
  return s.equipment.filter((e) => ["E01", "vip-room"].includes(e.id)).length;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** KTV cap for the strategy at the shop's level. */
const ktvCap = (s: GameState, f: StrategyFlags) => (f.ktvPerLevel[s.shopLevel] ?? f.maxKtv);

/**
 * Estimated extra profit per day of the next shop level: more customers (if there is capacity: free beds/KTVs are
 * bought along), price premium on today's revenue, minus the higher rent.
 */
function levelGainPerDay(s: GameState, f: StrategyFlags, out: RunResult): number {
  const rows = out.rows.slice(-7);
  if (rows.length < 3) return 0;
  const cur = api.shopLevelDef(s.shopLevel), nx = api.shopLevelDef(s.shopLevel + 1);
  const revDay = avg(rows.map((x) => x.revenue));
  const perCust = revDay / Math.max(1, avg(rows.map((x) => x.served)));
  const capLost = avg(rows.map((x) => (x.walkoutReasons.patience ?? 0) + (x.walkoutReasons["queue-full"] ?? 0)));
  const moreCust = (nx.customers[0] + nx.customers[1] - cur.customers[0] - cur.customers[1]) / 2;
  // extra beds/KTVs the strategy would add at the new level (each staffed bed ≈ 2,5 customers more)
  const moreKtv = Math.max(0, Math.min(f.ktvPerLevel[s.shopLevel + 1] ?? 0, nx.maxBeds - 1) - Math.min(ktvCap(s, f), cur.maxBeds - 1));
  const custGain = (moreCust + capLost * 0.5 + moreKtv * 2.5) * perCust * 0.55; // margin after supplies / commission / wages
  return custGain + revDay * (nx.pricePct - cur.pricePct) - (nx.rent - cur.rent) / 7 - moreKtv * 150_000;
}

/** Estimated extra profit per day of upgrading one item to the next tier (price premium + tip − extra repairs). */
function upgradeGainPerDay(s: GameState, e: GameState["equipment"][number], out: RunResult): number {
  const rows = out.rows.slice(-7);
  if (rows.length < 3) return 0;
  const d = equipmentDef(e.id)!;
  const T = C().CONFIG.equipmentTiers;
  const t = api.tierOf(e);
  const served = avg(rows.map((x) => x.served));
  const perCust = avg(rows.map((x) => x.revenue)) / Math.max(1, served);
  const svcs = s.unlocked.services.map((id) => serviceDef(id)!).filter(Boolean);
  let usesPerDay: number;
  if ((d.effect.beds ?? 0) > 0) usesPerDay = served * (svcs.filter((x) => x.requiresEquipment.every((r) => r !== "E06" && r !== "E10")).length / Math.max(1, svcs.length)) / Math.max(1, s.equipment.filter((x) => x.id === "E01").length);
  else if ((d.effect.queueSeats ?? 0) > 0) return 0;
  else usesPerDay = (served * svcs.filter((x) => x.requiresEquipment.includes(e.id)).length) / Math.max(1, svcs.length) / Math.max(1, s.equipment.filter((x) => x.id === e.id).length);
  const gainPerUse = perCust * (T.pricePct[t] - T.pricePct[t - 1]) * 1.1 + perCust * (T.tipPct[t] - T.tipPct[t - 1]);
  const next = { ...e, tier: (t + 1) as 2 | 3 };
  const repairPerUse = (api.repairCost(next) / (api.maxUsesOf(next) * 0.78)) - (api.repairCost(e) / (api.maxUsesOf(e) * 0.78));
  return usesPerDay * (gainPerUse - repairPerUse);
}

function buySupplies(s: GameState): GameState {
  const brief = api.getMorningBrief(s);
  const exp = brief.expectedCustomers[1] + 1;
  const svcs = brief.likelyServices.map((id) => serviceDef(id)!).filter(Boolean)
    .filter((svc) => svc.requiresEquipment.every((e) => (equipmentDef(e)?.effect.beds ?? 0) > 0 || s.equipment.some((x) => x.id === e)));
  if (!svcs.length) return s;
  const need: Partial<Record<SupplyId, number>> = {};
  const per = Math.ceil(exp / svcs.length) + 1;
  for (const svc of svcs) for (const [k, n] of Object.entries(svc.supplies) as [SupplyId, number][]) need[k] = (need[k] ?? 0) + n * per;
  // cap at what the whole day could possibly use
  for (const k of Object.keys(need) as SupplyId[]) {
    const maxUse = Math.max(...svcs.map((svc) => svc.supplies[k] ?? 0)) * exp;
    need[k] = Math.min(need[k]!, maxUse);
  }
  // cheapest first so low money still covers the basic service
  const order = (Object.keys(need) as SupplyId[]).sort((a, b) => (supplyDef(a)!.packPrice - supplyDef(b)!.packPrice));
  for (const k of order) {
    if (!s.unlocked.supplies.includes(k)) continue;
    for (let g = 0; g < 10 && (s.inventory[k] ?? 0) < need[k]!; g++) {
      if (s.money < supplyDef(k)!.packPrice) break;
      try { s = api.buySupply(s, k, 1); } catch { break; }
    }
  }
  return s;
}

export function morning(s: GameState, f: StrategyFlags, out: RunResult): GameState {
  // track when required tools become needed
  for (const sid of s.unlocked.services) {
    for (const eid of serviceDef(sid)!.requiresEquipment) {
      if ((equipmentDef(eid)?.effect.beds ?? 0) > 0) continue;
      out.required[eid] ??= { unlockedDay: s.day };
    }
  }
  // 1) required tools/stations for unlocked services (everyone buys these, as soon as cash allows)
  for (const sid of s.unlocked.services) {
    for (const eid of serviceDef(sid)!.requiresEquipment) {
      if (s.equipment.some((e) => e.id === eid) || !s.unlocked.equipment.includes(eid)) continue;
      const price = equipmentDef(eid)!.price;
      if (s.money - price >= reserve(s, f) * 0.6) s = tryBuy(s, eid, out);
    }
  }
  // 2) repairs
  for (const e of s.equipment) {
    const d = equipmentDef(e.id)!;
    if (d && e.usesLeft < api.maxUsesOf(e) * 0.22) { try { s = api.repairEquipment(s, e.uid); } catch { /* no money */ } }
  }
  // 3) growth
  // A sensible owner hires KTVs only when they can take a good part of the customers (services they can do)
  // and lets one go after a week of losing money on them (cool-down before hiring again).
  const likely = api.getMorningBrief(s).likelyServices;
  const ktvShare = likely.length ? likely.filter((id) => api.staffCanPerform(s, id)).length / likely.length : 0;
  const lastFire = out.purchases.filter((x) => x.id === "fire-ktv").at(-1)?.day ?? -99;
  const canKtvWork = ktvShare >= 0.5 && s.day - lastFire > 10;
  const ktvRows = out.rows.slice(-6);
  if (s.staff.some((x) => x.role === "ktv") && ktvRows.length === 6 && ktvRows.every((x) => x.ktv > 0 && x.staffRevenue - x.staffWages - x.staffSupplies < 0)) {
    const st = s.staff.filter((x) => x.role === "ktv").sort((a, b) => a.hiredDay - b.hiredDay).at(-1)!;
    if (s.day - st.hiredDay >= 6 && s.money >= st.wage * C().CONFIG.severanceDays) { s = api.fire(s, st.uid); out.purchases.push({ day: s.day, id: "fire-ktv", price: 0 }); }
  }
  const hireOpen = s.unlocked.features.includes("hire-ktv");
  // shop levels (GAME_DESIGN §12.1): the first one as soon as affordable (as before), later ones when they pay back
  const nx = api.nextShopLevel(s);
  if (f.expansion && nx?.ok && nx.level <= f.maxLevel) {
    const cost = api.shopLevelDef(nx.level).cost;
    const gain = levelGainPerDay(s, f, out);
    const worth = nx.level === 1 ? true : gain > 0 && cost / gain <= f.paybackDays;
    if (worth && s.money - cost >= reserve(s, f) + (nx.level === 1 ? 1_500_000 : f.investCushion)) {
      try { s = api.buyExpansion(s); out.purchases.push({ day: s.day, id: nx.level === 1 ? "expansion" : `level-${nx.level}`, price: cost }); } catch { /* */ }
    }
  }
  if (f.staff && f.secondBed && hireOpen && canKtvWork) {
    const wantBeds = 1 + Math.min(ktvCap(s, f), api.shopLevelDef(s.shopLevel).maxBeds - 1);
    if (s.equipment.filter((e) => e.id === "E01").length < wantBeds && s.unlocked.equipment.includes("E01") && s.money - 1_500_000 >= reserve(s, f) + 300_000) s = tryBuy(s, "E01", out);
  }
  // extra waiting chairs once queue-full walkouts show up (aggressive: as soon as they are sold)
  const recent = out.rows.slice(-3);
  const qfull = recent.reduce((a, x) => a + (x.walkoutReasons["queue-full"] ?? 0), 0) / Math.max(1, recent.length);
  const chairs = s.equipment.filter((e) => e.id === "E02").length;
  if (s.unlocked.equipment.includes("E02") && chairs < f.chairs && (qfull >= 0.6 || f.chairs >= 4) && s.money - 400_000 >= reserve(s, f) + 300_000) s = tryBuy(s, "E02", out);
  if (f.vip && s.unlocked.equipment.includes("vip-room") && !s.equipment.some((e) => e.id === "vip-room") && s.money - (equipmentDef("vip-room")?.price ?? 0) >= reserve(s, f) + 1_000_000) s = tryBuy(s, "vip-room", out);
  if (f.staff && hireOpen && canKtvWork) {
    const ktvs = s.staff.filter((x) => x.role === "ktv").length;
    const extraStations = stationCount(s) - 1;
    if (ktvs < Math.min(ktvCap(s, f), Math.max(extraStations, 0)) && s.money >= reserve(s, f) + 300_000) {
      const cands = s.candidates.map((c, i) => ({ c, i })).filter((x) => x.c.role === "ktv").sort((a, b) => ktvCap(s, f) > 1 ? b.c.tier - a.c.tier : a.c.tier - b.c.tier);
      if (cands.length) { try { s = api.hire(s, cands[0].i); out.purchases.push({ day: s.day, id: "hire-ktv", price: 0 }); } catch { /* */ } }
    }
  }
  if (f.support) {
    const loads: DayLoad[] = out.rows.map((x) => ({ busyMin: x.busyMin, capWalkouts: (x.walkoutReasons.patience ?? 0) + (x.walkoutReasons["queue-full"] ?? 0), recep: x.recep, cleaner: x.cleaner }));
    const role = supportToHire(s, loads, f.supportBusy);
    const i = role ? s.candidates.findIndex((c) => c.role === role) : -1;
    if (role && i >= 0 && s.money >= reserve(s, f) + 500_000) {
      try { s = api.hire(s, i); out.purchases.push({ day: s.day, id: `hire-${role}`, price: 0 }); } catch { /* */ }
    }
  }
  if (f.upgrades && s.unlocked.features.includes("upgrades")) {
    const extra = f.maxKtv > 1 ? 1_000_000 : 2_500_000;
    if (s.unlocked.equipment.includes("E05") && !s.equipment.some((e) => e.id === "E05") && s.money - 300_000 >= reserve(s, f) + extra) s = tryBuy(s, "E05", out);
    // equipment tiers (GAME_DESIGN §12.2): best estimated payback first
    const cands = s.equipment.map((e) => ({ e, cost: api.upgradeCost(e), gain: upgradeGainPerDay(s, e, out) }))
      .filter((x) => x.cost !== undefined && api.tierOf(x.e) < f.maxTier && x.gain > 0 && x.cost / x.gain <= f.paybackDays)
      .sort((a, b) => a.cost! / a.gain - b.cost! / b.gain);
    for (const x of cands) {
      if (s.money - x.cost! < reserve(s, f) + Math.max(extra, f.investCushion)) break;
      try { s = api.upgradeEquipment(s, x.e.uid); out.purchases.push({ day: s.day, id: `tier${api.tierOf(x.e) + 1}-${x.e.id}`, price: x.cost! }); } catch { /* busy / locked */ }
    }
  }
  // ads: only with spare capacity (no customers lost to waiting lately)
  const capLost = recent.reduce((a, x) => a + (x.walkoutReasons.patience ?? 0) + (x.walkoutReasons["queue-full"] ?? 0), 0) / Math.max(1, recent.length);
  if (f.ads && s.unlocked.features.includes("ads") && s.adsDaysLeft === 0 && capLost < 1 && s.money >= reserve(s, f) + 1_500_000) {
    try { s = api.buyAds(s, 3); out.purchases.push({ day: s.day, id: "ads", price: 0 /* operating cost, already in profit */ }); } catch { /* */ }
  }
  if (f.combo && s.unlocked.features.includes("combo") && s.combos.length === 0) {
    const plan = planCombo(s, f.comboPct);
    if (plan) { try { s = api.createCombo(s, plan.name, plan.services, plan.price); out.purchases.push({ day: s.day, id: "combo", price: 0 }); } catch { /* */ } }
  }
  for (const st of s.staff) if (st.promotionRequested) s = api.answerPromotion(s, st.uid, true);
  // keep unhappy staff: bonus
  for (const st of s.staff) if (st.quitNoticeDaysLeft !== undefined && s.money > 300_000) { try { s = api.giveBonus(s, st.uid, Math.round(st.wage * 1.5)); } catch { /* */ } }
  return buySupplies(s);
}

// ───────────── day loop ─────────────

export function playSimDay(s: GameState, p: Profile, f: StrategyFlags, out: RunResult, r: Rng, log?: (s: GameState, a: string) => void): GameState {
  s = morning(s, f, out);
  s = api.openShop(s);
  const stats = newBotStats();
  s = botDay(s, {
    stats, log,
    treat: (st, c) => simulateTreatment(p, st, c, r),
    exam: (st) => {
      const sessions = api.buildExam(st);
      const results = sessions.map((x) => simulateTreatment(p, st, x, r, true));
      const ex = api.finishExam(st, results);
      out.exams.push({ chapter: st.chapter, day: st.day, passed: ex.passed, score: ex.score });
      return ex.state;
    },
    resolve: (st) => (st.reputation < 3 ? "apologize-refund" : "apologize"),
    // a free KTV takes any performable waiting customer (beds work in parallel), up to 6 sessions a day (overwork)
    allowKtv: (_st, ktv) => ktv.servicesToday < 6,
    // most players hand customers to free KTVs (saves their own time); an expert keeps the customers they can take
    ktvFirst: p.base < 90,
  });
  const { state, summary } = api.closeDay(s);
  out.rows.push(rowOf(state, summary, stats));
  const next = api.startNextDay(state);
  if (state.rent.missedPayments >= 2 && next.rent.missedPayments === 0) out.rows[out.rows.length - 1].reset = true;
  return next;
}

function rowOf(s: GameState, sum: DaySummary, st: BotStats): DayRow {
  const L = sum.ledger;
  const reasons: Record<string, number> = {};
  for (const id of s.today.walkouts) {
    const w = api.walkoutReason(s, id);
    if (w && w.key !== "closing" && !id.startsWith("exam-")) reasons[w.key] = (reasons[w.key] ?? 0) + 1;
  }
  const staffRecs = s.today.records.filter((x) => x.performer !== "player");
  const staffSupplies = staffRecs.reduce((a, rec) => {
    const svc = serviceDef(rec.serviceId);
    if (!svc) return a;
    return a + Object.entries(svc.supplies).reduce((b, [k, n]) => b + ((supplyDef(k)?.packPrice ?? 0) / 10) * (n ?? 0), 0) + 5_000;
  }, 0);
  return {
    day: sum.day, chapter: sum.chapter, chapterDay: sum.chapterDay, free: s.freeMode,
    money: s.money, profit: sum.profit, revenue: L.revenuePlayer + L.revenueStaff + L.tips, served: sum.served, byStaff: sum.servedByStaff,
    walkouts: sum.walkouts, complaints: sum.complaints, reputation: s.reputation,
    rentMissed: sum.notes.some((n) => /chưa trả được tiền thuê|Lại không đủ tiền thuê/.test(n)), reset: false,
    ktv: s.staff.filter((x) => x.role === "ktv").length, beds: stationCount(s),
    staffRevenue: staffRecs.reduce((a, x) => a + x.price + x.tip, 0), staffWages: L.wagesBase + L.wagesCommission, staffSupplies,
    walkoutReasons: reasons,
    playerTreat: st.treatments, checkIns: st.checkIns, cleans: st.cleans, endClock: st.endClock,
    busyMin: st.treatMin + st.checkIns * C().CONFIG.clock.checkInMin + st.cleans * C().CONFIG.clock.cleanMin,
    recep: s.staff.some((x) => x.role === "receptionist"), cleaner: s.staff.some((x) => x.role === "cleaner"),
    comboServed: s.today.records.filter((x) => x.comboName).length,
    repairs: L.repairs, rent: L.rent, shopLevel: s.shopLevel,
  };
}

export function runGame(profile: ProfileId, strategy: StrategyId | StrategyFlags, seed: number, opts: { freeDays?: number; maxDays?: number; stopAfterDay?: number; profile?: Partial<Profile>; log?: (s: GameState, a: string) => void } = {}): RunResult {
  const p = { ...PROFILES[profile], ...opts.profile };
  const f = typeof strategy === "string" ? STRATEGIES[strategy] : strategy;
  const out: RunResult = { profile, strategy: typeof strategy === "string" ? strategy : "normal", seed, rows: [], exams: [], required: {}, purchases: [], final: undefined as unknown as GameState };
  let s = api.newGame("Tiệm Mô Phỏng", seed);
  const r = makeRng(hashString(`sim|${profile}|${seed}`));
  const maxDays = opts.maxDays ?? 200;
  let freeLeft = opts.freeDays ?? 20;
  for (let d = 0; d < maxDays; d++) {
    if (opts.stopAfterDay && s.day > opts.stopAfterDay) break;
    s = playSimDay(s, p, f, out, r, opts.log);
    if (s.freeMode) {
      out.daysToFree ??= s.day - 1;
      if (freeLeft-- <= 0) break;
    }
  }
  out.final = s;
  return out;
}

/**
 * Per-item payback of equipment tiers in a running shop (GAME_DESIGN §12.2): from the same mid/late-game state,
 * play `days` days with and without upgrading every item of a kind one tier (cash kept equal, no other investments).
 */
export function tierPayback(states: GameState[], ids: string[], days: number): { cost: number; dProfit: number; payback: number; tierFrom: number } {
  const freeze: StrategyFlags = { ...STRATEGIES.normal, expansion: false, upgrades: false, secondBed: false, maxLevel: 0, maxTier: 1 };
  const play = (s: GameState, seed: number) => {
    const out: RunResult = { profile: "average", strategy: "normal", seed, rows: [], exams: [], required: {}, purchases: [], final: s };
    const r = makeRng(seed);
    for (let d = 0; d < days; d++) s = playSimDay(s, PROFILES.average, freeze, out, r);
    return avg(out.rows.map((x) => x.profit));
  };
  const costs: number[] = [], diffs: number[] = [], tiers: number[] = [];
  states.forEach((s0, i) => {
    let s = { ...s0, money: s0.money + 100_000_000 };
    let cost = 0;
    for (const e of s0.equipment.filter((x) => ids.includes(x.id))) {
      const c = api.upgradeCost(e);
      if (c === undefined) continue;
      tiers.push(api.tierOf(e));
      s = api.upgradeEquipment(s, e.uid);
      cost += c;
    }
    if (!cost) return;
    s = { ...s, money: s0.money };
    costs.push(cost);
    diffs.push(play(s, 77 + i) - play(s0, 77 + i));
  });
  const cost = avg(costs), dProfit = avg(diffs);
  return { cost, dProfit, payback: dProfit > 0 ? cost / dProfit : NaN, tierFrom: avg(tiers) };
}

