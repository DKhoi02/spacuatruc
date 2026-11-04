import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useFixture } from "./fixture";
import { setContentForTests } from "../content";
import { scorePosition, itemScore, serviceScore, toleranceRadius } from "../api";
import { scoreService } from "../scoring";
import type { TreatmentResult, Customer } from "../types";

beforeEach(() => useFixture());
afterAll(() => setContentForTests(null));

describe("scoring", () => {
  it("scores position by distance", () => {
    expect(scorePosition(0, 30)).toEqual({ score: 100, grade: "perfect" });
    expect(scorePosition(10, 30)).toEqual({ score: 100, grade: "perfect" });
    expect(scorePosition(10.1, 30).grade).toBe("good");
    expect(scorePosition(30, 30)).toEqual({ score: 70, grade: "good" });
    expect(scorePosition(31, 30)).toEqual({ score: 0, grade: "miss" });
  });
  it("item score: position only, 60/40 with force, swipe overrides", () => {
    expect(itemScore({ positionScore: 70 })).toBe(70);
    expect(itemScore({ positionScore: 100, forceScore: 50 })).toBeCloseTo(80);
    expect(itemScore({ positionScore: 0, swipeScore: 90 })).toBe(90);
  });
  it("tolerance shrinks at level 4", () => {
    expect(toleranceRadius(30, 3)).toBe(30);
    expect(toleranceRadius(30, 4)).toBeCloseTo(21);
  });
  const res = (scores: number[], safety = 0): TreatmentResult => ({
    customerId: "c", items: scores.map((p, i) => ({ item: { kind: "point", id: "A2", side: "left" }, positionScore: p, attempts: 1, safetyErrors: i === 0 ? safety : 0 })),
  });
  it("stars from mean and safety penalty", () => {
    expect(serviceScore(res([100, 100, 70]))).toEqual({ score: 90, stars: 3, safetyErrors: 0 });
    expect(serviceScore(res([70, 70])).stars).toBe(2);
    expect(serviceScore(res([70, 0])).stars).toBe(1);
    const sf = serviceScore(res([100, 100], 1));
    expect(sf.score).toBe(70);
    expect(sf.stars).toBe(1); // safety caps at 1 star
  });
  it("skip handling for contraindicated items on pregnant customers", () => {
    const cust = { id: "c", health: { id: "pregnant", label: "" } } as Customer;
    const r: TreatmentResult = { customerId: "c", items: [
      { item: { kind: "point", id: "B1", side: "left" }, positionScore: 0, attempts: 0, safetyErrors: 0, skipped: true },
      { item: { kind: "point", id: "A2", side: "left" }, positionScore: 100, attempts: 1, safetyErrors: 0 },
    ] };
    expect(scoreService(r, cust).score).toBe(100);
    // skipping a normal item = 0
    const r2: TreatmentResult = { customerId: "c", items: [{ ...r.items[1], skipped: true }, r.items[1]] };
    expect(scoreService(r2, cust).score).toBe(50);
    // performing the contraindicated item = safety error even if UI forgot
    const r3: TreatmentResult = { customerId: "c", items: [{ ...r.items[0], skipped: false, positionScore: 100 }, r.items[1]] };
    const s3 = scoreService(r3, cust);
    expect(s3.safetyErrors).toBe(1);
    expect(s3.stars).toBe(1);
    // not pregnant: performing B1 is fine
    expect(scoreService(r3, { id: "c" } as Customer).safetyErrors).toBe(0);
  });
});
