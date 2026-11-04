import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useFixture, perfectResult, cust } from "./fixture";
import { setContentForTests } from "../content";
import * as api from "../api";
import type { Customer, TreatmentResult } from "../types";

beforeEach(() => useFixture());
afterAll(() => setContentForTests(null));

const examCust = (): Customer => cust("exam-3-1", {
  special: "examiner",
  items: [
    { kind: "point", id: "A1", side: "center" },
    { kind: "point", id: "A2", side: "left" },
    { kind: "point", id: "A2", side: "right" },
    { kind: "point", id: "A3", side: "left" },
    { kind: "step", id: "cleanse" },
  ],
});

describe("exam review", () => {
  it("lists wrong items first, near misses after; perfect and step items are left out", () => {
    const c = examCust();
    const r: TreatmentResult = perfectResult(c);
    r.items[1].positionScore = 0;
    r.items[1].firstTap = { view: "V01", x: 0.4, y: 0.4 };
    r.items[2].positionScore = 70;
    r.items[3].safetyErrors = 1;
    r.items[4].positionScore = 0; // step: never reviewed
    const out = api.examReview([r], [c]);
    expect(out.map((e) => e.index)).toEqual([3, 1, 2]); // safety error first
    expect(out[1]).toMatchObject({ wrong: true, score: 0, issues: ["position"] });
    expect(out[1].result.firstTap?.x).toBe(0.4);
    expect(out[0]).toMatchObject({ wrong: true, issues: ["safety"] });
    expect(out[2]).toMatchObject({ wrong: false, score: 70, issues: ["position-near"] });
  });

  it("pregnant case: performing a contraindicated point and skipping a normal one are both wrong", () => {
    const c = cust("exam-3-2", { special: "pregnant", health: { id: "pregnant", label: "Mang thai" }, items: [
      { kind: "point", id: "B1", side: "left" }, { kind: "point", id: "B1", side: "right" }, { kind: "point", id: "B2", side: "left" },
    ] });
    const r = perfectResult(c);
    r.items[1].skipped = true; // correct skip
    r.items[2].skipped = true; // wrong skip
    const out = api.examReview([r], [c]);
    expect(out.find((e) => e.index === 0)?.issues).toContain("contra-done");
    expect(out.find((e) => e.index === 2)?.issues).toEqual(["skip-wrong"]);
    expect(out.some((e) => e.index === 1)).toBe(false);
  });

  it("force issues are reported", () => {
    const c = examCust();
    const r = perfectResult(c);
    r.items[0].forceScore = 40; r.items[0].forceIssue = "over";
    r.items[1].forceScore = 50;
    const out = api.examReview([r], [c]);
    expect(out.find((e) => e.index === 0)?.issues).toContain("force-over");
    expect(out.find((e) => e.index === 1)?.issues).toContain("force-under");
  });

  it("practice customers keep only wrong items, per session, and are not exam customers", () => {
    const c1 = examCust();
    const c2 = cust("exam-3-2", { special: "pregnant", health: { id: "pregnant", label: "Mang thai" }, items: [{ kind: "point", id: "B1", side: "left" }] });
    const r1 = perfectResult(c1); r1.items[3].positionScore = 0; r1.items[0].positionScore = 70;
    const r2 = perfectResult(c2);
    const prac = api.practiceCustomers(api.examReview([r1, r2], [c1, c2]), 3);
    expect(prac.map((p) => p.id)).toEqual(["practice-3-1", "practice-3-2"]);
    expect(prac[0].items).toEqual([{ kind: "point", id: "A3", side: "left" }]);
    expect(prac[0].special).toBeUndefined();
    expect(prac[1].health?.id).toBe("pregnant");
    const s = api.newGame("T", 1);
    const cfg = api.buildTreatmentConfig(s, { ...prac[0], serviceId: s.unlocked.services[0] });
    expect(cfg.examMode).toBe(false);
  });
});

describe("persisted exam review (Xem lại nhận xét)", () => {
  function examDayState() {
    const s = api.newGame("T", 11);
    s.chapterDay = 3; s.day = 3;
    return api.openShop(api.migrateSave(JSON.parse(JSON.stringify(s))));
  }
  it("finishExam stores a compact review that rebuilds the same entries", () => {
    const s = examDayState();
    const sessions = api.buildExam(s);
    const results = sessions.map((c) => perfectResult(c));
    const it0 = results[0].items.findIndex((i) => i.item.kind !== "step");
    results[0].items[it0].positionScore = 0;
    results[0].items[it0].firstTap = { view: "V01", x: 0.4, y: 0.3 };
    const out = api.finishExam(s, results);
    const last = out.state.lastExamReview!;
    expect(last).toMatchObject({ chapter: 1, day: 3, passed: out.passed, score: out.score });
    expect(last.customers.length).toBe(results.length);
    const { entries, total } = api.reviewOf(last);
    expect(entries).toEqual(api.examReview(results, sessions).map((e) => ({ ...e, customer: last.customers[e.session] })));
    expect(total).toBe(results.reduce((n, r) => n + r.items.filter((i) => i.item.kind !== "step").length, 0));
    expect(entries[0].result.firstTap?.x).toBe(0.4);
    // survives a save round-trip; practice works from it
    const back = api.migrateSave(JSON.stringify(out.state));
    expect(back.lastExamReview).toEqual(last);
    expect(api.practiceCustomers(api.reviewOf(back.lastExamReview!).entries, 4).length).toBe(entries.some((e) => e.wrong) ? 1 : 0);
  });
  it("retryReview: only for a failed exam of the current, unpassed chapter", () => {
    const s = examDayState();
    const sessions = api.buildExam(s);
    const failed = api.finishExam(s, sessions.map((c) => perfectResult(c, 50))).state;
    expect(api.retryReview(failed)?.passed).toBe(false);
    expect(api.retryReview({ ...failed, chapter: 2 })).toBeUndefined();
    const passed = api.finishExam(s, sessions.map((c) => perfectResult(c))).state;
    expect(passed.lastExamReview?.passed).toBe(true);
    expect(api.retryReview(passed)).toBeUndefined();
  });
  it("migration: missing → absent, malformed → dropped", () => {
    const s = api.newGame("T", 2);
    expect(api.migrateSave(JSON.stringify(s)).lastExamReview).toBeUndefined();
    expect(api.migrateSave({ ...s, lastExamReview: { chapter: 1 } }).lastExamReview).toBeUndefined();
    expect(api.migrateSave({ ...s, lastExamReview: "x" }).lastExamReview).toBeUndefined();
    const v2 = { ...JSON.parse(JSON.stringify(s)), schemaVersion: 2, expanded: false };
    expect(api.migrateSave(v2).lastExamReview).toBeUndefined();
  });
});
