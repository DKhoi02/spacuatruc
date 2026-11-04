import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useFixture, perfectResult, cust as mk } from "./fixture";
import { setContentForTests } from "../content";
import * as api from "../api";
import { syncUnlocks } from "../chapters";
import { applyPractice } from "../mastery";
import type { Customer, GameState } from "../types";
import * as tickets from "../tickets";
import { makeRng } from "../rng";
import { C, serviceDef } from "../content";
import { useEquipment } from "../equipment";

beforeEach(() => useFixture());
afterAll(() => setContentForTests(null));

const cust = (id: string, extra: Partial<Customer> = {}): Customer => mk(id, { items: [{ kind: "point", id: "A1", side: "center" }], ...extra });

function day2(): GameState {
  const s = api.newGame("T", 9);
  s.chapterDay = 2; syncUnlocks(s);
  return s;
}
function runEmptyDay(s: GameState): { state: GameState; summary: ReturnType<typeof api.closeDay>["summary"] } {
  const o = api.openShop(s);
  o.today.arrivals = []; o.today.queue = [];
  return api.closeDay(o);
}
function master(s: GameState) {
  for (const k of ["P:A1", "P:A2", "P:A3", "P:A4"]) s.mastery[k] = { level: 3, streak: 0, attempts: 5, correct: 5, lastSeenDay: 1, dueDay: 99, intervalIdx: 2 };
}

describe("store", () => {
  it("buySupply / not enough money / locked", () => {
    let s = day2();
    s = api.buySupply(s, "I02", 2);
    expect(s.inventory.I02).toBe(30);
    expect(s.money).toBe(1_800_000);
    expect(s.today.ledger.purchases).toBe(200_000);
    s.money = 10;
    expect(() => api.buySupply(s, "I02", 1)).toThrow("Không đủ tiền");
    expect(() => api.setPriceMultiplier(s, "basic", 1.1)).toThrow();
  });
  it("bed upgrade: tier 2 → 3, longer durability, repair = 30% of the tier value (GAME_DESIGN §12.2)", () => {
    const T = C().CONFIG.equipmentTiers;
    let s = day2();
    const uid = s.equipment[0].uid;
    expect(() => api.upgradeEquipment(s, uid)).toThrow(/nâng cấp/);
    s.unlocked.features.push("upgrades");
    s.equipment[0].usesLeft = 150; // half worn: an upgrade keeps the wear (%), it is not a repair
    s = api.upgradeEquipment(s, uid);
    expect(s.equipment[0]).toMatchObject({ id: "E01", tier: 2, usesLeft: 180 });
    expect(api.maxUsesOf(s.equipment[0])).toBe(300 * T.durability[1]);
    const up2 = 1_500_000 * T.upgradePct[1], up3 = 1_500_000 * T.upgradePct[2];
    expect(s.money).toBe(2_000_000 - up2);
    expect(api.repairCost(s.equipment[0])).toBe(0.3 * (1_500_000 + up2));
    s.money = 5_000_000;
    s = api.upgradeEquipment(s, uid);
    expect(s.equipment[0]).toMatchObject({ tier: 3, usesLeft: 210 });
    expect(s.money).toBe(5_000_000 - up3);
    expect(api.upgradeCost(s.equipment[0])).toBeUndefined();
    expect(() => api.upgradeEquipment(s, uid)).toThrow(/cao nhất/);
    s.equipment[0].usesLeft = 10;
    const m = s.money;
    s = api.repairEquipment(s, uid);
    expect(s.equipment[0].usesLeft).toBe(420);
    expect(m - s.money).toBe(0.3 * (1_500_000 + up2 + up3)); // tier 3 repairs cost more than tier 1 (450k)
  });
  it("upgraded bed + steamer: price premium (bed + main tool), tip bonus, bill shows the premium", () => {
    const T = C().CONFIG.equipmentTiers;
    let s = day2();
    s.unlocked.features.push("upgrades");
    s.money = 10_000_000;
    s = api.upgradeEquipment(s, s.equipment[0].uid);
    s = api.openShop(s); s.today.arrivals = []; s.today.queue = [cust("a")];
    s = api.startPlayerService(s, "a");
    let out = api.completePlayerService(s, perfectResult(cust("a")));
    const p2 = Math.round(100_000 * (1 + T.pricePct[1]) / 1000) * 1000;
    expect(out.bill.price).toBe(p2);
    expect(out.bill.equipPremiumPct).toBe(T.pricePct[1]);
    expect(out.bill.tip).toBe(Math.round(p2 * (0.1 + T.tipPct[1]) / 1000) * 1000); // 3★ tip + tier tip
    // care uses the bed + the steamer (main tool): both tier 3 → premium counted twice
    s = out.state;
    s.equipment.push({ uid: "st", id: "E03", usesLeft: 200, slot: "steamer", tier: 3 });
    s = api.upgradeEquipment(s, s.equipment[0].uid);
    s.equipment[0].dirty = false;
    const c = cust("b", { serviceId: "care", items: [{ kind: "step", id: "cleanse" }] });
    s.today.queue = [c];
    s = api.startPlayerService(s, "b");
    out = api.completePlayerService(s, perfectResult(c));
    expect(out.bill.equipPremiumPct).toBeCloseTo(2 * T.pricePct[2]);
    expect(out.bill.price).toBe(Math.round(120_000 * (1 + 2 * T.pricePct[2]) / 1000) * 1000);
  });
  it("tier side effects: machines use more power, upgraded waiting chairs add patience", () => {
    const T = C().CONFIG.equipmentTiers;
    const s = day2();
    s.equipment.push({ uid: "st", id: "E03", usesLeft: 200, slot: "steamer", tier: 3 }, { uid: "ch", id: "E02", usesLeft: 500, slot: "chair-3", tier: 2 });
    useEquipment(s, "st");
    expect(s.today.ledger.electricity).toBe(3_000 * T.electricity[2]);
    expect(tickets.basePatience(s)).toBe(C().CONFIG.patience.baseMin + T.patienceMin[1]);
  });
  it("broken bed cannot be used", () => {
    let s = day2();
    s.equipment[0].usesLeft = 0;
    s = api.openShop(s); s.today.arrivals = []; s.today.queue = [cust("a")];
    expect(api.canServe(s, "a").ok).toBe(false);
  });
});

describe("staff", () => {
  it("candidates appear once hiring is introduced; KTV needs mastery ≥3", () => {
    let s = api.newGame("T", 9);
    expect(s.candidates).toHaveLength(0);
    s = runEmptyDay(s).state;
    s = api.startNextDay(s);
    expect(s.candidates.length).toBeGreaterThanOrEqual(2);
    expect(s.candidates.every((c) => c.role === "ktv" && c.tier <= 2)).toBe(true);
    expect(api.staffCanPerform(s, "basic")).toBe(false);
    master(s);
    expect(api.staffCanPerform(s, "basic")).toBe(true);
  });
  it("KTV takes duration × tier factor, billed when done; commission + base wage at close, losses possible", () => {
    let s = day2();
    master(s);
    s.candidates = [{ characterId: "ktv-lan", name: "Lan", role: "ktv", tier: 1, wage: 100_000, commissionPct: 10 }];
    s = api.hire(s, 0);
    s = api.buyEquipment({ ...s, money: 5_000_000 }, "E01");
    const uid = s.staff[0].uid;
    s = api.openShop(s); s.today.arrivals = []; s.today.queue = [cust("a"), cust("b")];
    const { state: started, service } = api.assignToStaff(s, "a", uid);
    expect(service).toMatchObject({ performer: uid, startAt: 540, endsAt: 540 + 35 }); // 30 × 1.2 → 35 (rounded to 5)
    expect(started.today.records).toHaveLength(0);
    expect(() => api.assignToStaff(started, "b", uid)).toThrow(/đang làm/);
    // the player serves in parallel on the second bed
    let p = api.startPlayerService(started, "b");
    expect(p.today.inService.map((x) => x.bedSlot)).toEqual([service.bedSlot, s.equipment[1].uid]);
    p = api.completePlayerService(p, perfectResult(cust("b"))).state;
    expect(p.today.clock).toBe(570);
    expect(p.today.records.map((r) => r.performer)).toEqual(["player"]);
    const state = api.advanceTime(p);
    expect(state.today.clock).toBe(575);
    const record = state.today.records.find((r) => r.performer === uid)!;
    expect(record).toBeTruthy();
    expect(api.billOf(state, "a")?.total).toBe(record.price + record.tip);
    expect(state.staff[0].exp).toBe(1);
    expect(state.today.inService).toHaveLength(0);
    expect(state.equipment.find((e) => e.uid === service.bedSlot)?.dirty).toBe(true);
    const { summary } = api.closeDay(state);
    expect(summary.ledger.wagesBase).toBe(100_000);
    expect(summary.ledger.wagesCommission).toBe(Math.round(record.price * 0.1));
    expect(summary.servedByStaff).toBe(1);
    expect(summary.served).toBe(2);
    // slow day: only wages → loss
    const s2 = api.startNextDay(api.closeDay(state).state);
    const empty = runEmptyDay(s2);
    expect(empty.summary.profit).toBeLessThan(0);
  });
  it("KTV cannot do services without player mastery", () => {
    let s = day2();
    s.candidates = [{ characterId: "ktv-lan", name: "Lan", role: "ktv", tier: 1, wage: 100_000, commissionPct: 10 }];
    s = api.hire(s, 0);
    s = api.openShop(s); s.today.arrivals = []; s.today.queue = [cust("a")];
    expect(() => api.assignToStaff(s, "a", s.staff[0].uid)).toThrow(/thành thạo/);
  });
  it("unpaid 2 days → quit notice → leaves after 2 days unless retained", () => {
    let s = day2();
    s.candidates = [{ characterId: "ktv-lan", name: "Lan", role: "ktv", tier: 1, wage: 100_000, commissionPct: 10 }];
    s = api.hire(s, 0);
    s.money = 0;
    let r = runEmptyDay(s);
    expect(r.state.staff[0].unpaidDays).toBe(1);
    r = runEmptyDay(api.startNextDay(r.state));
    expect(r.state.staff[0].quitNoticeDaysLeft).toBe(2);
    // retained by bonus
    const kept = api.giveBonus({ ...r.state, money: 500_000 }, r.state.staff[0].uid, 200_000);
    expect(kept.staff[0].quitNoticeDaysLeft).toBeUndefined();
    // not retained
    r = runEmptyDay(api.startNextDay(r.state));
    r = runEmptyDay(api.startNextDay(r.state));
    expect(r.state.staff).toHaveLength(0);
  });
  it("fire pays 3 days severance; promotion flow", () => {
    let s = day2();
    s.candidates = [{ characterId: "ktv-lan", name: "Lan", role: "ktv", tier: 1, wage: 100_000, commissionPct: 10 }];
    s = api.hire(s, 0);
    const uid = s.staff[0].uid;
    const f = api.fire(s, uid);
    expect(f.money).toBe(s.money - 300_000);
    expect(f.today.ledger.severance).toBe(300_000);
    s.staff[0].exp = 3;
    const r = runEmptyDay(s);
    expect(r.state.staff[0].promotionRequested).toBe(true);
    const yes = api.answerPromotion(r.state, uid, true);
    expect(yes.staff[0].tier).toBe(2);
    expect(yes.staff[0].wage).toBe(150_000);
    const no = api.answerPromotion(r.state, uid, false);
    expect(no.staff[0].satisfaction).toBe(r.state.staff[0].satisfaction - 15);
  });
});

describe("combos & expansion", () => {
  const withCombo = () => {
    let s = day2();
    if (!s.unlocked.features.includes("combo")) s.unlocked.features.push("combo");
    return s;
  };
  it("combo price must be 70–100% of the list sum", () => {
    const s = withCombo();
    s.equipment.push({ uid: "st", id: "E03", usesLeft: 200, slot: "steamer" });
    expect(() => api.createCombo(s, "Gói", ["basic", "care"], 150_000)).toThrow(/70%/);
    expect(() => api.createCombo(s, "Gói", ["basic", "care"], 230_000)).toThrow(/100%/);
    expect(api.createCombo(s, "Gói", ["basic", "care"], 154_000).combos[0].price).toBe(154_000);
  });
  it("combo customer: combo price × stars, summed supplies, 90% duration, items from each service", () => {
    let s = withCombo();
    s.equipment.push({ uid: "st", id: "E03", usesLeft: 200, slot: "steamer" });
    s = api.createCombo(s, "Thư giãn", ["basic", "care"], 176_000);
    const combo = s.combos[0];
    // customers order cheap combos often
    const { comboChance } = tickets;
    const cc = C().CONFIG.combo;
    expect(comboChance(combo)).toBeCloseTo(cc.baseChance + cc.chancePerDiscount * 0.2);
    s = api.openShop(s);
    s.today.arrivals = [];
    const ticket = tickets.makeComboTicket(s, combo, makeRng(3));
    expect(ticket.some((i) => i.kind === "step")).toBe(true);
    expect(ticket.some((i) => i.kind === "point")).toBe(true);
    const c = cust("k", { combo, items: ticket, durationMin: tickets.sessionMinutes(serviceDef("basic"), combo) });
    expect(c.durationMin).toBe(65); // (30 + 40) × 0.9 = 63 → 65
    s.today.queue = [c];
    s = api.startPlayerService(s, "k");
    expect(s.inventory.I01).toBe(10 - 1 - 2);
    expect(s.inventory.I02).toBe(10 - 1);
    expect(s.today.inService[0].endsAt).toBe(540 + 65);
    const cfg = api.buildTreatmentConfig(s, c);
    expect(cfg.service.name).toBe("Thư giãn");
    const out = api.completePlayerService(s, perfectResult(c));
    expect(out.bill.serviceName).toBe("Thư giãn");
    expect(out.bill.price).toBe(176_000);
    expect(out.record.comboName).toBe("Thư giãn");
    expect(out.state.today.clock).toBe(605);
  });
  it("generated arrivals include combo customers when the combo is a good deal", () => {
    let s = withCombo();
    s.equipment.push({ uid: "st", id: "E03", usesLeft: 200, slot: "steamer" });
    s = api.createCombo(s, "Rẻ", ["basic", "care"], 154_000);
    let n = 0, combos = 0;
    for (let d = 1; d < 30; d++) {
      const g = { ...s, day: d };
      for (const c of tickets.generateArrivals(g)) { n++; if (c.combo) { combos++; expect(c.serviceId).toBe("basic"); expect(c.durationMin).toBe(65); } }
    }
    expect(combos / n).toBeGreaterThan(0.15);
    expect(combos / n).toBeLessThan(0.55);
  });
  it("expansion comes with 2 free waiting chairs in chair-3/chair-4", () => {
    let s = day2();
    s.unlocked.features.push("expansion");
    expect(() => api.buyExpansion({ ...s, money: 6_000_000 })).toThrow(/Chương 5/);
    s.chapter = 5;
    s = api.buyExpansion({ ...s, money: 6_000_000 });
    const chairs = s.equipment.filter((e) => e.id === "E02");
    expect(chairs.map((e) => e.slot)).toEqual(["chair-3", "chair-4"]);
    expect(s.money).toBe(1_000_000);
    expect(s.shopLevel).toBe(1);
    expect(s.rent.amount).toBe(1_200_000);
  });
  it("shop levels 1 → 3: unlock chapters, rent, bed slots in 2 rooms, free chairs, customers, price premium (§12.1)", () => {
    let s = day2();
    s.unlocked.features.push("expansion");
    s.chapter = 5; s.money = 100_000_000;
    s = api.buyExpansion(s);
    expect(api.nextShopLevel(s)).toEqual({ level: 2, ok: false, reason: "Mở từ Chương 6." });
    s.chapter = 6;
    s = api.buyExpansion(s);
    expect(api.slotsFor("E01", 2)).toEqual(["bed-1", "bed-2", "bed-3", "bed-4", "bed-5", "bed-6"]);
    expect(api.roomOfSlot("bed-5")).toBe(2);
    expect(() => api.buyExpansion(s)).toThrow(/Chương 8/);
    s.chapter = 8;
    s = api.buyExpansion(s);
    expect(s.shopLevel).toBe(3);
    expect(api.nextShopLevel(s)).toBeUndefined();
    expect(() => api.buyExpansion(s)).toThrow(/cao nhất/);
    expect(s.rent.amount).toBe(api.shopLevelDef(3).rent);
    expect(s.equipment.filter((e) => e.id === "E02").map((e) => e.slot)).toEqual(["chair-3", "chair-4", "chair-5", "chair-6", "chair-7", "chair-8"]);
    expect(s.money).toBe(100_000_000 - 5_000_000 - api.shopLevelDef(2).cost - api.shopLevelDef(3).cost);
    for (let i = 0; i < 7; i++) s = api.buyEquipment(s, "E01");
    expect(s.equipment.filter((e) => e.id === "E01").map((e) => e.slot).sort()).toEqual(["bed-1", "bed-2", "bed-3", "bed-4", "bed-5", "bed-6", "bed-7", "bed-8"]);
    expect(() => api.buyEquipment(s, "E01")).toThrow(/Không còn chỗ/);
    // every service costs +10% at level 3
    s = api.openShop(s); s.today.arrivals = []; s.today.queue = [cust("a")];
    s = api.startPlayerService(s, "a");
    const out = api.completePlayerService(s, perfectResult(cust("a")));
    expect(out.bill.shopPremiumPct).toBe(0.1);
    expect(out.bill.price).toBe(110_000);
  });
});

describe("rent", () => {
  it("pays rent on day 7 close", () => {
    let s = day2();
    s.day = 7;
    const r = runEmptyDay(s);
    expect(r.summary.ledger.rent).toBe(700_000);
    expect(r.state.rent.nextDueDay).toBe(14);
  });
  it("second missed rent resets shop to chapter start but keeps mastery", () => {
    let s = day2();
    applyPractice(s, "P:A1", true);
    s.day = 7; s.money = 100_000;
    s = api.buyEquipment({ ...s, money: 2_000_000 }, "E02");
    s.money = 100_000;
    let r = runEmptyDay(s);
    expect(r.state.rent.missedPayments).toBe(1);
    s = api.startNextDay(r.state);
    expect(s.money).toBeLessThan(700_000);
    s.day = 14;
    r = runEmptyDay(s);
    expect(r.state.rent.missedPayments).toBe(2);
    s = api.startNextDay(r.state);
    expect(s.money).toBe(2_000_000);
    expect(s.chapterDay).toBe(1);
    expect(s.equipment.map((e) => e.id)).toContain("E01");
    expect(s.equipment.map((e) => e.id)).not.toContain("E02");
    expect(s.rent.missedPayments).toBe(0);
    expect(s.mastery["P:A1"].attempts).toBe(1);
    expect(api.getMorningBrief(s).tips.some((t) => t.includes("làm lại từ đầu chương"))).toBe(true);
  });
});
