import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useFixture, perfectResult } from "./fixture";
import { setContentForTests } from "../content";
import * as api from "../api";
import { syncUnlocks } from "../chapters";
import type { GameState } from "../types";

beforeEach(() => useFixture());
afterAll(() => setContentForTests(null));

function examDay(): GameState {
  const s = api.newGame("T", 11);
  s.chapterDay = 3; s.day = 3; syncUnlocks(s);
  return s;
}

describe("exam", () => {
  it("examiner arrives on exam day; pass → reward + next chapter tomorrow", () => {
    let s = api.openShop(examDay());
    expect(s.today.examActive).toBe(true);
    const all = [...s.today.queue, ...s.today.arrivals];
    expect(all.some((c) => c.special === "examiner")).toBe(true);
    const sessions = api.buildExam(s);
    const money = s.money;
    const out = api.finishExam(s, sessions.map((c) => perfectResult(c)));
    expect(out.passed).toBe(true);
    expect(out.score).toBe(100);
    expect(out.state.money).toBe(money + 500_000);
    expect(out.state.reputation).toBeCloseTo(s.reputation + 0.2);
    expect(out.state.chapter).toBe(1); // next chapter starts tomorrow
    expect(out.state.chaptersPassed).toEqual([1]);
    expect(api.isExamDay(out.state)).toBe(false);
    expect([...out.state.today.queue, ...out.state.today.arrivals].some((c) => c.special === "examiner")).toBe(false);
    expect(out.state.today.ledger.rewards).toBe(500_000);
    const closed = api.closeDay(servedAll(out.state));
    expect(closed.summary.ledger.rewards).toBe(500_000);
    // profit includes the reward; balance change == profit + non-cash items − cash purchases
    const L = closed.summary.ledger;
    expect(closed.summary.moneyEnd - money).toBe(closed.summary.profit + L.supplies + L.depreciation - L.purchases);
    let st = closed.state;
    st = api.startNextDay(st);
    expect(st.today.ledger.rewards).toBe(0);
    expect(st.chapter).toBe(2);
    expect(st.chapterDay).toBe(1);
    expect(st.unlocked.services).toContain("hand");
    expect(st.unlocked.features).toContain("pricing");
  });
  it("fails below pass score or with a safety error; retry next day", () => {
    const s = api.openShop(examDay());
    const sessions = api.buildExam(s);
    const low = api.finishExam(s, sessions.map((c) => perfectResult(c, 70)));
    expect(low.passed).toBe(false);
    expect(low.score).toBe(70);
    expect(low.weakItems.length).toBe(0);
    const r = perfectResult(sessions[0]);
    r.items[0].safetyErrors = 1;
    const unsafe = api.finishExam(s, [r]);
    expect(unsafe.passed).toBe(false);
    expect(unsafe.state.chapter).toBe(1);
    expect(unsafe.state.money).toBe(s.money);
    expect(unsafe.state.today.ledger.rewards).toBe(0);
    let st = api.closeDay(servedAll(unsafe.state)).state;
    st = api.startNextDay(st);
    expect(api.isExamDay(st)).toBe(true);
  });
  it("daily challenge streak reward", () => {
    const s = examDay();
    const ch = api.dailyChallenge(s);
    expect(ch.items.length).toBeGreaterThan(0);
    const a = api.finishChallenge(s, perfectResult(ch));
    expect(a.streak).toBe(1);
    expect(a.reward).toBe(50_000);
    expect(a.state.today.ledger.rewards).toBe(50_000);
    expect(a.state.money).toBe(s.money + 50_000);
    const again = api.finishChallenge(a.state, perfectResult(ch));
    expect(again.reward).toBe(0);
    const next = { ...a.state, day: a.state.day + 1 };
    const b = api.finishChallenge(next, perfectResult(api.dailyChallenge(next)));
    expect(b.streak).toBe(2);
    expect(b.reward).toBe(70_000);
  });
  it("challenge done after closing amends today's summary", () => {
    let s = api.openShop(api.newGame("T", 5));
    s = servedAll(s);
    s.today.inService = [];
    const closed = api.closeDay(s).state;
    const h0 = closed.history[closed.history.length - 1];
    const r = api.finishChallenge(closed, perfectResult(api.dailyChallenge(closed)));
    const h1 = r.state.history[r.state.history.length - 1];
    expect(h1.ledger.rewards).toBe(r.reward);
    expect(h1.profit).toBe(h0.profit + r.reward);
    expect(h1.moneyEnd).toBe(r.state.money);
  });
});

function servedAll(s: GameState): GameState {
  s = structuredClone(s);
  s.today.queue = []; s.today.arrivals = [];
  return s;
}
