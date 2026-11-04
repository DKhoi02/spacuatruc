/**
 * Local persistence (IndexedDB via idb-keyval). One save per device (docs/TECH_NOTES.md §4).
 */
import { get, set, del } from "idb-keyval";
import type { Customer, GameState } from "@/core/types";
import type { SessionProgress } from "@/ui/treatment";
import { makeEnvelope, unwrapEnvelope, type SaveEnvelope } from "./saveFile";

let SAVE_KEY = "spa-save";
let SESSION_KEY = "spa-active-session";

/** Dev mock mode keeps its own save so it never clobbers the real one. */
export function useMockKeys() {
  SAVE_KEY = "spa-save-mock";
  SESSION_KEY = "spa-active-session-mock";
}

/** Returns the raw saved GameState (caller runs core.migrateSave on it), or null when no save. */
export async function loadGame(): Promise<unknown | null> {
  return unwrapEnvelope(await get<SaveEnvelope>(SAVE_KEY));
}

let chain: Promise<void> = Promise.resolve();
/** Writes are serialized so an older state can never overwrite a newer one. */
export function saveGame(state: GameState): Promise<void> {
  const env = makeEnvelope(state);
  chain = chain.then(() => set(SAVE_KEY, env)).catch((e) => console.error("saveGame failed", e));
  return chain;
}

export async function deleteGame(): Promise<void> {
  await chain;
  await del(SAVE_KEY);
  await del(SESSION_KEY);
}

/** The customer currently being treated by the player (so a reload can resume the session), plus in-session progress. */
export interface ActiveSession { kind: "service"; customer: Customer; progress?: SessionProgress }
let sessionChain: Promise<unknown> = Promise.resolve();
const queued = <T>(fn: () => Promise<T>): Promise<T> => {
  const p = sessionChain.then(fn, fn);
  sessionChain = p.catch((e) => console.error("session store failed", e));
  return p;
};
export async function loadActiveSession(): Promise<ActiveSession | null> {
  return queued(async () => (await get<ActiveSession>(SESSION_KEY)) ?? null);
}
export function saveActiveSession(v: ActiveSession | null): Promise<void> {
  return queued(() => (v ? set(SESSION_KEY, v) : del(SESSION_KEY)));
}
/** Updates (or clears, with null) the progress of the stored session — only if it is for the same customer. */
export function saveSessionProgress(customerId: string, progress: SessionProgress | null): Promise<void> {
  return queued(async () => {
    const cur = await get<ActiveSession>(SESSION_KEY);
    if (!cur || cur.customer.id !== customerId) return;
    const next: ActiveSession = { kind: cur.kind, customer: cur.customer };
    if (progress) next.progress = progress;
    await set(SESSION_KEY, next);
  });
}

let persistAsked = false;
export async function requestPersistentStorage(): Promise<void> {
  if (persistAsked) return;
  persistAsked = true;
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return;
    await navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}

/**
 * Export: `text`/`filename` come from core (exportSave / saveFileName).
 * iPhone: share sheet (Lưu vào Tệp / Zalo / AirDrop). Otherwise a normal download.
 */
export async function shareOrDownload(text: string, filename: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = new Blob([text], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}
