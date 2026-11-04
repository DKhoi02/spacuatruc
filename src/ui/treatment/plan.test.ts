import { describe, expect, it } from "vitest";
import type { ViewData } from "@/ui/art/assets";
import { planFor } from "./plan";

const base = { title: "", svg: "", frame: { width: 1000, height: 1400 }, muscles: [], forbidden: [] };
const V01 = { ...base, view: "V01", screenLeftIs: "customer-right", points: [
  { id: "BL2", name: "Toản Trúc", side: "right", x: 0.446, y: 0.42, r: 0.02 },
  { id: "BL2", name: "Toản Trúc", side: "left", x: 0.554, y: 0.42, r: 0.02 },
] } as unknown as ViewData;
const V07 = { ...base, view: "V07", mirrorable: true, drawnSide: "right", points: [
  { id: "LI4", name: "Hợp Cốc", side: "right", x: 0.3, y: 0.6, r: 0.03 },
] } as unknown as ViewData;
const V12 = { ...base, view: "V12", mirrorable: true, drawnSide: "right", points: [], zones: [
  { id: "kidneys", name: "", bodyArea: "Thận", onlyFoot: null, polygon: [[0.4, 0.5], [0.5, 0.5], [0.5, 0.6]] },
] } as unknown as ViewData;
const all = [V01, V07, V12];

describe("planFor", () => {
  it("uses the exact side on non-mirrorable views", () => {
    const p = planFor({ kind: "point", id: "BL2", side: "left" }, all);
    expect(p?.kind === "point" && p.target.x).toBe(0.554);
    expect(p?.mirrored).toBe(false);
  });
  it("mirrors a limb view for the other side", () => {
    expect(planFor({ kind: "point", id: "LI4", side: "right" }, all)?.mirrored).toBe(false);
    const p = planFor({ kind: "point", id: "LI4", side: "left" }, all);
    expect(p?.mirrored).toBe(true);
    expect(p?.view).toBe("V07");
  });
  it("mirrors the sole for the left foot", () => {
    expect(planFor({ kind: "zone", id: "kidneys", foot: "left" }, all)?.mirrored).toBe(true);
    expect(planFor({ kind: "zone", id: "kidneys", foot: "right" }, all)?.mirrored).toBe(false);
  });
});
