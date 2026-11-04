/**
 * Art geometry sanity checks for the tap targets in art/views/V*.json (normalized 1000×1400 frame, `r` as a width fraction):
 * - every point lies inside the frame;
 * - no two point tolerance circles that can be visible in the same variant state overlap
 *   (a tap there would be ambiguous);
 * - no point's tolerance circle touches a forbidden shape (circle / ellipse / polygon).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Pt = [number, number];
interface Point { id: string; side: string; x: number; y: number; r: number; variant?: string | null }
interface Forbidden { id: string; shape: "circle" | "ellipse" | "polygon"; x?: number; y?: number; r?: number; rx?: number; ry?: number; points?: Pt[] }
interface View { view: string; points: Point[]; forbidden?: Forbidden[]; variants?: Record<string, string[]> }

const ASPECT = 1.4;
const DIR = join(__dirname, "../../art/views");
const views: View[] = readdirSync(DIR)
  .filter((f) => /^V\d+\.json$/.test(f))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as View);

/** Distance in width-fraction units (y scaled by the frame aspect). */
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], (a[1] - b[1]) * ASPECT);

function inPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function segDist(p: Pt, a: Pt, b: Pt): number {
  const px = p[0], py = p[1] * ASPECT, ax = a[0], ay = a[1] * ASPECT, bx = b[0], by = b[1] * ASPECT;
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

/** Does the circle (c, r) intersect the forbidden shape? Ellipse: rx = width fraction, ry = height fraction. */
function circleHitsShape(c: Pt, r: number, f: Forbidden): boolean {
  if (f.shape === "circle") return dist(c, [f.x ?? 0, f.y ?? 0]) < r + (f.r ?? 0);
  if (f.shape === "polygon") {
    const poly = f.points ?? [];
    if (inPolygon(c, poly)) return true;
    return poly.some((q, i) => segDist(c, poly[(i + poly.length - 1) % poly.length], q) < r);
  }
  const rx = f.rx ?? f.r ?? 0, ry = f.ry ?? f.r ?? 0;
  if (rx <= 0 || ry <= 0) return false;
  // Sample the disc (center + rings) against the ellipse equation.
  for (const k of [0, 0.5, 1]) {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const x = c[0] + Math.cos(a) * r * k, y = c[1] + (Math.sin(a) * r * k) / ASPECT;
      const nx = (x - (f.x ?? 0)) / rx, ny = (y - (f.y ?? 0)) / ry;
      if (nx * nx + ny * ny <= 1) return true;
    }
  }
  return false;
}

/** Two variant-bound points are never visible together when their variants are different options of one category. */
function coVisible(v: View, a: Point, b: Point): boolean {
  if (!a.variant || !b.variant || a.variant === b.variant) return true;
  const cat = (n: string) => Object.entries(v.variants ?? {}).find(([, names]) => names.includes(n))?.[0];
  const ca = cat(a.variant), cb = cat(b.variant);
  return !(ca && ca === cb);
}

describe("art view geometry", () => {
  it("found the view JSON files", () => {
    expect(views.length).toBeGreaterThanOrEqual(12);
  });

  for (const v of views) {
    describe(v.view, () => {
      it("every point lies inside the frame with a positive radius", () => {
        const bad = v.points.filter((p) => !(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 && p.r > 0)).map((p) => `${p.id}/${p.side}`);
        expect(bad).toEqual([]);
      });

      it("no two co-visible point tolerance circles overlap", () => {
        const bad: string[] = [];
        for (let i = 0; i < v.points.length; i++) {
          for (let j = i + 1; j < v.points.length; j++) {
            const a = v.points[i], b = v.points[j];
            if (!coVisible(v, a, b)) continue;
            const d = dist([a.x, a.y], [b.x, b.y]);
            if (d < a.r + b.r) bad.push(`${a.id}/${a.side} ↔ ${b.id}/${b.side} (d=${d.toFixed(4)} < ${(a.r + b.r).toFixed(4)})`);
          }
        }
        expect(bad).toEqual([]);
      });

      it("no point tolerance circle touches a forbidden shape", () => {
        const bad: string[] = [];
        for (const p of v.points) for (const f of v.forbidden ?? []) if (circleHitsShape([p.x, p.y], p.r, f)) bad.push(`${p.id}/${p.side} ↔ ${f.id}`);
        expect(bad).toEqual([]);
      });
    });
  }
});
