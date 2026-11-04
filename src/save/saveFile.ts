/**
 * On-device save envelope (docs/TECH_NOTES.md §4). The export/import FILE format lives in core
 * (src/core/save-format.ts: exportSave / parseSaveFile / saveFileName); this is only the IndexedDB record.
 */
import type { GameState } from "@/core/types";
import { GAME_VERSION } from "@/core/version";

export interface SaveEnvelope {
  schemaVersion: number;
  gameVersion: string;
  updatedAt: string;
  data: GameState;
}

export function makeEnvelope(state: GameState, now = new Date()): SaveEnvelope {
  return { schemaVersion: state.schemaVersion, gameVersion: GAME_VERSION, updatedAt: now.toISOString(), data: state };
}

/** Accepts the envelope, or a bare GameState (defensive), and returns the raw state for core.migrateSave. */
export function unwrapEnvelope(v: unknown): unknown | null {
  if (!v || typeof v !== "object") return null;
  if ("data" in v && (v as SaveEnvelope).data && typeof (v as SaveEnvelope).data === "object") return (v as SaveEnvelope).data;
  if ("shopName" in v) return v;
  return null;
}
export { GAME_VERSION };
