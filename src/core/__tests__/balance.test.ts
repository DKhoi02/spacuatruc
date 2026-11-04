/**
 * Economy balance regression (real content, deterministic seeds) for the day-clock model (GAME_DESIGN §11).
 * Uses the simulated players of balanceSim.ts and the shared bot (bot.ts: greets, hands customers to KTVs,
 * serves, cleans, waits; hires a receptionist/cleaner only when the player's time is the bottleneck).
 * Ranges come from the balance pass of 04/11/2026 (docs/CHAPTER_1.md §4: "kết thúc tuần dư khoảng 2–2,5 triệu").
 * If you change prices / wages / customer counts on purpose, re-run the report
 * (BALANCE_REPORT=out.json npx vitest run balance.report) and update the ranges here.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { setContentForTests, tierDef } from "../content";
import * as api from "../api";
import { makeRng } from "../rng";
import type { GameState, Staff } from "../types";
import { PROFILES, STRATEGIES, playSimDay, runGame, tierPayback, type RunResult } from "./balanceSim";

const SEEDS = [1000, 8919, 16838, 24757];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const lastOfChapter = (r: RunResult, ch: number) => r.rows.filter((x) => x.chapter === ch && !x.free).at(-1)!;

let normal: RunResult[] = [];

beforeAll(() => {
  setContentForTests(null);
  normal = SEEDS.map((seed) => runGame("average", "normal", seed, { freeDays: 5, maxDays: 120 }));
});

describe("balance: average player, normal strategy", () => {
  it("chapter 1 week ends with ~2–2.5 triệu after rent and the steamer", () => {
    const d7 = normal.map((r) => r.rows.find((x) => x.day === 7)!.money);
    expect(mean(d7)).toBeGreaterThan(2_000_000);
    expect(mean(d7)).toBeLessThan(2_700_000);
    for (const m of d7) expect(m).toBeGreaterThan(1_500_000);
    // steamer bought on the day the skin-care service opens (ch1 day 3)
    for (const r of normal) expect(r.required.E03?.boughtDay).toBe(r.required.E03?.unlockedDay);
  });

  it("chapter 1 fits the 10-hour day for a solo player: 3–6 treatments, few walkouts, never past closing", () => {
    const ch1 = normal.flatMap((r) => r.rows.filter((x) => x.chapter === 1 && !x.free));
    expect(mean(ch1.map((x) => x.playerTreat))).toBeGreaterThanOrEqual(3);
    expect(mean(ch1.map((x) => x.playerTreat))).toBeLessThanOrEqual(6);
    for (const x of ch1) expect(x.playerTreat).toBeLessThanOrEqual(7);
    expect(mean(ch1.map((x) => x.walkouts))).toBeLessThan(0.5);
    for (const x of ch1) expect(x.endClock).toBeLessThanOrEqual(19 * 60);
  });

  it("a 2nd bed (1,5tr) becomes affordable around the start of chapter 2", () => {
    // measured without other spending (frugal management, same player)
    const days = SEEDS.map((seed) => {
      const r = runGame("average", "frugal", seed, { stopAfterDay: 16 });
      return r.rows.find((x) => x.day >= 7 && x.money >= 1_500_000 + 700_000)?.day ?? 99;
    });
    expect(mean(days)).toBeLessThanOrEqual(10);
    for (const d of days) expect(d).toBeLessThanOrEqual(14);
  });

  it("never misses rent, finishes the course in a reasonable time", () => {
    for (const r of normal) {
      expect(r.rows.some((x) => x.rentMissed || x.reset)).toBe(false);
      expect(r.daysToFree).toBeDefined();
      expect(r.daysToFree!).toBeLessThan(75);
    }
  });

  it("required equipment is affordable on time", () => {
    for (const r of normal) for (const [id, x] of Object.entries(r.required)) expect(x.boughtDay ?? 999, id).toBeLessThanOrEqual(x.unlockedDay + 1);
  });

  it("no money runaway by chapter 5 (money stays in the range of big purchases)", () => {
    const ch4 = mean(normal.map((r) => lastOfChapter(r, 4).money));
    const ch5 = mean(normal.map((r) => lastOfChapter(r, 5).money));
    expect(ch4).toBeGreaterThan(5_000_000);
    expect(ch4).toBeLessThan(13_000_000);
    expect(ch5).toBeLessThan(18_000_000);
  });

  it("a KTV + 2nd bed adds throughput and pays for itself from mid-game", () => {
    const late = normal.flatMap((r) => r.rows.filter((x) => (x.chapter >= 5 || x.free) && x.ktv > 0));
    expect(late.length).toBeGreaterThan(10);
    expect(mean(late.map((x) => x.staffRevenue - x.staffWages - x.staffSupplies))).toBeGreaterThan(0);
    // A/B on the same seeds: with the KTV the shop serves more customers and earns more per day (chapter 5+)
    const solo = SEEDS.map((seed) => runGame("average", { ...STRATEGIES.normal, staff: false, secondBed: false, maxKtv: 0 }, seed, { freeDays: 5, maxDays: 120 }));
    const lateRows = (rs: RunResult[]) => rs.flatMap((r) => r.rows.filter((x) => x.chapter >= 5 || x.free));
    expect(mean(lateRows(normal).map((x) => x.served))).toBeGreaterThan(mean(lateRows(solo).map((x) => x.served)) + 1);
    expect(mean(lateRows(normal).map((x) => x.profit))).toBeGreaterThan(mean(lateRows(solo).map((x) => x.profit)));
  });

  it("walkouts stay a lesson, not a constant drain; reputation climbs to 4–5★", () => {
    const rows = normal.flatMap((r) => r.rows);
    expect(mean(rows.map((x) => x.walkouts))).toBeLessThan(0.8);
    for (const r of normal) expect(lastOfChapter(r, 8).reputation).toBeGreaterThan(4.3);
  });

  it("later days stay playable in real time: ~4–8 player treatments with staff", () => {
    const late = normal.flatMap((r) => r.rows.filter((x) => x.chapter >= 4 || x.free));
    expect(mean(late.map((x) => x.playerTreat))).toBeGreaterThanOrEqual(4);
    expect(mean(late.map((x) => x.playerTreat))).toBeLessThanOrEqual(8);
  });
});

/** Plays `days` days from `s` with the given support staff on duty (no other management changes). */
function playWith(s: GameState, support: boolean, days: number, seed: number): number {
  if (support) {
    for (const role of ["receptionist", "cleaner"] as const) {
      const t = tierDef(role, 1)!;
      const st: Staff = { uid: `sim-${role}`, characterId: role === "receptionist" ? "letan-ngoc" : "tapvu-co-sau", name: role, role, tier: 1, wage: t.baseWage, commissionPct: 0, satisfaction: 80, exp: 0, servicesToday: 0, promotionRequested: false, unpaidDays: 0, hiredDay: s.day };
      s = { ...s, staff: [...s.staff, st] };
    }
  }
  const f = { ...STRATEGIES.aggressive, support: false, expansion: false, vip: false, ads: false };
  const out: RunResult = { profile: "average", strategy: "aggressive", seed, rows: [], exams: [], required: {}, purchases: [], final: s };
  const r = makeRng(seed);
  for (let d = 0; d < days; d++) s = playSimDay(s, PROFILES.average, f, out, r);
  return mean(out.rows.map((x) => x.profit));
}

describe("balance: receptionist / cleaner are worth it only when the player's time is the bottleneck", () => {
  it("slow chapter-2 days: hiring both loses money; busy late days: hiring both pays", () => {
    const noSupport = { ...STRATEGIES.aggressive, support: false };
    let earlyGain = 0, lateGain = 0;
    for (const seed of SEEDS.slice(0, 3)) {
      const early = runGame("average", noSupport, seed, { stopAfterDay: 9 }).final;
      earlyGain += playWith(early, true, 4, seed) - playWith(early, false, 4, seed);
      const late = runGame("average", noSupport, seed, { stopAfterDay: 60 }).final;
      lateGain += playWith(late, true, 5, seed) - playWith(late, false, 5, seed);
    }
    // balance pass 04/11/2026: ≈ −108k/day early (wages for idle help) vs ≈ +36k/day late (fewer walkouts, faster turnover)
    expect(earlyGain / 3).toBeLessThan(-50_000);
    expect(lateGain / 3).toBeGreaterThan(15_000);
  }, 20_000);
});

describe("balance: other profiles", () => {
  it("a beginner survives the first chapters without a bankruptcy reset, reputation hovers ~2–3.5★", () => {
    for (const seed of SEEDS.slice(0, 2)) {
      const r = runGame("beginner", "normal", seed, { stopAfterDay: 45 });
      expect(r.rows.some((x) => x.reset)).toBe(false);
      expect(r.final.money).toBeGreaterThan(0);
      const rep = r.rows.filter((x) => x.day >= 10).map((x) => x.reputation);
      expect(mean(rep)).toBeGreaterThan(2);
      expect(mean(rep)).toBeLessThan(3.6);
      expect(Math.min(...rep)).toBeGreaterThan(1.5);
    }
  });

  it("an expert reaches 5★-level reputation and earns more than an average player", () => {
    const e = runGame("expert", "normal", SEEDS[0], { stopAfterDay: 40 });
    const a = normal[0].rows.filter((x) => x.day <= 40);
    expect(e.rows.at(-1)!.reputation).toBeGreaterThan(4.5);
    expect(mean(e.rows.map((x) => x.profit))).toBeGreaterThan(mean(a.map((x) => x.profit)));
  });
});

describe("balance: GAME_DESIGN §12 shop levels & equipment tiers (end of game = 20 free-mode days)", () => {
  let full: RunResult[] = [];
  let aggr: RunResult[] = [];
  beforeAll(() => {
    full = SEEDS.slice(0, 3).map((seed) => runGame("average", "normal", seed, { freeDays: 20, maxDays: 160 }));
    aggr = SEEDS.slice(0, 2).map((seed) => runGame("average", "aggressive", seed, { freeDays: 20, maxDays: 160 }));
  });

  it("late-game money no longer runs away: a normal player reinvests and ends with ~15–35 triệu (was ~55)", () => {
    for (const r of full) {
      expect(r.final.shopLevel).toBeGreaterThanOrEqual(2);
      expect(r.purchases.filter((x) => x.id.startsWith("tier")).length).toBeGreaterThanOrEqual(3);
      expect(r.rows.some((x) => x.rentMissed || x.reset)).toBe(false);
    }
    // balance pass 04/11/2026 (§12): these 3 seeds ≈ 35,1tr (12-seed report ≈ 32tr, range 19–46tr); before §12 ≈ 55tr
    const end = mean(full.map((r) => r.final.money));
    expect(end).toBeGreaterThan(15_000_000);
    expect(end).toBeLessThan(38_000_000);
  });

  it("an aggressive player reinvests most of the surplus: level 3, tier-3 beds, more spent than kept", () => {
    for (const r of aggr) {
      expect(r.final.shopLevel).toBe(3);
      expect(r.final.equipment.filter((e) => e.id === "E01" && e.tier === 3).length).toBeGreaterThanOrEqual(6);
      const invested = r.purchases.filter((x) => x.id.startsWith("tier") || x.id.startsWith("level") || x.id === "expansion").reduce((a, x) => a + x.price, 0);
      expect(invested).toBeGreaterThan(r.final.money);
    }
  });

  it("bed upgrades pay back in ~2–6 weeks in a shop with customers", () => {
    const states = SEEDS.slice(0, 2).map((seed) => runGame("average", { ...STRATEGIES.normal, maxTier: 1 }, seed, { stopAfterDay: 45 }).final);
    const x = tierPayback(states, ["E01"], 10);
    // balance pass 04/11/2026: ≈ 25 days (3,6 weeks) for tier 1 → 2 of every bed of a normal shop on day 45
    expect(x.payback).toBeGreaterThan(14);
    expect(x.payback).toBeLessThan(42);
  });
});
