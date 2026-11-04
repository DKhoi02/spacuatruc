import type { Customer, ItemResult, TreatmentResult } from "./types";
import { C, acupoint } from "./content";

export function scorePosition(distance: number, r: number): { score: number; grade: "perfect" | "good" | "miss" } {
  const cfg = C().CONFIG;
  if (distance <= r * cfg.positionThresholds.perfectFrac) return { score: cfg.positionScores.perfect, grade: "perfect" };
  if (distance <= r * cfg.positionThresholds.goodFrac) return { score: cfg.positionScores.good, grade: "good" };
  return { score: cfg.positionScores.miss, grade: "miss" };
}

/** Item score: swipe → swipeScore; with force → 60% position + 40% force; else position (chapter 1). */
export function itemScore(r: { positionScore: number; forceScore?: number; swipeScore?: number }): number {
  if (r.swipeScore !== undefined) return r.swipeScore;
  if (r.forceScore !== undefined) {
    const w = C().CONFIG.forceWeight;
    return (1 - w) * r.positionScore + w * r.forceScore;
  }
  return r.positionScore;
}

export function toleranceRadius(r: number, level: number): number {
  return level >= 4 ? r * C().CONFIG.masteredToleranceScale : r;
}

export function starsFor(score: number, safetyErrors: number): 1 | 2 | 3 {
  if (safetyErrors > 0) return 1;
  const t = C().CONFIG.starThresholds;
  return score >= t.three ? 3 : score >= t.two ? 2 : 1;
}

/** Is this point contraindicated / caution for the customer's health profile? */
export function pregnancyFlag(it: ItemResult["item"]): "contraindicated" | "caution" | undefined {
  return it.kind === "point" ? acupoint(it.id)?.pregnancy : undefined;
}

export interface ScoredItem { result: ItemResult; score: number; safetyErrors: number; skippedOk: boolean }

/**
 * Score every item. With a known customer: skipping a contraindicated/caution item on a pregnant
 * customer = 100, performing a contraindicated one = at least 1 safety error. Skipping anything else = 0.
 * Without a customer (public serviceScore), a skipped item is trusted as correct only if the point has a pregnancy flag.
 */
export function scoreItems(result: TreatmentResult, customer?: Customer): ScoredItem[] {
  const pregnant = customer ? customer.health?.id === "pregnant" : undefined;
  return result.items.map((r) => {
    const flag = pregnancyFlag(r.item);
    const relevant = flag !== undefined && (pregnant === undefined ? true : pregnant);
    if (r.skipped) {
      const ok = relevant;
      return { result: r, score: ok ? 100 : 0, safetyErrors: r.safetyErrors, skippedOk: ok };
    }
    let safety = r.safetyErrors;
    if (pregnant && flag === "contraindicated" && safety === 0) safety = 1;
    return { result: r, score: itemScore(r), safetyErrors: safety, skippedOk: false };
  });
}

export function scoreService(result: TreatmentResult, customer?: Customer): { score: number; stars: 1 | 2 | 3; safetyErrors: number; items: ScoredItem[] } {
  const items = scoreItems(result, customer);
  const safetyErrors = items.reduce((a, i) => a + i.safetyErrors, 0);
  const mean = items.length ? items.reduce((a, i) => a + i.score, 0) / items.length : 100;
  const score = Math.max(0, Math.min(100, Math.round(mean - C().CONFIG.safetyErrorPenalty * safetyErrors)));
  return { score, stars: starsFor(score, safetyErrors), safetyErrors, items };
}

export function serviceScore(result: TreatmentResult): { score: number; stars: 1 | 2 | 3; safetyErrors: number } {
  const { score, stars, safetyErrors } = scoreService(result);
  return { score, stars, safetyErrors };
}
