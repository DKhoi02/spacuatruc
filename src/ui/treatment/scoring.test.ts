import { describe, expect, it } from "vitest";
import {
  autoZoomFor, evaluateSwipe, patienceLeft, forceScoreOf, forceZoneOf, inShape, itemScore, lighterForce, normDist, pointInPolygon, polygonDistance,
  needsPrecision, scorePosition, stepForce, toleranceRadius, type Pt,
} from "./scoring";

describe("position scoring", () => {
  it("grades by distance vs r", () => {
    expect(scorePosition(0.005, 0.02)).toEqual({ score: 100, grade: "perfect" });
    expect(scorePosition(0.02 / 3, 0.02).grade).toBe("perfect");
    expect(scorePosition(0.015, 0.02)).toEqual({ score: 70, grade: "good" });
    expect(scorePosition(0.0201, 0.02)).toEqual({ score: 0, grade: "miss" });
  });
  it("tightens tolerance at level 4 only", () => {
    expect(toleranceRadius(0.02, 3)).toBe(0.02);
    expect(toleranceRadius(0.02, 4)).toBeCloseTo(0.014);
  });
  it("measures distance in width units with aspect correction", () => {
    expect(normDist([0.5, 0.5], [0.6, 0.5])).toBeCloseTo(0.1);
    expect(normDist([0.5, 0.5], [0.5, 0.6])).toBeCloseTo(0.14);
  });
});

describe("item score", () => {
  it("chapter 1 = position, force = 60/40, swipe = swipe, skipped = 0", () => {
    expect(itemScore({ positionScore: 70 })).toBe(70);
    expect(itemScore({ positionScore: 100, forceScore: 50 })).toBe(80);
    expect(itemScore({ positionScore: 0, swipeScore: 90 })).toBe(90);
    expect(itemScore({ positionScore: 100, skipped: true })).toBe(0);
  });
});

describe("shapes", () => {
  const sq: Pt[] = [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]];
  it("polygon hit + distance", () => {
    expect(pointInPolygon([0.5, 0.5], sq)).toBe(true);
    expect(pointInPolygon([0.7, 0.5], sq)).toBe(false);
    expect(polygonDistance([0.5, 0.5], sq)).toBe(0);
    expect(polygonDistance([0.7, 0.5], sq)).toBeCloseTo(0.1);
  });
  it("ellipse uses rx as width fraction and ry as height fraction", () => {
    const e = { shape: "ellipse" as const, x: 0.38, y: 0.4636, rx: 0.056, ry: 0.0129 };
    expect(inShape([0.38, 0.4636], e)).toBe(true);
    expect(inShape([0.43, 0.4636], e)).toBe(true);
    expect(inShape([0.38, 0.48], e)).toBe(false);
  });
  it("circle radius is a width fraction", () => {
    const c = { shape: "circle" as const, x: 0.5, y: 0.5, r: 0.02 };
    expect(inShape([0.515, 0.5], c)).toBe(true);
    expect(inShape([0.5, 0.516], c)).toBe(false); // 0.016*1.4 = 0.0224 > 0.02
  });
});

describe("swipe", () => {
  const muscle = {
    polygon: [[0.3, 0.3], [0.7, 0.3], [0.7, 0.42], [0.3, 0.42]] as Pt[],
    strokes: [{ from: [0.47, 0.4] as Pt, to: [0.47, 0.32] as Pt }],
    maxAngleDeg: 30, minLengthRatio: 0.6,
  };
  const line = (a: Pt, b: Pt, n = 10): Pt[] => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  it("accepts a swipe along the stroke", () => {
    const ev = evaluateSwipe(line([0.47, 0.4], [0.47, 0.32]), muscle);
    expect(ev.ok).toBe(true);
    expect(ev.score).toBe(100);
  });
  it("rejects the opposite direction", () => {
    expect(evaluateSwipe(line([0.47, 0.32], [0.47, 0.4]), muscle).reason).toBe("direction");
  });
  it("rejects swipes outside the muscle", () => {
    expect(evaluateSwipe(line([0.47, 0.7], [0.47, 0.62]), muscle).reason).toBe("outside");
  });
  it("rejects too-short swipes", () => {
    expect(evaluateSwipe(line([0.47, 0.4], [0.47, 0.37]), muscle).reason).toBe("tooShort");
  });
  it("penalizes angle a little", () => {
    const ev = evaluateSwipe(line([0.45, 0.4], [0.5, 0.32]), muscle);
    expect(ev.ok).toBe(true);
    expect(ev.score).toBeLessThan(100);
    expect(ev.score).toBeGreaterThan(70);
  });
});

describe("force bar", () => {
  it("zones and stepping", () => {
    expect(forceZoneOf(0.05)).toBe("none");
    expect(forceZoneOf(0.2)).toBe("light");
    expect(forceZoneOf(0.5)).toBe("medium");
    expect(forceZoneOf(0.8)).toBe("strong");
    expect(forceZoneOf(0.95)).toBe("over");
    expect(stepForce(0, true, 1)).toBeCloseTo(0.35);
    expect(stepForce(0.5, false, 1)).toBeCloseTo(0.05);
    expect(forceZoneOf(0.11)).toBe("none");
    expect(forceZoneOf(0.35)).toBe("medium");
    expect(stepForce(0.1, false, 1)).toBe(0);
    expect(lighterForce("medium")).toBe("light");
    expect(lighterForce("strong")).toBe("medium");
  });
  it("force score = in-zone / total", () => {
    expect(forceScoreOf(3, 4)).toBe(75);
    expect(forceScoreOf(0, 0)).toBe(100);
  });
});

describe("auto zoom / precision", () => {
  it("zoom = ceil(19 / tolPx · 2) / 2 clamped to 1–5", () => {
    expect(autoZoomFor(0.016 * 360)).toBe(3.5); // eye points, 360 px stage
    expect(autoZoomFor(0.016 * 0.7 * 360)).toBe(5); // mastery ×0.7 → 4.7 → 5
    expect(autoZoomFor(19)).toBe(1);
    expect(autoZoomFor(40)).toBe(1);
    expect(autoZoomFor(1)).toBe(5);
    expect(autoZoomFor(9.5)).toBe(2);
    expect(autoZoomFor(null)).toBe(2);
  });
  it("precision mode only when the on-screen tolerance is below finger size", () => {
    expect(needsPrecision(6, 1)).toBe(true);
    expect(needsPrecision(6, autoZoomFor(6))).toBe(false);
    expect(needsPrecision(null, 1)).toBe(false);
  });
});

describe("patience", () => {
  it("full for G seconds, then drains to 0 over another G", () => {
    expect(patienceLeft(0, 40)).toBe(1);
    expect(patienceLeft(40, 40)).toBe(1);
    expect(patienceLeft(60, 40)).toBeCloseTo(0.5);
    expect(patienceLeft(80, 40)).toBe(0);
    expect(patienceLeft(200, 40)).toBe(0);
    expect(patienceLeft(10, 0)).toBe(1);
  });
});
