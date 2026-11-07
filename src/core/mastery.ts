import type { Customer, GameState, ItemKey, MasteryRecord, TaskItem, TreatmentConfig } from "./types";
import { C, serviceDef } from "./content";
import { keyOf, learnedItems, hasFeature } from "./chapters";
import type { ScoredItem } from "./scoring";
import { meta } from "./util";

export function itemKey(item: TaskItem | { kind: "point" | "muscle" | "zone"; id: string }): ItemKey {
  return keyOf(item);
}

export function defaultMastery(): MasteryRecord {
  return { level: 0, streak: 0, attempts: 0, correct: 0, lastSeenDay: 0, dueDay: 0, intervalIdx: 0 };
}

export function getMastery(s: GameState, key: ItemKey): MasteryRecord {
  return s.mastery[key] ? { ...s.mastery[key] } : defaultMastery();
}

export function hintLevelFor(s: GameState, key: ItemKey, examMode: boolean): 0 | 1 | 2 | 3 | 4 {
  if (examMode) return 3;
  return getMastery(s, key).level;
}

/** Tracked (mastery) items: points, muscles, zones. Care steps are not tracked. */
export const isTracked = (it: TaskItem) => it.kind !== "step";

/**
 * Apply one practice result to a mastery record (mutates state).
 * Rules: level 0 (new) → 1 after the first attempt (intro seen); otherwise 3 consecutive correct
 * (score ≥ 70) at the current level → level+1; any miss → level−1 (never below 1 once seen).
 * SRS: correct → next interval, wrong → interval 0.
 */
export function applyPractice(s: GameState, key: ItemKey, correct: boolean): void {
  const cfg = C().CONFIG;
  const m = getMastery(s, key);
  m.attempts++;
  if (correct) m.correct++;
  if (m.level === 0) {
    m.level = 1;
    m.streak = 0;
  } else if (correct) {
    m.streak++;
    if (m.streak >= cfg.masteryUpStreak && m.level < 4) { m.level = (m.level + 1) as MasteryRecord["level"]; m.streak = 0; }
  } else {
    m.level = Math.max(1, m.level - 1) as MasteryRecord["level"];
    m.streak = 0;
  }
  const iv = cfg.srsIntervals;
  if (correct) {
    m.intervalIdx = m.lastSeenDay === 0 ? 0 : Math.min(iv.length - 1, m.intervalIdx + (m.dueDay <= s.day ? 1 : 0));
  } else m.intervalIdx = 0;
  m.dueDay = s.day + iv[m.intervalIdx];
  m.lastSeenDay = s.day;
  s.mastery[key] = m;
  const p = meta(s).practice;
  const cur = p[key] ?? [0, 0];
  p[key] = [cur[0] + (correct ? 1 : 0), cur[1] + 1];
}

/** Update mastery from a scored treatment. Sides of one item are aggregated: correct only if all sides ≥ 70. */
export function applyScoredItems(s: GameState, items: ScoredItem[]): void {
  const agg = new Map<ItemKey, boolean>();
  for (const it of items) {
    if (!isTracked(it.result.item) || it.result.skipped) continue;
    const k = keyOf(it.result.item);
    const ok = it.score >= C().CONFIG.positionScores.good && it.safetyErrors === 0;
    agg.set(k, (agg.get(k) ?? true) && ok);
  }
  for (const [k, ok] of agg) applyPractice(s, k, ok);
}

/** Free-mode forgetting: overdue more than 2 intervals → drop one level (min 1). Mutates. */
export function applyForgetting(s: GameState): void {
  const iv = C().CONFIG.srsIntervals;
  for (const [k, m] of Object.entries(s.mastery)) {
    if (m.attempts === 0) continue;
    const interval = iv[m.intervalIdx] ?? 1;
    if (s.day - m.dueDay > 2 * interval && m.level > 1) {
      s.mastery[k] = { ...m, level: (m.level - 1) as MasteryRecord["level"], streak: 0, intervalIdx: 0, dueDay: s.day };
    }
  }
}

/** Weakness score (higher = weaker / more in need of review). */
export function weakness(s: GameState, key: ItemKey): number {
  const m = getMastery(s, key);
  const acc = m.attempts ? m.correct / m.attempts : 0.5;
  const overdue = m.attempts ? Math.max(0, s.day - m.dueDay) : 1;
  return (4 - m.level) * 2 + (1 - acc) * 4 + Math.min(overdue, 10) * 0.5;
}

/** Items due for review (SRS due/overdue first, then weak items). */
export function dueItems(s: GameState, limit: number): ItemKey[] {
  const keys = learnedItems(s).map(keyOf);
  const due = keys.filter((k) => { const m = getMastery(s, k); return m.attempts === 0 || m.dueDay <= s.day; })
    .sort((a, b) => getMastery(s, a).dueDay - getMastery(s, b).dueDay || weakness(s, b) - weakness(s, a));
  const weak = keys.filter((k) => !due.includes(k)).filter((k) => { const m = getMastery(s, k); return m.level <= 2 || (m.attempts > 0 && m.correct / m.attempts < 0.7); })
    .sort((a, b) => weakness(s, b) - weakness(s, a));
  return [...due, ...weak].slice(0, Math.max(0, limit));
}

export function isExamCustomer(c: Customer): boolean { return c.special === "examiner" || c.id.startsWith("exam-"); }
export function isChallengeCustomer(c: Customer): boolean { return c.id.startsWith("challenge-"); }

export function buildTreatmentConfig(s: GameState, customer: Customer): TreatmentConfig {
  const base = serviceDef(customer.serviceId);
  if (!base) throw new Error(`Không tìm thấy dịch vụ ${customer.serviceId}`);
  // Combo: one session; the treatment UI only shows its name.
  const combo = customer.combo;
  const service = combo ? { ...base, id: combo.id, name: combo.name, basePrice: combo.price, durationMin: customer.durationMin } : base;
  const examMode = isExamCustomer(customer) || isChallengeCustomer(customer);
  const useForceBar = s.chapter >= 2 || s.chaptersPassed.length > 0 || hasFeature(s, "force-bar");
  const usePatience = !examMode && (s.chapter >= 2 || hasFeature(s, "patience"));
  const mastery = { ...s.mastery };
  return {
    customer, service, chapter: s.chapter, useForceBar, usePatience, examMode, zoomAssist: !!s.settings?.zoomAssist,
    hintLevel: (key) => (examMode ? 3 : (mastery[key]?.level ?? 0)),
  };
}
