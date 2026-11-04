/** Day-flow actions wiring UI events to core calls (real api, or mock in ?mock dev mode). */
import type { Customer, GameState, TreatmentResult } from "@/core/types";
import { api } from "./api";
import { act, dispatch, getGame, query, toast } from "./store";
import { getUi, setUi } from "./ui";
import { loadActiveSession, saveActiveSession, saveSessionProgress } from "@/save/storage";
import type { SessionProgress } from "./treatment";
import { chapterDef, serviceName } from "./content";
import { stars } from "./components/bits";
import { hhmm, vnd } from "./format";
import type { BillView } from "./ui";

/** customerId → characterId for customers that already left the queue (complaint portraits). */
const seenChars = new Map<string, string>();
export const characterOf = (id: string) => seenChars.get(id);
function remember(s: GameState | null) {
  s?.today.queue.forEach((c) => seenChars.set(c.id, c.characterId));
}

/** Toast the reason when customers walked out during the last transition (queue full, waited too long...). */
function notifyWalkouts(before: number) {
  const s = getGame();
  if (!s) return;
  const fresh = s.today.walkouts.slice(before).filter((id) => !id.startsWith("exam-"));
  const counts = new Map<string, number>();
  for (const id of fresh) {
    const r = query(() => api.walkoutReason(s, id), undefined);
    if (r && r.key !== "sent-away" && r.key !== "closing") counts.set(r.text, (counts.get(r.text) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (counts.size === 1) for (const [text, n] of counts) toast(n > 1 ? `${n} khách bỏ về – ${text.replace(/,? khách bỏ về\.?$/i, "")}` : text, "error", "walkout");
  else if (total) toast(`${total} khách bỏ về (chờ lâu, hết ghế...). Xem tổng kết cuối ngày.`, "error", "walkout");
}
const walkoutCount = () => getGame()?.today.walkouts.length ?? 0;

/** KTV sessions finished during the last clock jump: toast + queue their bills. */
function notifyStaffDone(before: GameState) {
  const s = getGame();
  if (!s) return;
  const fresh = s.today.records.slice(before.today.records.length).filter((r) => r.performer !== "player");
  const views: BillView[] = [];
  for (const r of fresh) {
    const st = s.staff.find((x) => x.uid === r.performer);
    const c = query(() => api.servingCustomer(before, r.customerId), undefined);
    const bill = query(() => api.billOf(s, r.customerId), undefined);
    if (bill) views.push({ bill, customerName: r.customerName, characterId: c?.characterId ?? "khach-mai", staffName: st?.name ?? "KTV", ...(c?.combo ? { combo: c.combo.services.map(serviceName) } : {}) });
  }
  // KTVs that took a waiting customer on their own while the player was busy
  const started = s.today.inService.filter((x) => x.performer !== "player" && !before.today.inService.some((y) => y.customerId === x.customerId));
  // one merged toast per clock jump (group "ktv" also replaces a "KTV đang làm..." toast)
  if (started.length && !fresh.length) {
    const st = s.staff.find((x) => x.uid === started[0].performer);
    const c = query(() => api.servingCustomer(s, started[0].customerId), undefined);
    toast(started.length === 1 ? `Trong lúc bạn bận, ${st ? `KTV ${st.name}` : "KTV"} đã nhận ${c?.name ?? "khách"} (xong ${hhmm(started[0].endsAt)})` : `Trong lúc bạn bận, KTV đã nhận ${started.length} khách`, "ok", "ktv");
  } else if (fresh.length === 1) {
    const r = fresh[0];
    const st = s.staff.find((x) => x.uid === r.performer);
    toast(`${st ? `KTV ${st.name}` : "KTV"} làm xong cho ${r.customerName}: ${stars(r.stars)} +${vnd(r.price + r.tip)}`, "ok", "ktv");
  } else if (fresh.length > 1) {
    toast(`${fresh.length} ca KTV làm xong: +${vnd(fresh.reduce((a, r) => a + r.price + r.tip, 0))}`, "ok", "ktv");
  }
  if (views.length) setUi((u) => ({ billQueue: [...(u.billQueue ?? []), ...views] }));
}

/** Runs a clock-moving action, then reports what happened meanwhile (KTV done, walkouts). */
function tick(fn: (s: GameState) => GameState): boolean {
  const before = getGame();
  if (!before) return false;
  remember(before);
  const w0 = before.today.walkouts.length;
  const ok = dispatch(fn);
  if (ok) { notifyStaffDone(before); notifyWalkouts(w0); remember(getGame()); }
  return ok;
}

export function openShop() {
  if (tick((s) => api.openShop(s))) maybeCloseDay();
}

/** Player greets a customer (5 minutes). */
export function checkIn(customerId: string) {
  if (tick((s) => api.checkIn(s, customerId))) maybeCloseDay();
}

/** Player cleans a station (10 minutes). */
export function cleanStation(uid: string) {
  if (tick((s) => api.cleanStation(s, uid))) maybeCloseDay();
}

/** "Chờ": jump to the next event. */
export function waitNext() {
  tick((g) => api.advanceTime(g));
  maybeCloseDay();
}

/** Close although customers may still come later (nobody waiting / being served). */
export function closeEarly() {
  const s = getGame();
  if (!s) return;
  const later = s.today.arrivals.length;
  if (later && !confirm(`Đóng cửa sớm lúc ${hhmm(s.today.clock)}? Khoảng ${later} khách dự kiến đến sau sẽ không được phục vụ.`)) return;
  closeDay();
}

export function serve(customerId: string) {
  const s = getGame();
  if (!s) return;
  const can = query(() => api.canServe(s, customerId), { ok: false as const, reason: "Chưa kiểm tra được giường/vật tư." });
  if (!can.ok) return toast(can.reason, "error");
  const customer = s.today.queue.find((c) => c.id === customerId);
  if (!customer) return;
  remember(s);
  if (!dispatch((st) => api.startPlayerService(st, customerId))) return;
  void saveActiveSession({ kind: "service", customer });
  beginTreatment(customer);
}

export function beginTreatment(customer: Customer, progress?: SessionProgress) {
  const s = getGame()!;
  try {
    const config = api.buildTreatmentConfig(s, customer);
    setUi({ treatment: { kind: "service", config, progress } });
  } catch (e) {
    toast(`Không mở được ca trị liệu: ${(e as Error).message}`, "error");
  }
}

export function finishTreatment(result: TreatmentResult) {
  const t = getUi().treatment;
  if (!t) return;
  if (t.kind === "exam") return examItemDone(result);
  if (t.kind === "challenge") return challengeDone(result);
  if (t.kind === "practice") return practiceItemDone(result);
  const customer = t.config.customer;
  const before = getGame();
  const w0 = walkoutCount();
  if (before) remember(before);
  const r = act((s) => api.completePlayerService(s, result));
  void saveActiveSession(null);
  setUi({ treatment: undefined, bill: r ? { bill: r.bill, customerName: customer.name, characterId: customer.characterId, ...(customer.combo ? { combo: customer.combo.services.map(serviceName) } : {}) } : undefined });
  if (r && before) notifyStaffDone(before);
  notifyWalkouts(w0);
  if (!r) afterBill();
}

/** Called after "Thu tiền" (and after each complaint is resolved): auto-close the day when it's over. */
export function afterBill() {
  const u = getUi();
  if (u.bill) setUi({ bill: undefined });
  else if (u.billQueue?.length) setUi({ billQueue: u.billQueue.slice(1) });
  maybeCloseDay();
}

export function maybeCloseDay() {
  const s = getGame();
  const u = getUi();
  if (!s || s.today.phase !== "open" || s.today.complaints.length || u.bill || u.billQueue?.length) return;
  if (query(() => api.isDayOver(s), false)) closeDay();
}

export function closeDay() {
  const r = act((s) => api.closeDay(s));
  if (r) setUi({ summary: r.summary, tab: "home" });
}

export function nextDay() {
  if (dispatch((s) => api.startNextDay(s))) setUi({ summary: undefined });
}

export function assign(customerId: string, staffUid: string) {
  const s = getGame()!;
  const c = s.today.queue.find((q) => q.id === customerId);
  const st = s.staff.find((x) => x.uid === staffUid);
  remember(s);
  const r = act((g) => api.assignToStaff(g, customerId, staffUid));
  if (r) toast(`${st?.name ?? "KTV"} đang làm cho ${c?.name ?? "khách"}, xong lúc ${hhmm(r.service.endsAt)}`, "ok", "ktv");
}

export function sendAway(customerId: string) {
  if (dispatch((s) => api.sendAway(s, customerId))) maybeCloseDay();
}

export function resolveComplaint(id: string, choice: "apologize-refund" | "apologize") {
  if (dispatch((s) => api.resolveComplaint(s, id, choice))) maybeCloseDay();
}

// ── Exam ──

export function startExam() {
  const s = getGame()!;
  try {
    const customers = api.buildExam(s);
    if (!customers.length) return toast("Chưa có bài kiểm tra.", "error");
    setUi({ exam: { phase: "intro", customers, idx: 0, results: [] } });
  } catch (e) {
    toast(`Không tạo được bài kiểm tra: ${(e as Error).message}`, "error");
  }
}

export function runExamItem() {
  const u = getUi();
  const s = getGame()!;
  if (!u.exam) return;
  const c = u.exam.customers[u.exam.idx];
  try {
    const base = api.buildTreatmentConfig(s, c);
    setUi({ exam: { ...u.exam, phase: "running" }, treatment: { kind: "exam", config: { ...base, examMode: true, hintLevel: () => 3 } } });
  } catch (e) {
    toast((e as Error).message, "error");
  }
}

function examItemDone(result: TreatmentResult) {
  const u = getUi();
  if (!u.exam) return;
  const results = [...u.exam.results, result];
  const idx = u.exam.idx + 1;
  if (idx < u.exam.customers.length) {
    setUi({ treatment: undefined, exam: { ...u.exam, results, idx, phase: "intro" } });
    return;
  }
  const s0 = getGame()!;
  const ch = chapterDef(s0.chapter);
  const chapter = s0.chapter;
  const r = act((s) => api.finishExam(s, results));
  notifyStaffDone(s0);
  const entries = query(() => api.examReview(results, u.exam!.customers), []);
  const total = results.reduce((n, x) => n + x.items.filter((i) => i.item.kind !== "step").length, 0);
  setUi({
    treatment: undefined,
    exam: r
      ? { ...u.exam, results, idx, phase: "result", review: { entries, total }, outcome: { passed: r.passed, score: r.score, weakItems: r.weakItems, chapter, rewardMoney: ch?.reward.money ?? 0, rewardRep: ch?.reward.reputation ?? 0, badge: ch?.reward.badge ?? `badge-ch${chapter}` } }
      : undefined,
  });
}

// ── Practice the wrong exam items ("Luyện lại các huyệt sai") ──
// Pure practice: hint level 1 (soft hint blob + guide lines), no clock, money, reputation or mastery changes.

export function startPractice() {
  const u = getUi();
  const s = getGame();
  if (!u.exam?.review || !s) return;
  const customers = u.exam.practice?.customers ?? query(() => api.practiceCustomers(u.exam!.review!.entries, s.day), []);
  if (!customers.length) return toast("Không có mục nào cần luyện lại.", "ok");
  const total = customers.reduce((n, c) => n + c.items.length, 0);
  const practice = { customers, idx: 0, good: 0, total, done: false };
  runPractice({ ...u.exam, practice });
}

function runPractice(exam: NonNullable<ReturnType<typeof getUi>["exam"]>): boolean {
  const s = getGame()!;
  const p = exam.practice!;
  const c = p.customers[p.idx];
  try {
    const base = api.buildTreatmentConfig(s, c);
    setUi({ exam: { ...exam, phase: "practice" }, treatment: { kind: "practice", config: { ...base, service: { ...base.service, name: "Luyện lại với anh Khôi" }, examMode: false, usePatience: false, practice: true, hintLevel: () => 1 } } });
    return true;
  } catch (e) {
    toast((e as Error).message, "error");
    return false;
  }
}

function practiceItemDone(result: TreatmentResult) {
  const u = getUi();
  const p = u.exam?.practice;
  if (!u.exam || !p) return setUi({ treatment: undefined });
  const c = p.customers[p.idx];
  const wrongNow = query(() => api.examReview([result], [c]).filter((e) => e.wrong).length, c.items.length);
  const good = p.good + c.items.length - wrongNow;
  const next = { ...p, idx: p.idx + 1, good };
  if (next.idx < p.customers.length) { runPractice({ ...u.exam, practice: next }); return; }
  setUi({ treatment: undefined, exam: { ...u.exam, phase: "result", practice: { ...next, idx: 0, done: true } } });
}

/** "Xem lại nhận xét": reopen anh Khôi's review of the latest exam (saved in the game state). */
export function openLastReview() {
  const s = getGame();
  const last = s?.lastExamReview;
  if (!s || !last) return toast("Chưa có bài kiểm tra nào để xem lại.", "error");
  const review = query(() => api.reviewOf(last), null);
  if (!review) return toast("Không mở được nhận xét.", "error");
  const ch = chapterDef(last.chapter);
  setUi({
    exam: {
      phase: "result", customers: last.customers, idx: last.customers.length, results: last.results, review,
      revisit: { chapter: last.chapter, day: last.day },
      outcome: { passed: last.passed, score: last.score, weakItems: [], chapter: last.chapter, rewardMoney: ch?.reward.money ?? 0, rewardRep: ch?.reward.reputation ?? 0, badge: ch?.reward.badge ?? `badge-ch${last.chapter}` },
    },
  });
}

export function closeExam() {
  setUi({ exam: undefined });
  maybeCloseDay();
}

// ── Daily challenge ──
export function startChallenge() {
  const s = getGame()!;
  try {
    const c = api.dailyChallenge(s);
    const base = api.buildTreatmentConfig(s, c);
    setUi({ treatment: { kind: "challenge", config: { ...base, hintLevel: () => 3 } } });
  } catch (e) {
    toast((e as Error).message, "error");
  }
}
function challengeDone(result: TreatmentResult) {
  const r = act((s) => api.finishChallenge(s, result));
  // A reward earned after closing amends today's summary (core updates the history entry).
  const g = getGame();
  const last = g?.history[g.history.length - 1];
  const summary = getUi().summary && last && last.day === getUi().summary!.day ? last : getUi().summary;
  setUi({ treatment: undefined, summary, challengeResult: r ? { score: r.score, streak: r.streak, reward: r.reward } : undefined });
}

/** Service sessions persist their progress next to the active-session customer (survives an app reload). */
export function treatmentProgress(p: SessionProgress) {
  const t = getUi().treatment;
  if (t?.kind !== "service" || t.config.customer.id !== p.customerId) return;
  void saveSessionProgress(p.customerId, p);
}

/** Player aborted mid-treatment: keep the bed reserved; the customer can be resumed from the queue card. */
export function abortTreatment() {
  const t = getUi().treatment;
  // "Phần đã làm không được tính": the resumed session starts over.
  if (t?.kind === "service") void saveSessionProgress(t.config.customer.id, null);
  if (t?.kind === "exam") setUi({ treatment: undefined, exam: undefined });
  else if (t?.kind === "practice") setUi((u) => ({ treatment: undefined, exam: u.exam ? { ...u.exam, phase: "result" } : undefined }));
  else setUi({ treatment: undefined });
}

/** After an app reload mid-treatment: resume from the customer saved at service start. */
export async function resumeFromSave(fallback?: Customer) {
  const s = getGame();
  const playing = s?.today.inService.find((x) => x.performer === "player");
  const live = s && playing ? api.servingCustomer?.(s, playing.customerId) : undefined;
  const a = await loadActiveSession();
  if (live) return beginTreatment(live, a?.customer.id === live.id ? a.progress : undefined);
  if (a && s && s.today.inService.some((x) => x.customerId === a.customer.id && x.performer === "player")) beginTreatment(a.customer, a.progress);
  else if (fallback) beginTreatment(fallback);
  else toast("Không tìm thấy ca đang làm dở.", "error");
}
