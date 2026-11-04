/** Full simulation with the REAL content from @/data (skipped while data is still empty). */
import { describe, it, expect, beforeAll } from "vitest";
import { ACUPOINTS } from "@/data";
import { setContentForTests, C } from "../content";
import * as api from "../api";
import { playDay } from "./sim";

beforeAll(() => setContentForTests(null));

describe.skipIf(ACUPOINTS.length === 0)("integration with real data", () => {
  it("plays chapter 1 week: tickets use learned points, exam passes, chapter 2 opens", () => {
    let s = api.newGame("Tiệm Thử", 2026);
    const log: string[] = [];
    for (let d = 1; d <= 7; d++) {
      if (s.day === 1) expect(api.getMorningBrief(s).expectedCustomers).toEqual([2, 2]);
      s = playDay(s, log);
    }
    expect(log.join("\n")).toContain("PASS");
    expect(s.day).toBe(8);
    expect(s.chapter).toBe(2);
    expect(s.chapterDay).toBe(1);
    expect(s.chaptersPassed).toEqual([1]);
    expect(s.history.find((h) => h.day === 7)?.ledger.rent).toBe(C().CONFIG.rentPerWeek);
    expect(s.money).toBeGreaterThan(0);
    for (const id of ["GV29", "EX-HN5", "BL2", "TE23", "EX-HN4", "GB14", "GB1", "ST2", "BL1", "ST1"]) expect(api.getMastery(s, `P:${id}`).attempts).toBeGreaterThan(0);
    expect(s.unlocked.services).toContain("goi-dau-thuong");
  });

  it("plays the whole game to free mode with perfect play", () => {
    let s = api.newGame("Tiệm Thử", 7);
    const log: string[] = [];
    for (let d = 0; d < 120 && !s.freeMode; d++) s = playDay(s, log);
    expect(s.freeMode).toBe(true);
    expect(s.chaptersPassed).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // free mode days keep working (SRS tickets, challenge)
    for (let d = 0; d < 5; d++) s = playDay(s, log);
    const ch = api.dailyChallenge(s);
    expect(ch.items.length).toBe(10);
    expect(api.dueItems(s, 5).length).toBeLessThanOrEqual(5);
    const json = api.exportSave(s);
    expect(api.parseSaveFile(json).state.day).toBe(s.day);
  });
});
