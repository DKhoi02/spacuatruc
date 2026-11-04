/**
 * Force-bar human model (balance tooling). Mirrors the hold loop in src/ui/treatment/PointTask.tsx:
 * needle rises while pressed / falls when released (stepForce), "started" at the first frame in the
 * required zone, forceScore = in-zone time / time since started, done when in-zone time ≥ seconds,
 * over-force = needle above the zone's upper bound for > 0.25 s in a row (safety error on sensitive points).
 *
 * The simulated human sees the needle with a reaction delay (200–300 ms, resampled at every switch),
 * optionally extrapolates the needle's motion (anticipation), aims for a band inside the zone and has
 * motor jitter + a minimum press/release duration.
 */
import { makeRng, type Rng } from "../rng";

export type Zone = [number, number];
export interface ForceParams { rise: number; fall: number; zones: Record<"light" | "medium" | "strong", Zone>; overGrace: number }
export interface Human {
  /** reaction delay range (s) */
  delay: [number, number];
  /** 0 = reacts to what it sees, 1 = perfectly extrapolates the needle by its own delay */
  anticipation: number;
  /** aim band inside the zone as fractions of the zone width from each edge */
  margin: number;
  /** motor timing noise sd (s) and minimum press / release duration (s) */
  jitter: number; minHold: number;
}

export const HUMANS: Record<"beginner" | "casual" | "attentive" | "expert", Human> = {
  casual: { delay: [0.22, 0.3], anticipation: 0.25, margin: 0.3, jitter: 0.045, minHold: 0.09 },
  beginner: { delay: [0.24, 0.32], anticipation: 0, margin: 0.3, jitter: 0.05, minHold: 0.1 },
  attentive: { delay: [0.2, 0.3], anticipation: 0.5, margin: 0.3, jitter: 0.035, minHold: 0.08 },
  expert: { delay: [0.18, 0.24], anticipation: 0.8, margin: 0.3, jitter: 0.02, minHold: 0.06 },
};

export interface ForceRun { score: number; time: number; overEvents: number; maxOver: number }

export function simulateHold(p: ForceParams, h: Human, force: "light" | "medium" | "strong", seconds: number, rng: Rng): ForceRun {
  const dt = 1 / 60;
  const [lo, hi] = p.zones[force];
  const w = hi - lo;
  const aimLo = lo + h.margin * w, aimHi = hi - h.margin * w;
  const hist: number[] = [];
  let v = 0, pressed = false, t = 0, started = false, total = 0, inZone = 0, over = 0, overEvents = 0, overCounted = false, maxOver = 0;
  let delay = h.delay[0] + rng.next() * (h.delay[1] - h.delay[0]);
  let lastSwitch = -1;
  let pendingAt = -1, pendingState = false;
  for (let guard = 0; guard < 60 * 60; guard++) {
    // perception (delayed + extrapolated)
    const k = Math.max(0, hist.length - 1 - Math.round(delay / dt));
    const seen = hist.length ? hist[k] : 0;
    const vel: number = pressed ? p.rise : -p.fall; // the player knows what their finger is doing
    const est: number = seen + h.anticipation * vel * delay;
    // decision with hysteresis; an intended switch executes after jitter, not earlier than minHold
    const want: boolean = pressed ? !(est >= aimHi) : est <= aimLo;
    if (want !== pressed && pendingAt < 0 && t - lastSwitch >= h.minHold) {
      pendingAt = t + Math.max(0, gauss(rng) * h.jitter);
      pendingState = want;
    }
    if (pendingAt >= 0 && t >= pendingAt) {
      pressed = pendingState; pendingAt = -1; lastSwitch = t;
      delay = h.delay[0] + rng.next() * (h.delay[1] - h.delay[0]);
    }
    // physics (same as stepForce)
    v = Math.max(0, Math.min(1, v + (pressed ? p.rise : -p.fall) * dt));
    hist.push(v);
    t += dt;
    const inside = v >= lo && v < hi;
    if (inside) started = true;
    if (started) { total += dt; if (inside) inZone += dt; }
    if (v > hi) {
      over += dt; maxOver = Math.max(maxOver, over);
      if (over > p.overGrace && !overCounted) { overEvents++; overCounted = true; }
    } else over = 0;
    if (inZone >= seconds) break;
  }
  return { score: total > 0 ? Math.round((inZone / total) * 100) : 100, time: t, overEvents, maxOver };
}

function gauss(r: Rng): number {
  const u = Math.max(1e-9, r.next()), v = r.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface ForceStats { meanScore: number; p10Score: number; pass80: number; meanTime: number; overRate: number }

export function forceStats(p: ForceParams, h: Human, force: "light" | "medium" | "strong", seconds: number, n = 400, seed = 1): ForceStats {
  const rng = makeRng(seed);
  const runs = Array.from({ length: n }, () => simulateHold(p, h, force, seconds, rng));
  const scores = runs.map((r) => r.score).sort((a, b) => a - b);
  return {
    meanScore: scores.reduce((a, b) => a + b, 0) / n,
    p10Score: scores[Math.floor(n * 0.1)],
    pass80: scores.filter((x) => x >= 80).length / n,
    meanTime: runs.reduce((a, r) => a + r.time, 0) / n,
    overRate: runs.filter((r) => r.overEvents > 0).length / n,
  };
}
