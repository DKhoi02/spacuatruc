import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useFixture, perfectResult, servePlayer, cust, CONFIG } from "./fixture";
import { setContentForTests } from "../content";
import * as api from "../api";
import { syncUnlocks } from "../chapters";
import type { Customer, GameState } from "../types";

beforeEach(() => useFixture());
afterAll(() => setContentForTests(null));

function openWith(s: GameState, arrivals: Customer[]): GameState {
  const o = api.openShop(s);
  o.today.arrivals = arrivals; o.today.queue = []; o.today.walkouts = []; o.reputation = s.reputation;
  return api.processArrivals(o);
}

describe("day flow", () => {
  it("newGame starts with doc economy", () => {
    const s = api.newGame("Tiệm Hoa", 1);
    expect(s.money).toBe(2_000_000);
    expect(s.reputation).toBe(3);
    expect(s.inventory.I01).toBe(10);
    expect(s.equipment.map((e) => e.id)).toEqual(["E01"]);
    expect(s.unlocked.services).toEqual(["basic"]);
    expect(s.today.phase).toBe("prep");
    expect(s.today.clock).toBe(540);
    expect(s.rent.nextDueDay).toBe(7);
  });

  it("morning brief flags out-of-stock supplies and missing required equipment", () => {
    const s = api.newGame("T", 5);
    s.inventory.I01 = 0;
    s.chapterDay = 2; syncUnlocks(s); // "care" (needs E03) unlocks on day 2 in the fixture
    const tips = api.getMorningBrief(s).tips;
    expect(tips.some((t) => t.startsWith("Hết ") && t.includes("bỏ về"))).toBe(true);
    expect(tips.some((t) => t.startsWith("Chưa có ") && t.includes("Da mặt"))).toBe(true);
    s.equipment.push({ uid: "x", id: "E03", usesLeft: 200, slot: "steamer" });
    expect(api.getMorningBrief(s).tips.some((t) => t.startsWith("Chưa có "))).toBe(false);
  });

  it("full day: open → serve → bill → close → next", () => {
    let s = api.newGame("T", 5);
    const brief = api.getMorningBrief(s);
    expect(brief.expectedCustomers).toEqual([2, 2]);
    expect(brief.tips).toContain("Tip ngày 1");
    s = api.openShop(s);
    expect(s.today.queue.length + s.today.arrivals.length).toBe(2);
    const c = s.today.queue[0];
    expect(c.arriveAt).toBe(540);
    expect(api.canServe(s, c.id)).toEqual({ ok: false, reason: expect.stringMatching(/đón khách/) });
    s = api.checkIn(s, c.id);
    expect(s.today.clock).toBe(545);
    s = api.startPlayerService(s, c.id);
    expect(s.inventory.I01).toBe(9);
    expect(s.inventory.I02).toBe(9);
    expect(s.today.inService[0]).toMatchObject({ startAt: 545, endsAt: 575 });
    const out = api.completePlayerService(s, perfectResult(c));
    expect(out.state.today.clock).toBe(575);
    expect(out.bill.stars).toBe(3);
    expect(out.bill.price).toBe(100_000);
    expect(out.bill.tip).toBe(10_000);
    expect(out.state.money).toBe(2_110_000);
    expect(out.state.reputation).toBeCloseTo(3.03);
    expect(out.state.equipment[0].dirty).toBe(true);
    expect(api.billOf(out.state, c.id)?.total).toBe(110_000);
    s = servePlayer(out.state);
    expect(api.isDayOver(s)).toBe(true);
    const { state, summary } = api.closeDay(s);
    expect(summary.served).toBe(2);
    expect(summary.ledger.revenuePlayer).toBe(200_000);
    expect(summary.ledger.supplies).toBe(2 * (5_000 + 10_000));
    expect(summary.ledger.electricity).toBe(20_000);
    expect(summary.ledger.depreciation).toBe(2 * 5_000);
    expect(summary.profit).toBe(200_000 + 20_000 - 30_000 - 20_000 - 10_000);
    expect(state.money).toBe(2_000_000 + 220_000 - 20_000);
    expect(summary.itemsPracticed.length).toBeGreaterThan(0);
    const next = api.startNextDay(state);
    expect(next.day).toBe(2);
    expect(next.chapterDay).toBe(2);
    expect(next.today.phase).toBe("prep");
    expect(next.unlocked.features).toContain("walkout");
    expect(next.history).toHaveLength(1);
    // purity
    expect(s.today.phase).toBe("open");
  });

  it("queue full on arrival → walkout with reputation loss", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s = openWith(s, [cust("a"), cust("b"), cust("c")]);
    expect(s.today.queue).toHaveLength(2);
    expect(s.today.walkouts).toEqual(["c"]);
    expect(api.walkoutReason(s, "c")?.key).toBe("queue-full");
    expect(s.reputation).toBeCloseTo(2.98);
  });

  it("buying a waiting chair adds a seat", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s = api.buyEquipment(s, "E02");
    expect(s.money).toBe(1_600_000);
    expect(s.equipment.find((e) => e.id === "E02")?.slot).toBe("chair-3");
    s = openWith(s, [cust("a"), cust("b"), cust("c")]);
    expect(s.today.queue).toHaveLength(3);
  });

  it("patience runs out in minutes while the player works → walkout", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s = openWith(s, [cust("a"), cust("b", { patience: 20 })]);
    s = api.startPlayerService(s, "a");
    s = api.completePlayerService(s, perfectResult(cust("a"))).state;
    expect(s.today.clock).toBe(570);
    expect(s.today.walkouts).toContain("b");
    expect(api.walkoutReason(s, "b")?.key).toBe("patience");
  });

  it("customers not greeted lose patience ×1.5", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s = openWith(s, [cust("a"), cust("b", { patience: 40, checkedIn: false }), cust("c", { patience: 50, arriveAt: 541, checkedIn: false })]);
    s = api.startPlayerService(s, "a");
    s = api.completePlayerService(s, perfectResult(cust("a"))).state;
    expect(api.walkoutReason(s, "b")?.key).toBe("patience"); // 30 min × 1.5 = 45 > 40
    expect(s.today.queue.map((c) => c.id)).toEqual(["c"]);   // not greeted either but more patient: 29 × 1.5 = 43.5 < 50
    expect(api.walkoutReason(s, "c")).toBeUndefined();
  });

  it("receptionist greets automatically and adds 20 minutes of patience", () => {
    let s = api.newGame("T", 5);
    s.staff.push({ uid: "r1", characterId: "letan-ngoc", name: "Ngọc", role: "receptionist", tier: 1, wage: 80_000, commissionPct: 0, satisfaction: 70, exp: 0, servicesToday: 0, promotionRequested: false, unpaidDays: 0, hiredDay: 1 });
    s = api.openShop(s);
    const c = s.today.queue[0];
    expect(c.checkedIn).toBe(true);
    expect(c.patience).toBe(CONFIG.patience.baseMin + 20);
    expect(api.canServe(s, c.id).ok).toBe(true);
  });

  it("customers arrive by the minute; Chờ jumps to the next arrival", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s = openWith(s, [cust("a", { arriveAt: 600 })]);
    expect(s.today.queue).toHaveLength(0);
    expect(api.nextEvent(s)).toMatchObject({ at: 600, kind: "arrival" });
    s = api.advanceTime(s);
    expect(s.today.clock).toBe(600);
    expect(s.today.queue.map((c) => c.id)).toEqual(["a"]);
    expect(() => api.advanceTime(s)).toThrow(/Không còn gì để chờ/);
  });

  it("customers in service never leave; arrivals during a treatment join the queue", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s = openWith(s, [cust("a"), cust("b", { arriveAt: 560, checkedIn: false })]);
    expect(s.today.queue.map((c) => c.id)).toEqual(["a"]);
    s = api.startPlayerService(s, "a");
    expect(() => api.advanceTime(s)).toThrow(/Bạn đang làm/);
    s = api.completePlayerService(s, perfectResult(cust("a"))).state;
    expect(s.today.queue.map((c) => c.id)).toEqual(["b"]);
    expect(s.today.queue[0].patience).toBeCloseTo(45 - 10 * 1.5); // cust() default patience 45
  });

  it("a used bed must be cleaned (10 min) before the next customer", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s = openWith(s, [cust("a"), cust("b")]);
    s = api.startPlayerService(s, "a");
    s = api.completePlayerService(s, perfectResult(cust("a"))).state;
    const bed = s.equipment[0];
    expect(bed.dirty).toBe(true);
    expect(api.canServe(s, "b")).toEqual({ ok: false, reason: expect.stringMatching(/dọn/) });
    s = api.cleanStation(s, bed.uid);
    expect(s.today.clock).toBe(580);
    expect(s.equipment[0].dirty).toBeFalsy();
    expect(api.canServe(s, "b").ok).toBe(true);
    expect(() => api.cleanStation(s, bed.uid)).toThrow(/sạch/);
  });

  it("a cleaner cleans dirty beds by herself, 10 minutes each", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s.staff.push({ uid: "c1", characterId: "tapvu-co-sau", name: "Cô Sáu", role: "cleaner", tier: 1, wage: 70_000, commissionPct: 0, satisfaction: 70, exp: 0, servicesToday: 0, promotionRequested: false, unpaidDays: 0, hiredDay: 1 });
    s = openWith(s, [cust("a"), cust("b")]);
    s = api.startPlayerService(s, "a");
    s = api.completePlayerService(s, perfectResult(cust("a"))).state;
    expect(s.today.cleaning).toMatchObject([{ stationUid: s.equipment[0].uid, endsAt: 580 }]);
    expect(api.nextEvent(s)).toMatchObject({ at: 580, kind: "cleaning" });
    s = api.advanceTime(s);
    expect(s.equipment[0].dirty).toBeFalsy();
    expect(api.canServe(s, "b").ok).toBe(true);
  });

  it("early close: allowed when nobody waits; later customers just don't come", () => {
    let s = api.newGame("T", 5);
    s = openWith(s, [cust("a", { arriveAt: 700 })]);
    expect(api.canCloseEarly(s)).toBe(true);
    expect(api.isDayOver(s)).toBe(false);
    const { summary } = api.closeDay(s);
    expect(summary.walkouts).toBe(0);
  });

  it("reputation below 3 recovers each evening: max(0.02, 8% of the gap), half on a day with complaints", () => {
    let s = api.newGame("T", 5);
    s.reputation = 2.5;
    s = openWith(s, []);
    s.today.reputationStart = 2.5;
    const { state } = api.closeDay(s);
    expect(state.reputation).toBeCloseTo(2.54);
    let low = api.newGame("T", 5);
    low.reputation = 1;
    low = openWith(low, []);
    expect(api.closeDay(low).state.reputation).toBeCloseTo(1.16);
    let comp = api.newGame("T", 5);
    comp.reputation = 1;
    comp = openWith(comp, []);
    (comp.today as unknown as { meta: { complaintsTotal: number } }).meta.complaintsTotal = 1;
    expect(api.closeDay(comp).state.reputation).toBeCloseTo(1.08);
    let s2 = api.newGame("T", 5);
    s2.reputation = 2.99;
    s2 = openWith(s2, []);
    expect(api.closeDay(s2).state.reputation).toBeCloseTo(3);
  });

  it("no supplies → walkout; missing steamer → walkout", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s.inventory.I02 = 0;
    s = openWith(s, [cust("a"), cust("b", { serviceId: "care", items: [] })]);
    expect(api.walkoutReason(s, "a")?.key).toBe("no-supplies");
    expect(api.walkoutReason(s, "b")?.key).toBe("no-equipment");
    expect(api.walkoutReason(s, "b")?.text).toContain("chưa có");
    expect(s.today.queue).toHaveLength(0);
  });

  it("care service needs steamer: per-use electricity + depreciation", () => {
    let s = api.newGame("T", 5);
    s.chapterDay = 2; syncUnlocks(s);
    s = api.buyEquipment(s, "E03");
    s = openWith(s, [cust("a", { serviceId: "care", durationMin: 40, items: [{ kind: "step", id: "cleanse" }, { kind: "step", id: "steam" }] })]);
    expect(api.canServe(s, "a")).toEqual({ ok: true, bedSlot: s.equipment[0].uid });
    s = api.startPlayerService(s, "a");
    expect(s.today.ledger.electricity).toBe(3_000 + 3_000);
    expect(s.today.ledger.depreciation).toBe(5_000 + 4_000);
    expect(s.inventory.I01).toBe(8);
  });

  it("safety error → 1 star, complaint, reputation −0.06; refund resolution", () => {
    let s = api.newGame("T", 5);
    s = openWith(s, [cust("a")]);
    s = api.startPlayerService(s, "a");
    const r = perfectResult(cust("a"));
    r.items[0].safetyErrors = 1;
    const out = api.completePlayerService(s, r);
    expect(out.bill.stars).toBe(1);
    expect(out.bill.price).toBe(60_000);
    expect(out.bill.tip).toBe(0);
    expect(out.complaint?.reason).toBeTruthy();
    expect(out.state.reputation).toBeCloseTo(2.94);
    const cp = out.state.today.complaints[0];
    expect(cp.refundIfApologize).toBe(18_000);
    const r1 = api.resolveComplaint(out.state, cp.id, "apologize-refund");
    expect(r1.money).toBe(out.state.money - 18_000);
    expect(r1.reputation).toBeCloseTo(2.92);
    expect(r1.today.ledger.refunds).toBe(18_000);
    const r2 = api.resolveComplaint(out.state, cp.id, "apologize");
    expect(r2.reputation).toBeCloseTo(2.9);
    expect(r2.money).toBe(out.state.money);
  });

  it("mastery updates from treatment and toReview lists misses", () => {
    let s = api.newGame("T", 5);
    s = openWith(s, [cust("a")]);
    s = api.startPlayerService(s, "a");
    const r = perfectResult(cust("a"));
    r.items[1].positionScore = 0;
    s = api.completePlayerService(s, r).state;
    expect(api.getMastery(s, "P:A1").correct).toBe(1);
    expect(api.getMastery(s, "P:A2").correct).toBe(0);
    const { summary } = api.closeDay(s);
    expect(summary.toReview).toContain("P:A2");
  });
});
