import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useFixture, CONFIG } from "./fixture";
import { setContentForTests } from "../content";
import * as api from "../api";
import { exportSave, parseSaveFile, saveFileName } from "../save-format";

beforeEach(() => useFixture());
afterAll(() => setContentForTests(null));

describe("save format", () => {
  it("round-trips", () => {
    const s = api.openShop(api.newGame("Tiệm Hoa Đào", 4));
    const text = exportSave(s, new Date("2026-11-04T10:00:00Z"));
    const obj = JSON.parse(text);
    expect(obj.app).toBe("spa-game");
    expect(obj.schemaVersion).toBe(3);
    const { state, summary } = parseSaveFile(text);
    expect(state).toEqual(s);
    expect(summary).toEqual({ shopName: "Tiệm Hoa Đào", chapter: 1, day: 1, money: 2_000_000, exportedAt: "2026-11-04T10:00:00.000Z" });
    expect(saveFileName(s, new Date("2026-11-04T10:00:00Z"))).toBe("spa-tiem-hoa-dao-2026-11-04.json");
  });
  it("rejects bad files with Vietnamese messages", () => {
    expect(() => parseSaveFile("{oops")).toThrow(/hỏng/);
    expect(() => parseSaveFile(JSON.stringify({ app: "other", schemaVersion: 1, save: {} }))).toThrow(/không phải file lưu/);
    const s = api.newGame("A", 1);
    expect(() => parseSaveFile(JSON.stringify({ app: "spa-game", schemaVersion: 99, save: s }))).toThrow(/cập nhật game/);
    expect(() => parseSaveFile(JSON.stringify({ app: "spa-game", schemaVersion: 1, save: { ...s, money: "x" } }))).toThrow(/số dư/);
  });
  it("migrateSave fills missing optional fields and accepts wrapper/string", () => {
    const s = api.newGame("A", 1);
    const partial = JSON.parse(JSON.stringify(s));
    delete partial.combos; delete partial.settings; delete partial.challenge;
    const m = api.migrateSave(partial);
    expect(m.combos).toEqual([]);
    expect(m.settings).toEqual({ sound: true, music: true });
    expect(api.migrateSave(JSON.stringify(s)).shopName).toBe("A");
    expect(() => api.migrateSave(42)).toThrow(/không hợp lệ/);
    expect(() => api.migrateSave({ ...s, schemaVersion: 5 })).toThrow(/mới hơn/);
  });
  it("migrateSave fills ledger.rewards = 0 for old saves (today + history)", () => {
    const s = api.newGame("A", 1);
    const old = JSON.parse(JSON.stringify(s));
    delete old.today.ledger.rewards;
    old.history = [{ day: 1, chapter: 1, chapterDay: 1, served: 0, servedByStaff: 0, walkouts: 0, complaints: 0, reputationDelta: 0,
      ledger: { ...old.today.ledger }, profit: 0, moneyEnd: 0, itemsPracticed: [], toReview: [], notes: [] }];
    const m = api.migrateSave(old);
    expect(m.today.ledger.rewards).toBe(0);
    expect(m.history[0].ledger.rewards).toBe(0);
  });
  it("migrates v1 saves (no clock): pending customers get minutes, in-service gets an end time", () => {
    let s = api.openShop(api.newGame("A", 1));
    const c = s.today.queue[0];
    s = api.startPlayerService(api.checkIn(s, c.id), c.id);
    const old = JSON.parse(JSON.stringify(s));
    old.schemaVersion = 1;
    delete old.today.clock; delete old.today.cleaning;
    old.today.servicesCompleted = 1;
    const strip = (x: Record<string, unknown>, after: number) => { delete x.arriveAt; delete x.patience; delete x.durationMin; delete x.checkedIn; x.waitPatience = 2; x.arriveAfter = after; };
    old.today.arrivals.forEach((x: Record<string, unknown>) => strip(x, 2));
    old.today.queue = [{ ...old.today.arrivals[0], id: "q1" }];
    strip(old.today.queue[0], 0);
    for (const k of Object.keys(old.today.meta.serving)) strip(old.today.meta.serving[k], 0);
    old.today.inService = old.today.inService.map((x: Record<string, unknown>) => ({ customerId: x.customerId, performer: x.performer, bedSlot: x.bedSlot }));
    const m = api.migrateSave(old);
    expect(m.schemaVersion).toBe(3);
    expect(m.today.clock).toBe(580);
    expect(m.today.cleaning).toEqual([]);
    expect(m.today.queue[0]).toMatchObject({ arriveAt: 580, patience: CONFIG.patience.baseMin, checkedIn: true, durationMin: 30 });
    expect(m.today.queue[0]).not.toHaveProperty("waitPatience");
    expect(m.today.arrivals[0]).toMatchObject({ arriveAt: 620, durationMin: 30 });
    expect(m.today.arrivals[0].checkedIn).toBeFalsy();
    expect(m.today.inService[0]).toMatchObject({ startAt: 580, endsAt: 610 });
    expect(m.unlocked.features).toContain("checkin");
    // the migrated day plays on
    const done = api.completePlayerService(m, { customerId: c.id, items: [] });
    expect(done.state.today.clock).toBe(610);
  });
  it("migrates v2 saves (GAME_DESIGN §12): expanded → shopLevel 1, nệm êm bed → tier-2 bed, tiers default to 1", () => {
    const s = api.newGame("A", 1);
    const old = JSON.parse(JSON.stringify(s));
    old.schemaVersion = 2;
    delete old.shopLevel;
    old.expanded = true;
    old.equipment = [
      { uid: "eq1", id: "E01-upgraded", usesLeft: 150, slot: "bed-1" },
      { uid: "eq2", id: "E01", usesLeft: 300, slot: "bed-2" },
      { uid: "eq3", id: "E02", usesLeft: 500, slot: "chair-3" },
    ];
    old.unlocked.equipment = ["E01", "E02", "E03", "E04", "E05", "E01-upgraded"];
    const m = api.migrateSave(old);
    expect(m.schemaVersion).toBe(3);
    expect(m.shopLevel).toBe(1);
    expect(m).not.toHaveProperty("expanded");
    expect(m.equipment[0]).toMatchObject({ uid: "eq1", id: "E01", tier: 2, usesLeft: 180, slot: "bed-1" });
    expect(m.equipment[1]).toMatchObject({ id: "E01", tier: 1 });
    expect(m.equipment[2]).toMatchObject({ id: "E02", tier: 1 });
    expect(m.unlocked.equipment).not.toContain("E04");
    expect(m.unlocked.equipment).not.toContain("E01-upgraded");
    // an unexpanded v2 save → level 0
    const m0 = api.migrateSave({ ...old, expanded: false });
    expect(m0.shopLevel).toBe(0);
  });
});
