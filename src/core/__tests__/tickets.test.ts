import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useFixture } from "./fixture";
import { setContentForTests } from "../content";
import * as api from "../api";
import { makeTicket, generateArrivals } from "../tickets";
import { makeRng } from "../rng";
import { serviceDef } from "../content";
import { syncUnlocks } from "../chapters";
import type { GameState } from "../types";

beforeEach(() => useFixture());
afterAll(() => setContentForTests(null));

function atChapter2(): GameState {
  const s = api.newGame("T", 7);
  s.chapter = 2; s.chapterDay = 1; s.chaptersPassed = [1];
  syncUnlocks(s);
  return s;
}

describe("tickets", () => {
  it("day 1 only uses learned items (A1, A2) and both are requested", () => {
    const s = api.newGame("T", 3);
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const items = makeTicket(s, serviceDef("basic")!, makeRng(i));
      for (const it of items) seen.add(it.id);
      expect(items.length).toBeGreaterThan(0);
    }
    expect([...seen].sort()).toEqual(["A1", "A2"]);
  });
  it("prefers today's new items", () => {
    const s = api.newGame("T", 3);
    s.chapterDay = 2; syncUnlocks(s);
    let fresh = 0, total = 0;
    for (let i = 0; i < 40; i++) {
      const items = makeTicket(s, serviceDef("basic")!, makeRng(i));
      const ids = new Set(items.map((x) => x.id));
      total++;
      if (ids.has("A3") && ids.has("A4")) fresh++;
    }
    expect(fresh / total).toBeGreaterThan(0.9);
  });
  it("chapter 2 tickets mix ~30% earlier-chapter items", () => {
    const s = atChapter2();
    for (let i = 0; i < 20; i++) {
      const items = makeTicket(s, serviceDef("hand")!, makeRng(i));
      const ids = new Set(items.map((x) => x.id));
      expect([...ids].some((id) => id.startsWith("A"))).toBe(true);
      expect([...ids].some((id) => id.startsWith("B"))).toBe(true);
    }
  });
  it("pregnant customers get a contraindicated item on the ticket", () => {
    const s = atChapter2();
    for (let i = 0; i < 10; i++) {
      const items = makeTicket(s, serviceDef("hand")!, makeRng(i), { pregnant: true });
      expect(items.some((x) => x.id === "B1")).toBe(true);
    }
  });
  it("arrival waves: day with walkout intro starts with 3 customers within 5 minutes of opening", () => {
    const s = api.newGame("T", 3);
    s.chapterDay = 2; syncUnlocks(s);
    const arr = generateArrivals(s);
    expect(arr.filter((c) => c.arriveAt <= 545).length).toBe(3);
    for (const c of arr) expect(c.arriveAt).toBeLessThanOrEqual(1050);
  });
  it("buildExam covers all chapter items with both sides and forces hint 3", () => {
    const s = api.newGame("T", 3);
    s.chapterDay = 3; syncUnlocks(s);
    expect(api.isExamDay(s)).toBe(true);
    const ex = api.buildExam(s);
    expect(ex).toHaveLength(1);
    const ids = ex[0].items.map((i) => `${i.id}:${"side" in i ? i.side : ""}`);
    expect(ids).toContain("A1:center");
    for (const id of ["A2", "A3", "A4"]) { expect(ids).toContain(`${id}:left`); expect(ids).toContain(`${id}:right`); }
    expect(api.buildTreatmentConfig(s, ex[0]).hintLevel("P:A1")).toBe(3);
    expect(api.buildExam(s)).toEqual(ex); // deterministic
  });
  it("chapter exam with pregnant case adds a pregnant customer with the contraindicated item", () => {
    const s = atChapter2();
    s.chapterDay = 2; syncUnlocks(s);
    const ex = api.buildExam(s);
    expect(ex).toHaveLength(2);
    expect(ex[1].health?.id).toBe("pregnant");
    expect(ex[1].items.some((i) => i.id === "B1")).toBe(true);
    // review items from chapter 1
    expect(ex[0].items.filter((i) => i.id.startsWith("A")).length).toBeGreaterThan(0);
  });
});
