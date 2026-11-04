import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useFixture } from "./fixture";
import { setContentForTests } from "../content";
import { newGame, getMastery, hintLevelFor, dueItems, itemKey } from "../api";
import { applyPractice, applyForgetting } from "../mastery";

beforeEach(() => useFixture());
afterAll(() => setContentForTests(null));

describe("mastery", () => {
  it("itemKey format", () => {
    expect(itemKey({ kind: "point", id: "GV29", side: "center" })).toBe("P:GV29");
    expect(itemKey({ kind: "muscle", id: "masseter" })).toBe("M:masseter");
    expect(itemKey({ kind: "zone", id: "kidneys" })).toBe("Z:kidneys");
  });
  it("level 0 → 1 on first attempt, +1 after 3 correct, −1 on miss (min 1)", () => {
    const s = newGame("T", 1);
    expect(getMastery(s, "P:A1").level).toBe(0);
    applyPractice(s, "P:A1", true);
    expect(getMastery(s, "P:A1").level).toBe(1);
    applyPractice(s, "P:A1", true);
    applyPractice(s, "P:A1", true);
    expect(getMastery(s, "P:A1").level).toBe(1);
    applyPractice(s, "P:A1", true);
    expect(getMastery(s, "P:A1").level).toBe(2);
    applyPractice(s, "P:A1", false);
    expect(getMastery(s, "P:A1").level).toBe(1);
    applyPractice(s, "P:A1", false);
    expect(getMastery(s, "P:A1").level).toBe(1);
    expect(getMastery(s, "P:A1").attempts).toBe(6);
    expect(hintLevelFor(s, "P:A1", false)).toBe(1);
    expect(hintLevelFor(s, "P:A1", true)).toBe(3);
  });
  it("SRS intervals grow when reviewed on due days and reset on miss", () => {
    const s = newGame("T", 1);
    applyPractice(s, "P:A1", true);
    expect(getMastery(s, "P:A1").dueDay).toBe(2);
    s.day = 2; applyPractice(s, "P:A1", true);
    expect(getMastery(s, "P:A1").dueDay).toBe(5);
    s.day = 5; applyPractice(s, "P:A1", true);
    expect(getMastery(s, "P:A1").dueDay).toBe(12);
    s.day = 6; applyPractice(s, "P:A1", true); // early review: no interval growth
    expect(getMastery(s, "P:A1").intervalIdx).toBe(2);
    applyPractice(s, "P:A1", false);
    expect(getMastery(s, "P:A1").dueDay).toBe(7);
    expect(getMastery(s, "P:A1").intervalIdx).toBe(0);
  });
  it("forgetting drops a level when overdue > 2 intervals", () => {
    const s = newGame("T", 1);
    s.mastery["P:A1"] = { level: 3, streak: 0, attempts: 5, correct: 5, lastSeenDay: 1, dueDay: 4, intervalIdx: 1 };
    s.day = 10; applyForgetting(s);
    expect(s.mastery["P:A1"].level).toBe(3);
    s.day = 11; applyForgetting(s);
    expect(s.mastery["P:A1"].level).toBe(2);
  });
  it("dueItems lists learned unseen/due items first", () => {
    const s = newGame("T", 1);
    expect(dueItems(s, 10).sort()).toEqual(["P:A1", "P:A2"]);
    applyPractice(s, "P:A1", true); applyPractice(s, "P:A1", true);
    expect(dueItems(s, 10)[0]).toBe("P:A2");
  });
});
