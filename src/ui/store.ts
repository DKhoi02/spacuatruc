/**
 * Tiny global game store. `dispatch(fn)` runs a pure core transition, swaps the state and persists it.
 * Errors thrown by core (e.g. "không đủ tiền") become a toast instead of crashing the app.
 */
import { useEffect, useState } from "preact/hooks";
import type { GameState } from "@/core/types";
import { saveGame } from "@/save/storage";

type Listener = () => void;
let game: GameState | null = null;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export function getGame(): GameState | null {
  return game;
}

/** Replace state (and persist unless save=false). */
export function setGame(s: GameState | null, save = true) {
  game = s;
  if (s && save) void saveGame(s);
  emit();
}

function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/not implemented/.test(m)) return `Chức năng chưa sẵn sàng (${m.replace("core.", "").replace(" not implemented", "")}).`;
  return m || "Có lỗi xảy ra.";
}

/** Run a state transition. Returns false (and shows a toast) if core threw. */
export function dispatch(fn: (s: GameState) => GameState, save = true): boolean {
  if (!game) return false;
  try {
    const next = fn(game);
    setGame(next, save);
    return true;
  } catch (e) {
    console.error(e);
    toast(errMsg(e), "error");
    return false;
  }
}

/** Run a core call returning `{ state, ... }`; commits `state` and returns the full result (or undefined on error). */
export function act<T extends { state: GameState }>(fn: (s: GameState) => T, save = true): T | undefined {
  if (!game) return undefined;
  try {
    const r = fn(game);
    setGame(r.state, save);
    return r;
  } catch (e) {
    console.error(e);
    toast(errMsg(e), "error");
    return undefined;
  }
}

/** Safe read-only query: returns fallback when core throws. */
export function query<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function useGame(): GameState | null {
  const [, setN] = useState(0);
  const force = () => setN((n) => n + 1);
  useEffect(() => {
    listeners.add(force);
    return () => void listeners.delete(force);
  }, []);
  return game;
}

// ── Toasts ──
/**
 * At most MAX_TOASTS are visible (the newest pushes the oldest out) so they never pile up over the scene.
 * Toasts with the same `group` (e.g. "ktv": KTV started/finished) — or the same text — replace each other
 * instead of stacking; a repeated identical message shows "×n".
 */
export interface Toast { id: number; text: string; kind: "info" | "error" | "ok"; key: string; count: number }
export const MAX_TOASTS = 2;
const TOAST_MS = 3200;
let toasts: Toast[] = [];
const toastListeners = new Set<Listener>();
let tid = 0;
export function toast(text: string, kind: Toast["kind"] = "info", group?: string) {
  const key = group ?? `${kind}|${text}`;
  const prev = toasts.find((x) => x.key === key);
  const t: Toast = { id: ++tid, text, kind, key, count: prev && prev.text === text ? prev.count + 1 : 1 };
  toasts = [...toasts.filter((x) => x.key !== key), t].slice(-MAX_TOASTS);
  toastListeners.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l());
  }, TOAST_MS);
}
export function useToasts(): Toast[] {
  const [, setN] = useState(0);
  const force = () => setN((n) => n + 1);
  useEffect(() => {
    toastListeners.add(force);
    return () => void toastListeners.delete(force);
  }, []);
  return toasts;
}

// DEV-only test hook (Playwright QA scripts read the live state).
if (import.meta.env.DEV && typeof window !== "undefined") (window as unknown as { __qa: unknown }).__qa = { getGame };
