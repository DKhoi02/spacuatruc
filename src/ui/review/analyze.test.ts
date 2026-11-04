import { describe, it, expect } from "vitest";
import type { ViewData } from "@/ui/art/assets";
import V01 from "@art/views/V01.json";
import V03 from "@art/views/V03.json";
import V04 from "@art/views/V04.json";
import V05 from "@art/views/V05.json";
import V07 from "@art/views/V07.json";
import V02 from "@art/views/V02.json";
import { analyzeSwipe, analyzeTap, cunDistance, cunScale, cunText, directionText, liftToSurface, SURFACE_MODELS, targetPoint } from "./analyze";

const v = (x: unknown) => x as ViewData;

describe("review geometry", () => {
  it("thốn scale per view", () => {
    expect(cunScale(v(V01))).toEqual({ x: 0.06, y: 0.06 });
    expect(cunScale(v(V04))).toEqual({ x: 0.0527, y: 0.097 });
    expect(cunScale(v(V03))!.x).toBeGreaterThan(0.08); // from the hairline ticks (fallback)
    expect(cunScale(v(V05))).toEqual({ x: 0.086, y: 0.086 });
    expect(cunDistance({ cun: null }, [0, 0], [1, 1])).toBeNull();
  });
  it("cun distance uses the view's scale (aspect-corrected, V04 anisotropic)", () => {
    expect(cunDistance(v(V01), [0.5, 0.5], [0.56, 0.5])).toBeCloseTo(1);
    expect(cunDistance(v(V01), [0.5, 0.5], [0.5, 0.5 + 0.12 / 1.4])).toBeCloseTo(2);
    expect(cunDistance(v(V04), [0.5, 0.5], [0.5 + 0.0527, 0.5])).toBeCloseTo(1);
    expect(cunDistance(v(V04), [0.5, 0.5], [0.5, 0.5 + 0.097 / 1.4])).toBeCloseTo(1);
  });
  it("cun text rounds to half thốn", () => {
    expect(cunText(0.2)).toBe("chưa tới nửa thốn");
    expect(cunText(0.55)).toBe("khoảng nửa thốn");
    expect(cunText(1.4)).toBe("khoảng 1,5 thốn");
    expect(cunText(2.1)).toBe("khoảng 2 thốn");
  });
  it("direction words follow the screen (mirroring flips left/right)", () => {
    expect(directionText([0.5, 0.4], [0.5, 0.5])).toBe("cao hơn");
    expect(directionText([0.6, 0.5], [0.5, 0.5])).toBe("lệch sang phải");
    expect(directionText([0.6, 0.5], [0.5, 0.5], true)).toBe("lệch sang trái");
    expect(directionText([0.4, 0.6], [0.5, 0.5])).toBe("thấp hơn, lệch sang trái");
  });
  it("tap 1 thốn beside Toản Trúc (BL2 left)", () => {
    const item = { kind: "point", id: "BL2", side: "left" } as const;
    const t = targetPoint(v(V01), item)!;
    const r = analyzeTap(v(V01), item, { view: "V01", x: t.x + 0.06, y: t.y })!;
    expect(r.cun).toBeCloseTo(1);
    expect(r.wrongSide).toBe(false);
    expect(r.inside).toBe(false);
  });
  it("detects the wrong side and forbidden zones", () => {
    const item = { kind: "point", id: "BL2", side: "left" } as const;
    const other = targetPoint(v(V01), { ...item, side: "right" })!;
    expect(analyzeTap(v(V01), item, { view: "V01", x: other.x, y: other.y })!.wrongSide).toBe(true);
    const eye = (V01.forbidden as { id: string; x: number; y: number }[]).find((f) => f.id === "eyeball-left")!;
    expect(analyzeTap(v(V01), item, { view: "V01", x: eye.x, y: eye.y })!.forbidden).toBeTruthy();
  });
  it("mirrored limb view: target is the drawn (opposite) side, distance in that view's thốn", () => {
    const item = { kind: "point", id: "LI4", side: "left" } as const; // V07 draws the right hand → mirrored
    const t = targetPoint(v(V07), item, true)!;
    expect(t.side).toBe("right");
    const r = analyzeTap(v(V07), item, { view: "V07", x: t.x, y: t.y + 0.1 / 1.4, mirrored: true })!;
    expect(r.cun).toBeCloseTo(1);
    expect(r.wrongSide).toBe(false);
    expect(r.direction).toBe("thấp hơn");
  });
  it("V03 (top of head): distances measured on the head surface", () => {
    const pts = V03.points as { id: string; side: string; x: number; y: number }[];
    const P = (id: string, side: string): [number, number] => { const p = pts.find((q) => q.id === id && q.side === side)!; return [p.x, p.y]; };
    // Tứ Thần Thông = 1 thốn around Bách Hội (front/back along the midline, left/right along the coronal arc)
    for (const side of ["front", "back", "left", "right"]) expect(cunDistance(v(V03), P("GV20", "center"), P("EX-HN1", side))!).toBeCloseTo(1, 1);
    // Thần Đình (0,5 thốn) → Bách Hội (5 thốn) along the midline: 4,5 thốn of arc ≈ 4,3 thốn chord
    const d = cunDistance(v(V03), P("GV24", "center"), P("GV20", "center"))!;
    expect(d).toBeGreaterThan(4.1); expect(d).toBeLessThan(4.5);
    expect(liftToSurface(SURFACE_MODELS.V03, [0.01, 0.01])).toBeNull(); // outside the head → flat fallback
    expect(cunDistance(v(V03), [0.01, 0.01], [0.02, 0.01])).not.toBeNull();
  });
  it("V05 neck swipe beside the SCM: offset from the centre line in thốn", () => {
    const m = (V05.muscles as { id: string; side: string; strokes: { from: number[]; to: number[] }[] }[]).find((x) => x.id === "sternocleidomastoid")!;
    const s = m.strokes[0];
    const item = { kind: "muscle", id: m.id, side: m.side } as never;
    const dx = 0.086; // 1 thốn to the side
    const r = analyzeSwipe(v(V05), item, { view: "V05", from: { x: s.from[0] + dx, y: s.from[1] }, to: { x: s.to[0] + dx, y: s.to[1] }, issue: "outside" })!;
    expect(r.cun!).toBeGreaterThan(0.8); expect(r.cun!).toBeLessThan(1.01);
    expect(r.direction).toBe("lệch sang phải");
  });
  it("every view with targets has a thốn scale", () => {
    const all = import.meta.glob("@art/views/V*.json", { eager: true, import: "default" }) as Record<string, ViewData>;
    expect(Object.keys(all).length).toBeGreaterThan(10);
    for (const d of Object.values(all)) {
      if (!d.points.length && !d.muscles.length && !(d.zones ?? []).length) continue;
      expect(cunScale(d), d.view).not.toBeNull();
    }
  });
  it("swipe against the stroke is reversed", () => {
    const m = (V02.muscles as { id: string; side: string; strokes: { from: number[]; to: number[] }[] }[])[0];
    const s = m.strokes[0];
    const item = { kind: "muscle", id: m.id, side: m.side } as never;
    const rev = analyzeSwipe(v(V02), item, { view: "V02", from: { x: s.to[0], y: s.to[1] }, to: { x: s.from[0], y: s.from[1] }, issue: "direction" })!;
    expect(rev.reversed).toBe(true);
    expect(rev.onMuscle).toBe(true);
    const ok = analyzeSwipe(v(V02), item, { view: "V02", from: { x: s.from[0], y: s.from[1] }, to: { x: s.to[0], y: s.to[1] } })!;
    expect(ok.angle).toBe(0);
  });
});
