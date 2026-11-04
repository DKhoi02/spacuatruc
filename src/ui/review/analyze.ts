/**
 * Pure geometry for anh Khôi's exam review: how far (in thốn) the player's first tap landed from the
 * target, on which side, whether it hit a forbidden zone; how a swipe deviated from the stroke direction.
 * Works on VIEW coords (art JSON, normalized on the 1000×1400 frame, not mirrored).
 */
import type { Side, SwipeRecord, TapRecord, TaskItem } from "@/core/types";
import type { ViewData, ViewPoint, ViewZone } from "@/ui/art/assets";
import { angleBetween, inShape, normDist, pointInPolygon, polygonDistance, segDist, FRAME_H, FRAME_W, type Pt, type ShapeLike } from "@/ui/treatment/scoring";

const ASPECT = FRAME_H / FRAME_W;

/** Units per thốn as a fraction of the frame WIDTH, horizontally (x) and vertically (y, aspect-corrected). */
export function cunScale(d: { cun?: unknown; [k: string]: unknown }): { x: number; y: number } | null {
  const c = d.cun as { unitsPerCun?: number | null; unitsPerCunHorizontal?: number; ticksFromAnteriorHairline?: Pt[] } | null | undefined;
  if (!c) return null;
  if (c.unitsPerCun) return { x: c.unitsPerCunHorizontal ?? c.unitsPerCun, y: c.unitsPerCun };
  const t = c.ticksFromAnteriorHairline;
  if (t && t.length >= 2) {
    const u = (Math.abs(t[0][1] - t[t.length - 1][1]) / (t.length - 1)) * ASPECT;
    return { x: u, y: u };
  }
  return null;
}

/**
 * Curved views where a flat scale is crude: the drawing is an orthographic projection of an ellipsoid, so a view
 * point is lifted back onto the surface and distances are measured there (3D chord, in cm → thốn).
 * V03 (đỉnh đầu nhìn từ trên): constants copied from art/_src/v02-v04/gen_v03.py — half-axes XR/YR/ZR (cm),
 * tilt TAU, S px/cm, centre (CX, CY); 1 thốn = (chân tóc trán → chân tóc gáy dọc đường giữa)/12 = 2.860 cm.
 */
interface EllipsoidModel { XR: number; YR: number; ZR: number; tau: number; S: number; CX: number; CY: number; cunCm: number }
export const SURFACE_MODELS: Record<string, EllipsoidModel> = {
  V03: { XR: 8, YR: 10, ZR: 9.5, tau: (25 * Math.PI) / 180, S: 46, CX: 500, CY: 600, cunCm: 2.85998 },
};

/** Lift a view point (normalized frame coords) onto the visible ellipsoid surface; null outside the silhouette. */
export function liftToSurface(m: EllipsoidModel, p: Pt): [number, number, number] | null {
  const X = (p[0] * FRAME_W - m.CX) / m.S, v = (p[1] * FRAME_H - m.CY) / m.S;
  const c = Math.cos(m.tau), s = Math.sin(m.tau);
  // point = (X, -v·s + t·c, v·c + t·s); solve (X/XR)² + (Y/YR)² + (Z/ZR)² = 1 for the larger t (facing the viewer)
  const ay = c / m.YR, by = (-v * s) / m.YR, az = s / m.ZR, bz = (v * c) / m.ZR;
  const A = ay * ay + az * az, B = 2 * (ay * by + az * bz), C = by * by + bz * bz + (X / m.XR) ** 2 - 1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const t = (-B + Math.sqrt(disc)) / (2 * A);
  return [X, -v * s + t * c, v * c + t * s];
}

/** Distance between two view points in thốn (null when the view has no thốn scale). */
export function cunDistance(d: { cun?: unknown; [k: string]: unknown }, a: Pt, b: Pt): number | null {
  const model = typeof d.view === "string" ? SURFACE_MODELS[d.view] : undefined;
  if (model) {
    const A = liftToSurface(model, a), B = liftToSurface(model, b);
    if (A && B) return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) / model.cunCm;
  }
  const s = cunScale(d);
  if (!s) return null;
  return Math.hypot((a[0] - b[0]) / s.x, ((a[1] - b[1]) * ASPECT) / s.y);
}

/** "1,5 thốn" / "nửa thốn" / "chưa tới nửa thốn" (rounded to half thốn). */
export function cunText(cun: number): string {
  if (cun < 0.4) return "chưa tới nửa thốn";
  const h = Math.round(cun * 2) / 2;
  if (h === 0.5) return "khoảng nửa thốn";
  return `khoảng ${String(h).replace(".", ",")} thốn`;
}

const opposite = (s: Side | string): string => (s === "left" ? "right" : s === "right" ? "left" : s);

/** The target point drawn in this view for an item (mirrored views draw the opposite side's art point). */
export function targetPoint(d: ViewData, item: TaskItem, mirrored = false): ViewPoint | undefined {
  if (item.kind !== "point") return undefined;
  const side = mirrored ? opposite(item.side) : item.side;
  return d.points.find((p) => p.id === item.id && p.side === side) ?? d.points.find((p) => p.id === item.id);
}

/** Screen direction words of the miss (tap relative to target), as the player saw it (mirroring flips x). */
export function directionText(tap: Pt, target: Pt, mirrored = false, minFrac = 0.012): string {
  const dx = (tap[0] - target[0]) * (mirrored ? -1 : 1);
  const dy = (tap[1] - target[1]) * ASPECT;
  const parts: string[] = [];
  if (Math.abs(dy) >= minFrac && Math.abs(dy) >= Math.abs(dx) * 0.4) parts.push(dy < 0 ? "cao hơn" : "thấp hơn");
  if (Math.abs(dx) >= minFrac && Math.abs(dx) >= Math.abs(dy) * 0.4) parts.push(dx < 0 ? "lệch sang trái" : "lệch sang phải");
  return parts.join(", ");
}

export interface TapVerdict {
  /** Tap within tolerance of the same point on the customer's other side. */
  wrongSide: boolean;
  /** Message of the forbidden zone the tap landed in. */
  forbidden?: string;
  /** Distance target ↔ tap in thốn (null: view without scale). */
  cun: number | null;
  /** Distance as a fraction of frame width. */
  dist: number;
  /** Tap inside the tolerance radius (good / perfect). */
  inside: boolean;
  direction: string;
}

export function analyzeTap(d: ViewData, item: TaskItem, tap: TapRecord): TapVerdict | null {
  const at: Pt = [tap.x, tap.y];
  const fb = (d.forbidden as unknown as (ShapeLike & { message: string })[]).find((f) => inShape(at, f));
  if (item.kind === "zone") {
    const z = d.zones?.find((x) => x.id === item.id);
    if (!z) return null;
    const polys = zonePolys(z);
    const inside = polys.some((p) => pointInPolygon(at, p));
    const dist = inside ? 0 : Math.min(...polys.map((p) => polygonDistance(at, p)));
    const c = zoneCenter(z);
    return { wrongSide: false, forbidden: fb?.message, cun: inside ? 0 : cunDistance(d, at, nearestOnPolys(at, polys)), dist, inside, direction: inside ? "" : directionText(at, c, tap.mirrored) };
  }
  const t = targetPoint(d, item, tap.mirrored);
  if (!t) return null;
  const dist = normDist(at, [t.x, t.y]);
  const other = !tap.mirrored && item.kind === "point" ? d.points.find((p) => p.id === item.id && p.side === opposite(item.side) && p.side !== item.side) : undefined;
  const wrongSide = !!other && dist > t.r && normDist(at, [other.x, other.y]) <= Math.max(t.r, other.r) * 1.6;
  return { wrongSide, forbidden: fb?.message, cun: cunDistance(d, at, [t.x, t.y]), dist, inside: dist <= t.r, direction: directionText(at, [t.x, t.y], tap.mirrored) };
}

export const zonePolys = (z: ViewZone): Pt[][] => (z.polygons && z.polygons.length ? z.polygons : [z.polygon]) as Pt[][];
export function zoneCenter(z: ViewZone): Pt {
  const pts = zonePolys(z)[0];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}
function nearestOnPolys(p: Pt, polys: Pt[][]): Pt {
  let best: Pt = polys[0][0], bd = Infinity;
  for (const poly of polys) for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const d = segDist(p, a, b);
    if (d < bd) { bd = d; best = nearestOnSegment(p, a, b); }
  }
  return best;
}

export interface SwipeVerdict {
  /** Angle between the swipe and the nearest correct stroke (degrees, 0 = same direction, 180 = reversed). */
  angle: number;
  reversed: boolean;
  /** Swipe midpoint inside the muscle. */
  onMuscle: boolean;
  /** The nearest correct stroke (view coords). */
  stroke: { from: Pt; to: Pt };
  /** Distance of the swipe's midpoint from that stroke line (the muscle's centre line), in thốn (null: no scale). */
  cun: number | null;
  /** Screen direction of the swipe relative to the stroke line ("lệch sang trái"...). */
  direction: string;
}

/** Nearest point of segment ab to p (aspect-corrected projection, view coords). */
export function nearestOnSegment(p: Pt, a: Pt, b: Pt): Pt {
  const ax = a[0], ay = a[1] * ASPECT, bx = b[0], by = b[1] * ASPECT, px = p[0], py = p[1] * ASPECT;
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
  return [ax + t * vx, (ay + t * vy) / ASPECT];
}

export function analyzeSwipe(d: ViewData, item: TaskItem, sw: SwipeRecord): SwipeVerdict | null {
  if (item.kind !== "muscle") return null;
  const side = sw.mirrored ? opposite(item.side) : item.side;
  const m = d.muscles.find((x) => x.id === item.id && x.side === side) ?? d.muscles.find((x) => x.id === item.id);
  if (!m || !m.strokes.length) return null;
  const a: Pt = [sw.from.x, sw.from.y], b: Pt = [sw.to.x, sw.to.y];
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let best = m.strokes[0], bd = Infinity;
  for (const s of m.strokes) { const dd = segDist(mid, s.from, s.to); if (dd < bd) { bd = dd; best = s; } }
  const angle = angleBetween([b[0] - a[0], b[1] - a[1]], [best.to[0] - best.from[0], best.to[1] - best.from[1]]);
  const onMuscle = pointInPolygon(mid, m.polygon as Pt[]) || polygonDistance(mid, m.polygon as Pt[]) < 0.012;
  const near = nearestOnSegment(mid, best.from as Pt, best.to as Pt);
  return {
    angle: Math.round(angle), reversed: angle > 135, onMuscle, stroke: { from: best.from as Pt, to: best.to as Pt },
    cun: cunDistance(d, mid, near), direction: directionText(mid, near, sw.mirrored),
  };
}
