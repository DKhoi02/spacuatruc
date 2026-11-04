import type { Customer, GameState, ItemKey, ItemResult, LastExamReview, TreatmentResult } from "./types";
import { C, acupoint, chapterDef } from "./content";
import { keyOf, syncUnlocks } from "./chapters";
import { applyScoredItems, isExamCustomer } from "./mastery";
import { scoreService } from "./scoring";
import { buildExam, examPlaceholder, dailyChallenge } from "./tickets";
import { creditReward, passTime } from "./day";
import { addReputation, clone, meta } from "./util";

export function finishExam(s0: GameState, results: TreatmentResult[]): { state: GameState; passed: boolean; score: number; weakItems: ItemKey[] } {
  const s = clone(s0);
  const ch = chapterDef(s.chapter);
  const sessions = buildExam(s0);
  const placeholder = examPlaceholder(s0);
  let sum = 0, n = 0, safety = 0;
  const weak = new Set<ItemKey>();
  const custs: Customer[] = [];
  for (const r of results) {
    const cust: Customer | undefined = sessions.find((c) => c.id === r.customerId) ?? (r.customerId === placeholder.id ? placeholder : sessions[0]);
    custs.push(cust ?? placeholder);
    const sc = scoreService(r, cust);
    for (const it of sc.items) {
      sum += it.score; n++;
      if ((it.score < 70 || it.safetyErrors > 0) && it.result.item.kind !== "step") weak.add(keyOf(it.result.item));
    }
    safety += sc.safetyErrors;
    applyScoredItems(s, sc.items);
  }
  const passScore = ch?.exam.passScore ?? 80;
  const score = n ? Math.max(0, Math.round(sum / n - C().CONFIG.safetyErrorPenalty * safety)) : 0;
  const passed = !!ch && n > 0 && safety === 0 && score >= passScore && !s.chaptersPassed.includes(s.chapter);

  // remove the examiner from today's flow
  const wasPresent = [...s.today.queue, ...s.today.arrivals].some(isExamCustomer) || s.today.inService.some((x) => x.customerId.startsWith("exam-"));
  s.today.queue = s.today.queue.filter((c) => !isExamCustomer(c));
  s.today.arrivals = s.today.arrivals.filter((c) => !isExamCustomer(c));
  s.today.inService = s.today.inService.filter((x) => !x.customerId.startsWith("exam-"));
  s.today.examActive = false;

  if (ch && n > 0) s.lastExamReview = compactExam(s0.chapter, s0.day, passed, score, results, custs);

  if (passed && ch) {
    s.chaptersPassed.push(s.chapter);
    creditReward(s, ch.reward.money);
    addReputation(s, ch.reward.reputation || C().CONFIG.reputation.examPass);
    meta(s).notes.push(`Qua bài kiểm tra chương ${s.chapter}! Thưởng ${ch.reward.money.toLocaleString("vi-VN")}đ.`);
    // The next chapter starts tomorrow morning (startNextDay); chapter 8 opens free mode right away.
    if (s.chapter >= 8) { s.freeMode = true; syncUnlocks(s); }
  }
  if (wasPresent && s.today.phase === "open") passTime(s, C().CONFIG.clock.examMin);
  return { state: s, passed, score, weakItems: [...weak] };
}

export function finishChallenge(s0: GameState, result: TreatmentResult): { state: GameState; score: number; streak: number; reward: number } {
  const s = clone(s0);
  const cust = dailyChallenge(s0);
  const sc = scoreService(result, cust);
  applyScoredItems(s, sc.items);
  if (s.challenge.lastDay === s.day) return { state: s, score: sc.score, streak: s.challenge.streak, reward: 0 };
  const streak = s.challenge.lastDay === s.day - 1 ? s.challenge.streak + 1 : 1;
  const reward = sc.score >= 70 ? 50_000 + 20_000 * (Math.min(streak, 10) - 1) : 0;
  s.challenge = { lastDay: s.day, streak };
  creditReward(s, reward);
  return { state: s, score: sc.score, streak, reward };
}

// ── Exam review (anh Khôi nhận xét) ──

/** Why an exam item is pointed out in the review. */
export type ReviewIssue =
  | "contra-done"   // performed a point contraindicated for the pregnant customer
  | "skip-wrong"    // skipped an item that should have been done
  | "safety"        // forbidden zone / over-force on a sensitive point
  | "position"      // first tap missed the spot (score 0 → shown + re-tapped)
  | "position-near" // first tap only "good" (inside the tolerance, not dead-centre)
  | "force-over" | "force-under"
  | "swipe";        // swipe score below 100 (wrong muscle / direction / length)

export interface ReviewEntry {
  /** Index of the exam session (customer) and of the item inside it. */
  session: number;
  index: number;
  result: ItemResult;
  customer: Customer;
  score: number;
  safetyErrors: number;
  issues: ReviewIssue[];
  /** score < 70, any safety error, wrong skip or contraindicated performed: must be learned again. */
  wrong: boolean;
}

/**
 * Every non-step exam item scoring below 100 (or with a safety error / wrong skip), worst first
 * (wrong + safety error, wrong, then the rest; lower score first).
 * `wrong` marks the items that cost the pass (same rule as `finishExam`'s weakItems).
 */
export function examReview(results: TreatmentResult[], customers: Customer[]): ReviewEntry[] {
  const out: ReviewEntry[] = [];
  results.forEach((r, session) => {
    const cust = customers.find((c) => c.id === r.customerId) ?? customers[session] ?? customers[0];
    const pregnant = cust?.health?.id === "pregnant";
    scoreService(r, cust).items.forEach((it, index) => {
      const res = it.result;
      if (res.item.kind === "step") return;
      const flag = res.item.kind === "point" ? acupoint(res.item.id)?.pregnancy : undefined;
      const issues: ReviewIssue[] = [];
      if (res.skipped && !it.skippedOk) issues.push("skip-wrong");
      if (!res.skipped) {
        if (pregnant && flag === "contraindicated") issues.push("contra-done");
        else if (it.safetyErrors > 0) issues.push("safety");
        if (res.item.kind === "muscle") { if ((res.swipeScore ?? res.positionScore) < 100) issues.push("swipe"); }
        else if (res.positionScore <= 0) issues.push("position");
        else if (res.positionScore < 100) issues.push("position-near");
        if (res.forceIssue === "over") issues.push("force-over");
        else if (res.forceIssue === "under" || (res.forceScore !== undefined && res.forceScore < 70)) issues.push("force-under");
      }
      const wrong = it.score < 70 || it.safetyErrors > 0 || issues.includes("skip-wrong") || issues.includes("contra-done");
      if (!wrong && it.score >= 100 && !issues.length) return;
      out.push({ session, index, result: res, customer: cust, score: Math.round(it.score), safetyErrors: it.safetyErrors, issues, wrong });
    });
  });
  const sev = (e: ReviewEntry) => (e.wrong ? 2 : 0) + (e.safetyErrors > 0 ? 1 : 0);
  return out.sort((a, b) => sev(b) - sev(a) || a.score - b.score || a.session - b.session || a.index - b.index);
}

/**
 * Practice customers for "Luyện lại các huyệt sai": one per exam session that has wrong items, with only those
 * items (same health profile, so skipping a contraindicated point is practised too). Not exam customers.
 */
export function practiceCustomers(entries: ReviewEntry[], day: number): Customer[] {
  const bySession = new Map<number, ReviewEntry[]>();
  for (const e of entries) if (e.wrong) bySession.set(e.session, [...(bySession.get(e.session) ?? []), e]);
  return [...bySession].sort((a, b) => a[0] - b[0]).map(([session, list]) => {
    const c = list[0].customer;
    const items = list.sort((a, b) => a.index - b.index).map((e) => e.result.item);
    const { special: _sp, ...rest } = c;
    void _sp;
    return { ...rest, id: `practice-${day}-${session + 1}`, items, ...(c.health ? { special: "pregnant" as const } : {}) };
  });
}

// ── Persisted review ("Xem lại nhận xét") ──

/** Compact copy of an exam for `GameState.lastExamReview`: results + the customer fields the review/practice need. */
export function compactExam(chapter: GameState["chapter"], day: number, passed: boolean, score: number, results: TreatmentResult[], customers: Customer[]): LastExamReview {
  return {
    chapter, day, passed, score,
    results: results.map((r) => ({ customerId: r.customerId, items: r.items.map((i) => ({ ...i })) })),
    customers: customers.map((c) => ({
      id: c.id, characterId: c.characterId, name: c.name, serviceId: c.serviceId, items: c.items.map((i) => ({ ...i })),
      ...(c.health ? { health: { ...c.health } } : {}), regular: false, ...(c.special ? { special: c.special } : {}),
      arriveAt: 0, patience: 0, durationMin: c.durationMin,
    })),
  };
}

/** Rebuilds anh Khôi's review from a stored exam: entries (worst first) + the number of reviewable items. */
export function reviewOf(last: LastExamReview): { entries: ReviewEntry[]; total: number } {
  const entries = examReview(last.results, last.customers);
  const total = last.results.reduce((n, r) => n + r.items.filter((i) => i.item.kind !== "step").length, 0);
  return { entries, total };
}

/** The stored review to offer before a retry: this chapter's exam, failed, chapter not passed yet. */
export function retryReview(s: GameState): LastExamReview | undefined {
  const l = s.lastExamReview;
  return l && !l.passed && l.chapter === s.chapter && !s.chaptersPassed.includes(s.chapter) ? l : undefined;
}

/** Save sanitizer: drops a malformed `lastExamReview` (older saves simply lack it). */
export function validLastExamReview(x: unknown): x is LastExamReview {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.chapter === "number" && typeof o.day === "number" && typeof o.passed === "boolean" && typeof o.score === "number"
    && Array.isArray(o.results) && Array.isArray(o.customers) && o.results.length === o.customers.length
    && o.results.every((r) => typeof r === "object" && r !== null && Array.isArray((r as { items?: unknown }).items))
    && o.customers.every((c) => typeof c === "object" && c !== null && Array.isArray((c as { items?: unknown }).items));
}
