import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useFixture } from "./fixture";
import { setContentForTests } from "../content";
import * as api from "../api";
import { syncUnlocks } from "../chapters";
import type { Customer } from "../types";

const EVENTS = [
  { id: "po", title: "Mất điện", description: "", effect: "power-outage" as const, minChapter: 1 as const },
  { id: "ld", title: "Giao trễ", description: "", effect: "late-delivery" as const, minChapter: 1 as const },
];
beforeEach(() => useFixture({ EVENTS }));
afterAll(() => setContentForTests(null));

describe("events", () => {
  it("power outage blocks electric equipment; late delivery blocks supply purchase", () => {
    let s = api.newGame("T", 1);
    s.chapterDay = 2; syncUnlocks(s);
    s = api.buyEquipment(s, "E03");
    s.today.event = { id: "po", title: "Mất điện", description: "" };
    expect(api.getMorningBrief(s).event?.title).toBe("Mất điện");
    s = api.openShop(s);
    const c: Customer = { id: "x", characterId: "khach-mai", name: "M", serviceId: "care", items: [], regular: false, arriveAt: 540, patience: 45, checkedIn: true, durationMin: 40 };
    s.today.queue = [c];
    const r = api.canServe(s, "x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Mất điện/);
    s.today.event = { id: "ld", title: "", description: "" };
    expect(() => api.buySupply(s, "I01", 1)).toThrow(/giao trễ/);
  });
  it("events roll from chapter 4 roughly once a week", () => {
    let hits = 0;
    for (let seed = 0; seed < 200; seed++) {
      let s = api.newGame("T", seed);
      s.chapter = 4;
      s = api.startNextDay(api.closeDay(api.openShop(s)).state);
      if (s.today.event) hits++;
    }
    expect(hits).toBeGreaterThan(10);
    expect(hits).toBeLessThan(60);
  });
});
