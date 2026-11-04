/**
 * Local, pure scoring + geometry helpers for the treatment minigame.
 * They follow the same rules as core (docs/GAME_DESIGN.md §5) so the lead can later swap them
 * for `scorePosition` / `toleranceRadius` / `itemScore` from "@/core/api".
 *
 * Coordinates: art JSON is normalized 0–1 on a 1000×1400 frame. To measure real distances we work in
 * "frame units" (x·1000, y·1400) and express distances as a fraction of the WIDTH (like `r`).
 */
export type Pt = [number, number];

export const FRAME_W = 1000;
export const FRAME_H = 1400;
const ASPECT = FRAME_H / FRAME_W;

export type Grade = "perfect" | "good" | "miss";

/** distance and r in the same normalized (width-fraction) units. */
export function scorePosition(distance: number, r: number): { score: number; grade: Grade } {
  if (distance <= r / 3) return { score: 100, grade: "perfect" };
  if (distance <= r) return { score: 70, grade: "good" };
  return { score: 0, grade: "miss" };
}

/** Tolerance radius after mastery scaling (level 4 → ×0.7). */
export function toleranceRadius(r: number, level: number): number {
  return level >= 4 ? r * 0.7 : r;
}

/** Item score 0–100: chapter 1 = position; with force = 60/40; swipe items = swipe score. */
export function itemScore(r: { positionScore: number; forceScore?: number; swipeScore?: number; skipped?: boolean }): number {
  if (r.skipped) return 0;
  if (r.swipeScore !== undefined) return Math.round(r.swipeScore);
  if (r.forceScore !== undefined) return Math.round(r.positionScore * 0.6 + r.forceScore * 0.4);
  return Math.round(r.positionScore);
}

/** Distance between two normalized points, as a fraction of frame width (aspect corrected). */
export function normDist(a: Pt, b: Pt): number {
  const dx = a[0] - b[0];
  const dy = (a[1] - b[1]) * ASPECT;
  return Math.hypot(dx, dy);
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from p to a segment, width-fraction units. */
export function segDist(p: Pt, a: Pt, b: Pt): number {
  const px = p[0], py = p[1] * ASPECT, ax = a[0], ay = a[1] * ASPECT, bx = b[0], by = b[1] * ASPECT;
  const vx = bx - ax, vy = by - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

/** 0 if inside, else distance to the polygon edge (width-fraction). */
export function polygonDistance(p: Pt, poly: Pt[]): number {
  if (pointInPolygon(p, poly)) return 0;
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(p, poly[j], poly[i]));
  return d;
}

export interface ShapeLike { shape: "ellipse" | "circle" | "polygon"; x?: number; y?: number; r?: number; rx?: number; ry?: number; points?: Pt[] }

/**
 * Hit test for forbidden shapes. Convention (art JSON): circle `r` and ellipse `rx` are width fractions,
 * ellipse `ry` is a height fraction (matches how the art scripts emit them: rx/1000, ry/1400).
 */
export function inShape(p: Pt, s: ShapeLike): boolean {
  if (s.shape === "polygon") return !!s.points && pointInPolygon(p, s.points);
  const cx = s.x ?? 0, cy = s.y ?? 0;
  if (s.shape === "circle") return normDist(p, [cx, cy]) <= (s.r ?? 0);
  const rx = s.rx ?? s.r ?? 0, ry = s.ry ?? s.r ?? 0;
  if (rx <= 0 || ry <= 0) return false;
  const nx = (p[0] - cx) / rx, ny = (p[1] - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

export function mirrorPt(p: Pt): Pt {
  return [1 - p[0], p[1]];
}

/** Angle in degrees between two vectors given in normalized coords (aspect corrected). */
export function angleBetween(a: Pt, b: Pt): number {
  const ax = a[0], ay = a[1] * ASPECT, bx = b[0], by = b[1] * ASPECT;
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (la === 0 || lb === 0) return 180;
  const c = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
  return (Math.acos(c) * 180) / Math.PI;
}

export interface StrokeLike { from: Pt; to: Pt }

export interface SwipeEval {
  ok: boolean;
  score: number;
  reason?: "short" | "outside" | "direction" | "tooShort";
  stroke: StrokeLike;
  angle: number;
  insideFrac: number;
  lengthRatio: number;
}

/**
 * Evaluate a swipe against a muscle: inside polygon (≥ 70% of samples), angle to the nearest stroke ≤ maxAngleDeg,
 * length ≥ minLengthRatio × stroke length. Score 100 minus small penalties for angle and length.
 */
export function evaluateSwipe(
  samples: Pt[],
  muscle: { polygon: Pt[]; polygons?: Pt[][]; strokes: StrokeLike[]; maxAngleDeg: number; minLengthRatio: number },
): SwipeEval {
  const start = samples[0];
  const end = samples[samples.length - 1];
  const mid: Pt = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
  let best = muscle.strokes[0];
  let bestD = Infinity;
  for (const s of muscle.strokes) {
    const d = segDist(mid, s.from, s.to);
    if (d < bestD) { bestD = d; best = s; }
  }
  const polys = muscle.polygons && muscle.polygons.length ? muscle.polygons : [muscle.polygon];
  const inside = samples.filter((p) => polys.some((poly) => pointInPolygon(p, poly) || polygonDistance(p, poly) < 0.012)).length;
  const insideFrac = samples.length ? inside / samples.length : 0;
  const swipeLen = normDist(start, end);
  const strokeLen = normDist(best.from, best.to);
  const lengthRatio = strokeLen > 0 ? swipeLen / strokeLen : 0;
  const angle = angleBetween([end[0] - start[0], end[1] - start[1]], [best.to[0] - best.from[0], best.to[1] - best.from[1]]);
  const base = { stroke: best, angle, insideFrac, lengthRatio };
  if (swipeLen < 0.03) return { ok: false, score: 0, reason: "short", ...base };
  if (insideFrac < 0.7) return { ok: false, score: 0, reason: "outside", ...base };
  if (angle > muscle.maxAngleDeg) return { ok: false, score: 0, reason: "direction", ...base };
  if (lengthRatio < muscle.minLengthRatio) return { ok: false, score: 0, reason: "tooShort", ...base };
  const anglePenalty = 25 * (angle / Math.max(1, muscle.maxAngleDeg));
  const lengthPenalty = lengthRatio >= 1 ? 0 : 15 * ((1 - lengthRatio) / Math.max(0.01, 1 - muscle.minLengthRatio));
  return { ok: true, score: Math.max(0, Math.round(100 - anglePenalty - lengthPenalty)), ...base };
}

// ── Force bar ──
export type ForceLevel = "light" | "medium" | "strong";
/** Needle range 0–1. Below `light[0]` = no effect; above `strong[1]` = over-force for everyone. */
export const FORCE_ZONES: Record<ForceLevel, [number, number]> = {
  light: [0.12, 0.34],
  medium: [0.34, 0.64],
  strong: [0.64, 0.9],
};
export const FORCE_RISE_PER_S = 0.35;
export const FORCE_FALL_PER_S = 0.45;

export function lighterForce(f: ForceLevel): ForceLevel {
  return f === "strong" ? "medium" : "light";
}

export function forceZoneOf(v: number): ForceLevel | "none" | "over" {
  if (v < FORCE_ZONES.light[0]) return "none";
  if (v < FORCE_ZONES.light[1]) return "light";
  if (v < FORCE_ZONES.medium[1]) return "medium";
  if (v < FORCE_ZONES.strong[1]) return "strong";
  return "over";
}

export function stepForce(v: number, pressed: boolean, dt: number): number {
  const n = v + (pressed ? FORCE_RISE_PER_S : -FORCE_FALL_PER_S) * dt;
  return Math.max(0, Math.min(1, n));
}

/** Force score = in-zone time / total time (counted from first time the needle reached the zone). */
export function forceScoreOf(inZone: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round(Math.max(0, Math.min(1, inZone / total)) * 100);
}

export function average(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Deterministic hash → [0,1). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

// ── Fingertip precision ──
/** On-screen tolerance (CSS px) a real fingertip needs for ~85% hits (≈ 2σ with σ ≈ 2.5 mm ≈ 9.5 px). */
export const FINGER_TOL_PX = 19;
export const MAX_ZOOM = 5;

/** Zoom that makes a target with `tolPx` (on-screen tolerance at 1×) finger-sized: ceil to 0.5 steps, clamped 1–5. */
export function autoZoomFor(tolPx: number | null | undefined): number {
  if (!tolPx || !(tolPx > 0)) return 2;
  const need = FINGER_TOL_PX / tolPx;
  return Math.max(1, Math.min(MAX_ZOOM, Math.ceil(need * 2 - 1e-9) / 2));
}

/** Precision (reticle) mode default: on when the on-screen tolerance at the current zoom is below finger size. */
export function needsPrecision(tolPx: number | null | undefined, zoom: number): boolean {
  return !!tolPx && zoom * tolPx < FINGER_TOL_PX;
}

// ── Patience ──
/** In-service patience 0–1: full for the first G working seconds, then linear to 0 over another G. */
export function patienceLeft(elapsed: number, g: number): number {
  if (!(g > 0)) return 1;
  return Math.max(0, Math.min(1, 1 - Math.max(0, elapsed - g) / g));
}
