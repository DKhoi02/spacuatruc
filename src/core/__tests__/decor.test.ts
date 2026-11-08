import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { useFixture } from "./fixture";
import { setContentForTests } from "../content";
import * as api from "../api";
import { basePatience } from "../tickets";
import { DECOR_CONFIG } from "@/data/decor";

beforeEach(() => useFixture());
afterAll(() => setContentForTests(null));

describe("decorations", () => {
  it("buy → place → move / flip / store; storage counts copies", () => {
    let s = api.newGame("T", 3);
    s.money = 5_000_000;
    s = api.buyDecor(s, "D03");
    expect(s.money).toBe(5_000_000 - 350_000);
    expect(s.today.ledger.other).toBe(350_000);
    expect(api.decorInStorage(s, "D03")).toBe(1);
    const r = api.placeDecor(s, "D03", "lobby", 0.3, 0.9);
    s = r.state;
    expect(api.decorInStorage(s, "D03")).toBe(0);
    expect(() => api.placeDecor(s, "D03", "lobby", 0.5, 0.9)).toThrow();
    s = api.moveDecor(s, r.uid, 1.4, -2);
    expect(s.decor!.placed[0]).toMatchObject({ x: 1, y: 0 });
    s = api.flipDecor(s, r.uid);
    expect(s.decor!.placed[0].flip).toBe(true);
    s = api.storeDecor(s, r.uid);
    expect(s.decor!.placed).toHaveLength(0);
    expect(api.decorInStorage(s, "D03")).toBe(1);
  });

  it("not enough money is refused", () => {
    const s = api.newGame("T", 3);
    s.money = 100;
    expect(() => api.buyDecor(s, "D12")).toThrow();
  });

  it("ambience: distinct items count their beauty, copies 1, capped; lobby → patience, room → tips", () => {
    let s = api.newGame("T", 3);
    s.money = 50_000_000;
    const before = basePatience(s);
    for (const id of ["D12", "D11", "D12"]) { s = api.buyDecor(s, id); s = api.placeDecor(s, id, "lobby", 0.5, 0.9).state; }
    expect(api.ambience(s, "lobby")).toBe(3 + 3 + 1);
    expect(api.ambience(s, "room1")).toBe(0);
    expect(basePatience(s) - before).toBe(Math.round(7 * DECOR_CONFIG.lobbyPatiencePerPoint));
    for (const id of ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D09", "D14"]) { s = api.buyDecor(s, id); s = api.placeDecor(s, id, "room1", 0.5, 0.9).state; }
    expect(api.ambience(s, "room1")).toBe(DECOR_CONFIG.maxScore);
    expect(api.decorTipPct(s, "S02")).toBeCloseTo((DECOR_CONFIG.maxScore * DECOR_CONFIG.roomTipPctPerPoint) / 100);
    expect(api.decorTipPct(s, "S04")).toBe(0);
  });

  it("save round-trip keeps decorations; malformed decor is dropped", () => {
    let s = api.newGame("T", 3);
    s.money = 5_000_000;
    s = api.buyDecor(s, "D01");
    s = api.placeDecor(s, "D01", "room1", 0.2, 0.8).state;
    const back = api.migrateSave(JSON.parse(JSON.stringify(s)));
    expect(back.decor).toEqual(s.decor);
    const bad = api.migrateSave({ ...JSON.parse(JSON.stringify(s)), decor: { owned: 3 } });
    expect(bad.decor).toBeUndefined();
  });
});
