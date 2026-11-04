/**
 * TREATMENT COMPONENT CONTRACT — the treatment agent replaces the implementation, keeping these props.
 * The meta UI mounts <TreatmentSession> full-screen for one customer and receives the result.
 */
import type { ItemResult, TreatmentConfig, TreatmentResult } from "@/core/types";
import { SessionShell } from "./Session";

export interface TreatmentSessionProps {
  config: TreatmentConfig;
  onFinish: (result: TreatmentResult) => void;
  /** Optional: player leaves mid-treatment (customer goes back to queue). */
  onAbort?: () => void;
  /** Optional: progress saved by an earlier mount of the same session (app reload) — resumes there. */
  initialProgress?: SessionProgress;
  /** Optional: called whenever progress changes (completed items, current item, patience, care overlays). */
  onProgress?: (p: SessionProgress) => void;
}

/** Serializable mid-session progress. The current item restarts cleanly on resume. */
export interface SessionProgress {
  customerId: string;
  results: (ItemResult | null)[];
  cur: number;
  patience: number;
  care?: { faceFoam: number; scrub: number; mask: number; wet: number; hairFoam: number };
}

export function TreatmentSession(props: TreatmentSessionProps) {
  return <SessionShell {...props} />;
}
