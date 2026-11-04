import type { Bill, Customer, DayLedger, DayState, GameState, ItemKey } from "./types";
import { C } from "./content";

export const clone = <T>(x: T): T => structuredClone(x);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round2 = (v: number) => Math.round(v * 100) / 100;
/** Round money to whole 1.000đ. */
export const roundK = (v: number) => Math.round(v / 1000) * 1000;

export function emptyLedger(): DayLedger {
  return { revenuePlayer: 0, revenueStaff: 0, tips: 0, rewards: 0, supplies: 0, electricity: 0, repairs: 0, refunds: 0, rent: 0, wagesBase: 0, wagesCommission: 0, severance: 0, bonuses: 0, depreciation: 0, purchases: 0, other: 0 };
}

/**
 * Extra per-day bookkeeping not present in the shared DayState type. It is stored as an
 * optional `meta` property on `today` (survives JSON save/load; ignored by the UI).
 */
export interface DayMeta {
  practice: Record<ItemKey, [number, number]>; // [correct, total]
  complaintsTotal: number;
  notes: string[];
  /** Customers currently in service (DayState.inService only keeps ids). */
  serving?: Record<string, Customer>;
  /** customerId → walkout reason key. */
  walkoutReasons?: Record<string, WalkoutReason>;
  /** staff uid → revenue (price) of their services today, for commission. */
  staffRevenue?: Record<string, number>;
  /** customerId → bill of every finished service today (player and KTV). */
  bills?: Record<string, Bill>;
  /** customers a KTV took on their own while the player was treating (for UI notes/tests). */
  autoAssigned?: string[];
}
export type WalkoutReason = "patience" | "queue-full" | "no-supplies" | "no-bed" | "no-equipment" | "sent-away" | "closing";
export type DayStateX = DayState & { meta?: DayMeta };

export function meta(s: GameState): DayMeta {
  const t = s.today as DayStateX;
  if (!t.meta) t.meta = { practice: {}, complaintsTotal: 0, notes: [] };
  return t.meta;
}

export function newDayState(reputation: number): DayState {
  const d: DayStateX = {
    phase: "prep", clock: C().CONFIG.clock.open, servicesCompleted: 0, arrivals: [], queue: [], inService: [], cleaning: [], records: [], walkouts: [], complaints: [],
    ledger: emptyLedger(), reputationStart: reputation, meta: { practice: {}, complaintsTotal: 0, notes: [] },
  };
  return d;
}

export function addReputation(s: GameState, delta: number): void {
  s.reputation = round2(clamp(s.reputation + delta, 0, 5));
}

export function vErr(msg: string): Error { return new Error(msg); }
