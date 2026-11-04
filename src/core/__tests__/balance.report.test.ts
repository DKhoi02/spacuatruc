/**
 * Full balance report (opt-in, slow-ish): BALANCE_REPORT=<out.json> npx vitest run balance.report
 * Plays every profile × strategy over many seeds through all chapters + 20 free-mode days.
 */
import { describe, it, beforeAll } from "vitest";
import { writeFileSync } from "node:fs";
import { setContentForTests } from "../content";
import { runGame, STRATEGIES, tierPayback, type ProfileId, type RunResult, type StrategyFlags, type StrategyId } from "./balanceSim";
import * as api from "../api";

const OUT = process.env.BALANCE_REPORT;
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 12);

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const r0 = (x: number) => Math.round(x);
const k = (x: number) => Math.round(x / 1000);
const hm = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;

export function summarize(runs: RunResult[]) {
  const chapters: Record<string, Record<string, number>> = {};
  for (let ch = 1; ch <= 9; ch++) {
    const per = runs.map((run) => {
      const rows = run.rows.filter((x) => (ch === 9 ? x.free : x.chapter === ch && !x.free));
      if (!rows.length) return undefined;
      const staffDays = rows.filter((x) => x.ktv > 0);
      return {
        days: rows.length,
        moneyEnd: rows[rows.length - 1].money,
        profitDay: mean(rows.map((x) => x.profit)),
        revenueDay: mean(rows.map((x) => x.revenue)),
        served: mean(rows.map((x) => x.served)),
        byStaff: mean(rows.map((x) => x.byStaff)),
        walkouts: mean(rows.map((x) => x.walkouts)),
        complaints: mean(rows.map((x) => x.complaints)),
        rep: rows[rows.length - 1].reputation,
        missed: rows.filter((x) => x.rentMissed).length,
        resets: rows.filter((x) => x.reset).length,
        staffNetDay: staffDays.length ? mean(staffDays.map((x) => x.staffRevenue - x.staffWages - x.staffSupplies)) : NaN,
        staffLossDays: staffDays.length ? staffDays.filter((x) => x.staffRevenue - x.staffWages - x.staffSupplies < 0).length / staffDays.length : NaN,
        ktv: mean(rows.map((x) => x.ktv)),
        pTreat: mean(rows.map((x) => x.playerTreat)),
        busyH: mean(rows.map((x) => x.busyMin)) / 60,
        endClock: mean(rows.map((x) => x.endClock)),
        lateDays: rows.filter((x) => x.endClock > 1140).length / rows.length,
        recep: mean(rows.map((x) => (x.recep ? 1 : 0))),
        cleaner: mean(rows.map((x) => (x.cleaner ? 1 : 0))),
        combo: mean(rows.map((x) => x.comboServed)),
        beds: mean(rows.map((x) => x.beds)),
        wPat: mean(rows.map((x) => x.walkoutReasons.patience ?? 0)),
        wQ: mean(rows.map((x) => x.walkoutReasons["queue-full"] ?? 0)),
      };
    }).filter((x): x is NonNullable<typeof x> => !!x);
    if (!per.length) continue;
    const keys = Object.keys(per[0]) as (keyof typeof per[0])[];
    const agg: Record<string, number> = { runs: per.length };
    for (const kk of keys) agg[kk] = mean(per.map((x) => x[kk]).filter((v) => !Number.isNaN(v)));
    agg.moneyEndMin = Math.min(...per.map((x) => x.moneyEnd));
    agg.moneyEndMax = Math.max(...per.map((x) => x.moneyEnd));
    chapters[ch === 9 ? "free" : `ch${ch}`] = agg;
  }
  const exams: Record<string, { firstTry: number; attempts: number }> = {};
  for (let ch = 1; ch <= 8; ch++) {
    const per = runs.map((run) => run.exams.filter((e) => e.chapter === ch)).filter((x) => x.length);
    if (!per.length) continue;
    exams[`ch${ch}`] = { firstTry: mean(per.map((x) => (x[0].passed ? 1 : 0))), attempts: mean(per.map((x) => x.length)) };
  }
  const required: Record<string, { delay: number; maxDelay: number; never: number }> = {};
  for (const id of ["E03", "E06", "E07", "E08", "E09", "E10"]) {
    const xs = runs.map((run) => run.required[id]).filter(Boolean);
    if (!xs.length) continue;
    const bought = xs.filter((x) => x.boughtDay !== undefined).map((x) => x.boughtDay! - x.unlockedDay);
    required[id] = { delay: mean(bought), maxDelay: bought.length ? Math.max(...bought) : NaN, never: xs.length - bought.length };
  }
  const day7 = runs.map((run) => run.rows.find((x) => x.day === 7)?.money ?? NaN);
  const bed2Day = runs.map((run) => run.purchases.find((x, i) => x.id === "E01" && i >= 0)?.day ?? NaN);
  const afford2ndBed = runs.map((run) => run.rows.find((x) => x.day >= 7 && x.money >= 1_500_000 + 700_000)?.day ?? NaN);
  const exp = runs.map((run) => run.purchases.find((x) => x.id === "expansion")?.day ?? NaN);
  const lvDay = (id: string) => { const xs = runs.map((run) => run.purchases.find((x) => x.id === id)?.day ?? NaN); const ok = xs.filter((x) => !Number.isNaN(x)); return { day: mean(ok), share: ok.length / runs.length }; };
  const tierSpend = mean(runs.map((run) => run.purchases.filter((x) => x.id.startsWith("tier")).reduce((a, x) => a + x.price, 0)));
  const tier3Beds = mean(runs.map((run) => run.final.equipment.filter((e) => e.id === "E01" && e.tier === 3).length));
  const beds = mean(runs.map((run) => run.final.equipment.filter((e) => e.id === "E01").length));
  return {
    chapters, exams, required,
    day7Money: { mean: mean(day7), min: Math.min(...day7), max: Math.max(...day7) },
    bed2BoughtDay: mean(bed2Day.filter((x) => !Number.isNaN(x))),
    afford2ndBedDay: mean(afford2ndBed.filter((x) => !Number.isNaN(x))),
    expansionDay: mean(exp.filter((x) => !Number.isNaN(x))),
    daysToFree: mean(runs.map((x) => x.daysToFree ?? NaN).filter((x) => !Number.isNaN(x))),
    finishedFree: runs.filter((x) => x.daysToFree !== undefined).length / runs.length,
    finalMoney: mean(runs.map((x) => x.final.money)),
    finalMoneyMin: Math.min(...runs.map((x) => x.final.money)),
    finalMoneyMax: Math.max(...runs.map((x) => x.final.money)),
    level2: lvDay("level-2"), level3: lvDay("level-3"), tierSpend, tier3Beds, beds,
    repairsDay: mean(runs.map((run) => mean(run.rows.filter((x) => x.chapter >= 5 || x.free).map((x) => x.repairs)))),
  };
}

function table(name: string, sm: ReturnType<typeof summarize>): string {
  const lines = [`## ${name}`, `day7 money ${k(sm.day7Money.mean)}k [${k(sm.day7Money.min)}–${k(sm.day7Money.max)}] · afford bed2 (≥2.2tr after d7) day ${sm.afford2ndBedDay.toFixed(1)} · bed2 bought day ${sm.bed2BoughtDay.toFixed(1)} · expansion day ${sm.expansionDay.toFixed(1)} · daysToFree ${sm.daysToFree.toFixed(1)} (${(sm.finishedFree * 100).toFixed(0)}%) · final ${k(sm.finalMoney)}k [${k(sm.finalMoneyMin)}–${k(sm.finalMoneyMax)}]`,
    `levels: L1 day ${sm.expansionDay.toFixed(1)} · L2 day ${sm.level2.day.toFixed(1)} (${(sm.level2.share * 100).toFixed(0)}%) · L3 day ${sm.level3.day.toFixed(1)} (${(sm.level3.share * 100).toFixed(0)}%) · tier upgrades ${k(sm.tierSpend)}k · beds ${sm.beds.toFixed(1)} (tier3 ${sm.tier3Beds.toFixed(1)}) · repairs/day ch5+ ${k(sm.repairsDay)}k`];
  lines.push("ch    | days | moneyEnd k (min–max)     | profit/d k | rev/d k | served | staff | walk | compl | rep  | missed | resets | ktv | staffNet/d k | staffLoss% | pTreat | busyH | end  | late% | rec | cln | beds | combo | wPat | wQ");
  for (const [ch, a] of Object.entries(sm.chapters)) {
    lines.push(`${ch.padEnd(5)} | ${a.days.toFixed(1).padStart(4)} | ${String(k(a.moneyEnd)).padStart(6)} (${k(a.moneyEndMin)}–${k(a.moneyEndMax)})`.padEnd(42) + ` | ${String(k(a.profitDay)).padStart(10)} | ${String(k(a.revenueDay)).padStart(7)} | ${a.served.toFixed(1).padStart(6)} | ${a.byStaff.toFixed(1).padStart(5)} | ${a.walkouts.toFixed(2).padStart(4)} | ${a.complaints.toFixed(2).padStart(5)} | ${a.rep.toFixed(2)} | ${a.missed.toFixed(2).padStart(6)} | ${a.resets.toFixed(2).padStart(6)} | ${a.ktv.toFixed(1)} | ${Number.isNaN(a.staffNetDay) ? "    -" : String(k(a.staffNetDay)).padStart(12)} | ${(Number.isNaN(a.staffLossDays) ? "-" : (a.staffLossDays * 100).toFixed(0)).padStart(10)} | ${a.pTreat.toFixed(1).padStart(6)} | ${a.busyH.toFixed(1).padStart(5)} | ${hm(a.endClock)} | ${(a.lateDays * 100).toFixed(0).padStart(5)} | ${a.recep.toFixed(1)} | ${a.cleaner.toFixed(1)} | ${a.beds.toFixed(1).padStart(4)} | ${a.combo.toFixed(2)} | ${a.wPat.toFixed(2)} | ${a.wQ.toFixed(2)}`);
  }
  lines.push("exams: " + Object.entries(sm.exams).map(([ch, e]) => `${ch} ${(e.firstTry * 100).toFixed(0)}%/${e.attempts.toFixed(1)}`).join(" · "));
  lines.push("required tools delay (days after unlock): " + Object.entries(sm.required).map(([id, x]) => `${id} ${x.delay.toFixed(1)} (max ${x.maxDelay}, never ${x.never})`).join(" · "));
  return lines.join("\n");
}

beforeAll(() => setContentForTests(null));

/**
 * Value of an investment (A/B on the same seeds): mean daily profit difference over the 28 game days after the
 * purchase (profit excludes purchases but includes depreciation, wages, rent), and payback = price ÷ that difference.
 */
export function payback(withRuns: RunResult[], withoutRuns: RunResult[], id: string): { bought: number; price: number; dProfit: number; payback: number; dFinal: number } {
  const bought: number[] = [], prices: number[] = [], diffs: number[] = [];
  withRuns.forEach((w, i) => {
    const o = withoutRuns[i];
    const multi = id.endsWith("*");
    const ps = w.purchases.filter((x) => (multi ? x.id.startsWith(id.slice(0, -1)) : x.id === id));
    const p = ps[0] && { day: ps[0].day, price: multi ? ps.reduce((a, x) => a + x.price, 0) : ps[0].price };
    if (!p || !o) return;
    bought.push(p.day);
    prices.push(p.price);
    const other = new Map(o.rows.map((x) => [x.day, x.profit]));
    const ds = w.rows.filter((x) => x.day > p.day && x.day <= p.day + (multi ? 999 : 28) && other.has(x.day)).map((x) => x.profit - other.get(x.day)!);
    if (ds.length) diffs.push(mean(ds));
  });
  const dProfit = mean(diffs);
  const price = mean(prices);
  const dFinal = mean(withRuns.map((w, i) => w.final.money - (withoutRuns[i]?.final.money ?? NaN)));
  return { bought: mean(bought), price, dProfit, payback: dProfit > 0 && price > 0 ? price / dProfit : NaN, dFinal };
}

describe.skipIf(!OUT)("balance report", () => {
  it("runs all profiles × strategies", () => {
    const report: Record<string, unknown> = {};
    const text: string[] = [];
    const combos: [ProfileId, StrategyId | StrategyFlags, string][] = [];
    for (const p of ["beginner", "average", "expert"] as ProfileId[]) for (const st of ["frugal", "normal", "aggressive"] as StrategyId[]) combos.push([p, st, `${p}/${st}`]);
    // A/B variants (average player)
    const ag = STRATEGIES.aggressive, no = STRATEGIES.normal;
    combos.push(["average", { ...ag, expansion: false }, "average/aggr-noExpansion"]);
    combos.push(["average", { ...ag, maxLevel: 1 }, "average/aggr-maxL1"]);
    combos.push(["average", { ...ag, maxLevel: 2 }, "average/aggr-maxL2"]);
    combos.push(["average", { ...ag, maxTier: 1 }, "average/aggr-noTiers"]);
    combos.push(["average", { ...no, maxLevel: 1 }, "average/normal-maxL1"]);
    combos.push(["average", { ...no, maxLevel: 2 }, "average/normal-maxL2"]);
    combos.push(["average", { ...no, maxTier: 2 }, "average/normal-maxT2"]);
    combos.push(["average", { ...no, maxTier: 1 }, "average/normal-noTiers"]);
    combos.push(["average", { ...no, maxTier: 1, expansion: false }, "average/normal-old"]);
    combos.push(["average", { ...ag, ads: false }, "average/aggr-noAds"]);
    combos.push(["average", { ...ag, vip: false }, "average/aggr-noVip"]);
    combos.push(["average", { ...ag, support: false }, "average/aggr-noSupport"]);
    combos.push(["average", { ...ag, combo: false }, "average/aggr-noCombo"]);
    combos.push(["average", { ...no, support: false }, "average/normal-noSupport"]);
    combos.push(["average", { ...no, staff: false, secondBed: false, maxKtv: 0 }, "average/normal-noStaff"]);
    combos.push(["expert", { ...no, staff: false, secondBed: false, maxKtv: 0 }, "expert/normal-noStaff"]);
    combos.push(["beginner", { ...no, staff: false, secondBed: false, maxKtv: 0 }, "beginner/normal-noStaff"]);
    const only = process.env.BALANCE_ONLY ? new RegExp(process.env.BALANCE_ONLY) : undefined;
    const all: Record<string, RunResult[]> = {};
    for (const [p, st, name] of combos) {
      if (only && !only.test(name)) continue;
      const runs: RunResult[] = [];
      for (let i = 0; i < SEEDS; i++) runs.push(runGame(p, st, 1000 + i * 7919, { freeDays: 20, maxDays: 220 }));
      all[name] = runs;
      const sm = summarize(runs);
      report[name] = sm;
      text.push(table(name, sm));
    }
    const pb: Record<string, unknown> = {};
    const pairs: [string, string, string][] = [
      ["average/aggressive", "average/aggr-noExpansion", "expansion"],
      ["average/aggr-maxL2", "average/aggr-maxL1", "level-2"],
      ["average/aggressive", "average/aggr-maxL2", "level-3"],
      ["average/normal-maxL2", "average/normal-maxL1", "level-2"],
      ["average/normal", "average/normal-maxL2", "level-3"],
      ["average/normal-maxT2", "average/normal-noTiers", "tier2*"],
      ["average/normal", "average/normal-maxT2", "tier3*"],
      ["average/aggressive", "average/aggr-noTiers", "tier*"],
      ["average/normal", "average/normal-noTiers", "tier*"],
      ["average/aggressive", "average/aggr-noAds", "ads"],
      ["average/aggressive", "average/aggr-noVip", "vip-room"],
      ["average/aggressive", "average/aggr-noCombo", "combo"],
      ["average/aggressive", "average/aggr-noSupport", "hire-receptionist"],
      ["average/aggressive", "average/aggr-noSupport", "hire-cleaner"],
      ["average/normal", "average/normal-noSupport", "hire-receptionist"],
      ["average/normal", "average/normal-noSupport", "hire-cleaner"],
      ["average/normal", "average/normal-noStaff", "E01"],
      ["expert/normal", "expert/normal-noStaff", "E01"],
      ["beginner/normal", "beginner/normal-noStaff", "E01"],
    ];
    const lines = ["## investments (A/B, same seeds): bought day · price · Δprofit/day over the next 28 days · payback days · Δ final money"];
    for (const [a, b, id] of pairs) {
      if (!all[a] || !all[b]) continue;
      const x = payback(all[a], all[b], id);
      pb[`${a} vs ${b}: ${id}`] = x;
      lines.push(`${a} vs ${b} · ${id}: day ${x.bought.toFixed(1)} · ${k(x.price)}k · Δprofit ${k(x.dProfit)}k/d · payback ${x.payback.toFixed(1)} d · Δfinal ${k(x.dFinal)}k`);
    }
    report.payback = pb;
    text.push(lines.join("\n"));
    writeFileSync(OUT!, JSON.stringify(report, null, 1));
    writeFileSync(OUT!.replace(/\.json$/, ".txt"), text.join("\n\n"));
  }, 1_200_000);
});

describe.skipIf(!process.env.BALANCE_PAYBACK)("tier payback report", () => {
  it("per-item payback in a running shop", () => {
    const lines: string[] = ["## tier payback (A/B from the same state, 14 days, all items of the kind one tier up)"];
    const n = Number(process.env.BALANCE_SEEDS ?? 4);
    for (const [prof, strat, day] of [["average", "normal", 45], ["average", "aggressive", 55], ["average", "normal", 70]] as const) {
      const base = Array.from({ length: n }, (_, i) => runGame(prof, { ...STRATEGIES[strat], maxTier: 1 }, 1000 + i * 7919, { stopAfterDay: day, maxDays: 200 }).final);
      const t2 = base.map((s) => { let x = { ...s, money: s.money + 100_000_000 }; for (const e of s.equipment) if (api.upgradeCost(e) !== undefined && api.hasTiers(e.id)) x = api.upgradeEquipment(x, e.uid); return { ...x, money: s.money }; });
      for (const [label, ids] of [["beds", ["E01"]], ["steamer", ["E03"]], ["shampoo chair", ["E06"]], ["water heater", ["E08"]], ["hot stones", ["E09"]], ["foot chair", ["E10"]], ["gua sha", ["E07"]]] as const) {
        for (const [from, states] of [["1→2", base], ["2→3", t2]] as const) {
          const x = tierPayback(states, [...ids], 14);
          lines.push(`${prof}/${strat} day ${day} · ${label} ${from}: cost ${k(x.cost)}k · Δprofit ${k(x.dProfit)}k/d · payback ${x.payback.toFixed(1)} d (${(x.payback / 7).toFixed(1)} wk)`);
        }
      }
    }
    writeFileSync(process.env.BALANCE_PAYBACK!, lines.join("\n"));
  }, 1_200_000);
});
