/** UI-only state (navigation, overlays). Not persisted except the active treatment customer. */
import { useEffect, useState } from "preact/hooks";
import type { Customer, DaySummary, ItemKey, TreatmentConfig, TreatmentResult } from "@/core/types";
import type { Bill, ReviewEntry } from "./api";
import type { SessionProgress } from "./treatment";

export type Tab = "home" | "shop" | "staff" | "book" | "settings";

export interface ExamFlow {
  /** "practice": the "Luyện lại các huyệt sai" mini-session is running (from the result screen). */
  phase: "intro" | "running" | "result" | "practice";
  customers: Customer[];
  idx: number;
  results: TreatmentResult[];
  outcome?: { passed: boolean; score: number; weakItems: ItemKey[]; chapter: number; rewardMoney: number; rewardRep: number; badge: string };
  /** Anh Khôi's review (items below 100 / with errors, worst first) and the number of reviewable items. */
  review?: { entries: ReviewEntry[]; total: number };
  /** Reopened from the saved `lastExamReview` ("Xem lại nhận xét"): read-only review + practice, no exam effects. */
  revisit?: { chapter: number; day: number };
  /** Practice customers (wrong items only) and progress through them. */
  practice?: { customers: Customer[]; idx: number; good: number; total: number; done: boolean };
}

export interface BillView { bill: Bill; customerName: string; characterId: string; staffName?: string; /** service names of a combo */ combo?: string[] }

export interface UiState {
  tab: Tab;
  treatment?: { kind: "service" | "exam" | "challenge" | "practice"; config: TreatmentConfig; progress?: SessionProgress };
  bill?: BillView;
  /** Bills of services finished by KTVs while the clock ran (shown after `bill`). */
  billQueue?: BillView[];
  exam?: ExamFlow;
  challengeResult?: { score: number; streak: number; reward: number };
  summary?: DaySummary;
  updateReady?: boolean;
  /** shown once per session when phase is prep */
  briefDismissedDay?: number;
}

let ui: UiState = { tab: "home" };
const ls = new Set<() => void>();
export const getUi = () => ui;
export function setUi(patch: Partial<UiState> | ((u: UiState) => Partial<UiState>)) {
  ui = { ...ui, ...(typeof patch === "function" ? patch(ui) : patch) };
  ls.forEach((l) => l());
}
export function useUi(): UiState {
  const [, setN] = useState(0);
  const force = () => setN((n) => n + 1);
  useEffect(() => {
    ls.add(force);
    return () => void ls.delete(force);
  }, []);
  return ui;
}
