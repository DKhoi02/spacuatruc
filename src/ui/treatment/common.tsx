/** Shared types + small UI pieces for the treatment task components. */
import type { ComponentChildren, JSX } from "preact";
import type { ItemResult, TapRecord, TaskItem, TreatmentConfig } from "@/core/types";
import type { ViewData } from "@/ui/art/assets";
import { drawnSideOf, type Plan } from "./plan";
import type { LayerSpec } from "./Stage";
import { hash01, type Pt } from "./scoring";

export type Expr = "neutral" | "relaxed" | "pain";
export type ToastKind = "perfect" | "good" | "bad" | "safety" | "info";
export type HintLevel = 0 | 1 | 2 | 3 | 4;

export interface CareState { faceFoam: number; scrub: number; mask: number; wet: number; hairFoam: number }
export const CARE_INIT: CareState = { faceFoam: 0, scrub: 0, mask: 0, wet: 0, hairFoam: 0 };

export interface TaskCtx {
  item: TaskItem;
  itemKey: string;
  plan: Plan;
  hint: HintLevel;
  svg: string | null;
  overlaySvg: string | null;
  config: TreatmentConfig;
  pregnant: boolean;
  all: ViewData[];
  cssVars: Record<string, string>;
  expr: Expr;
  setExpr: (e: Expr, ms?: number) => void;
  toast: (text: string, kind: ToastKind, ms?: number) => void;
  /** The session root forwards press/release (anywhere except buttons) to this handler during hold phases. */
  pressRef: { current: ((down: boolean) => void) | null };
  setPaused: (p: boolean) => void;
  onDone: (r: ItemResult) => void;
  zoom: number;
  /** Set the stage zoom (tasks use it to auto-zoom small targets). */
  setZoom: (z: number) => void;
  /** Tap tasks report their on-screen tolerance at 1× (CSS px) so the zoom button / precision default can adapt. */
  reportTol: (tolPx: number | null) => void;
  /** Effective precision (reticle) mode for tap tasks. */
  precise: boolean;
  tools: JSX.Element;
  care: CareState;
  setCare: (c: CareState) => void;
}

export const toScreen = (plan: Plan, p: Pt): Pt => (plan.mirrored ? [1 - p[0], p[1]] : p);
export const toView = toScreen; // mirroring is an involution

/** Serializable record of a tap given in VIEW coords (already un-mirrored). */
export function tapRecord(plan: Plan, v: Pt): TapRecord {
  const r: TapRecord = { view: plan.view, x: Math.round(v[0] * 10000) / 10000, y: Math.round(v[1] * 10000) / 10000 };
  if (plan.mirrored) r.mirrored = true;
  return r;
}
export const X = (p: Pt) => p[0] * 1000;
export const Y = (p: Pt) => p[1] * 1400;

const groupId = (n: string) => (n.startsWith("expr-") ? n : `state-${n}`);

export function baseLayers(plan: Plan, hint: HintLevel, expr: Expr, extra?: Partial<LayerSpec>): LayerSpec {
  const show: string[] = [];
  const hide: string[] = [];
  for (const [cat, names] of Object.entries(plan.data.variants ?? {})) {
    const chosen = cat === "expr" ? `expr-${expr}` : plan.variants[cat];
    for (const n of names) (n === chosen ? show : hide).push(groupId(n));
  }
  return { landmarks: hint <= 2, guides: hint <= 1, muscle: null, fibers: false, zone: null, show, hide, ...extra };
}

export function badgesFor(plan: Plan): { left?: string; right?: string; center?: string } | undefined {
  const d = plan.data;
  if (d.mirrorable) {
    const ds = drawnSideOf(d);
    const side = plan.mirrored ? (ds === "left" ? "right" : "left") : ds;
    const limb = d.limb === "hand" ? "Tay" : d.limb === "leg" ? "Chân" : d.limb === "foot" ? "Bàn chân" : "Nửa mặt";
    return { center: `${limb} ${side === "left" ? "trái" : "phải"} của khách` };
  }
  if (d.screenLeftIs) {
    const l = d.screenLeftIs === "customer-left";
    return { left: `← ${l ? "Trái" : "Phải"} khách`, right: `${l ? "Phải" : "Trái"} khách →` };
  }
  return undefined;
}

/** Hint blob (levels 1–2) around a screen point; deterministic offset so the blob center isn't the answer. */
export function HintBlob({ at, r, hint, seed }: { at: Pt; r: number; hint: HintLevel; seed: string }) {
  if (hint !== 1 && hint !== 2) return null;
  const big = hint === 1;
  const rad = big ? Math.max(4 * r, 0.085) : Math.max(2 * r, 0.045);
  const off = (big ? 0.45 : 0.3) * rad;
  const a = hash01(seed) * Math.PI * 2;
  const cx = X(at) + Math.cos(a) * off * 1000;
  const cy = Y(at) + Math.sin(a) * off * 1000;
  return (
    <g>
      <circle cx={cx} cy={cy} r={rad * 1000} fill="#5b9be0" opacity={big ? 0.32 : 0.38} filter={big ? "url(#tx-blur)" : "url(#tx-blur-s)"} />
      <circle cx={cx} cy={cy} r={rad * 1000} fill="none" stroke="#ffffff" stroke-width={4} stroke-dasharray="10 14" opacity={0.75} />
    </g>
  );
}

export function TargetDot({ at, color = "var(--sage-dark)", pulse = true }: { at: Pt; color?: string; pulse?: boolean }) {
  return (
    <g>
      {pulse && <circle class="tx-pulse" cx={X(at)} cy={Y(at)} r={26} fill="none" stroke={color} stroke-width={5} />}
      <circle cx={X(at)} cy={Y(at)} r={12} fill={color} stroke="#fff" stroke-width={4} />
    </g>
  );
}

export function HoldRing({ at, frac, color = "var(--ok)" }: { at: Pt; frac: number; color?: string }) {
  const R = 40;
  const c = 2 * Math.PI * R;
  return (
    <g>
      <circle cx={X(at)} cy={Y(at)} r={R} fill="rgba(255,255,255,0.35)" stroke="rgba(138,95,75,0.35)" stroke-width={9} />
      <circle
        cx={X(at)} cy={Y(at)} r={R} fill="none" stroke={color} stroke-width={9} stroke-linecap="round"
        stroke-dasharray={`${c * Math.max(0, Math.min(1, frac))} ${c}`}
        transform={`rotate(-90 ${X(at)} ${Y(at)})`}
      />
      <circle cx={X(at)} cy={Y(at)} r={10} fill={color} stroke="#fff" stroke-width={3} />
    </g>
  );
}

export function FloatText({ at, text, color }: { at: Pt; text: string; color: string }) {
  return (
    <g class="tx-float">
      <text x={X(at)} y={Y(at) - 50} text-anchor="middle" font-size="46" font-weight="700" fill={color}
        stroke="#fff" stroke-width="10" paint-order="stroke" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>{text}</text>
    </g>
  );
}

export function Ripple({ at, color }: { at: Pt; color: string }) {
  return <circle class="tx-ripple" cx={X(at)} cy={Y(at)} r={34} fill="none" stroke={color} stroke-width={6} />;
}

export function Sheet({ children }: { children: ComponentChildren }) {
  return (
    <div class="tx-sheet-bg tx-nohold" onPointerDown={(e) => e.stopPropagation()}>
      <div class="tx-sheet">{children}</div>
    </div>
  );
}

export const gradeColor = { perfect: "var(--ok)", good: "var(--sage-dark)", miss: "var(--warn)" } as const;
export const gradeText = { perfect: "Hoàn hảo!", good: "Tốt", miss: "Chưa đúng" } as const;

/** rAF loop helper: calls fn(dt seconds) while active. */
export function startLoop(fn: (dt: number) => boolean | void): () => void {
  let last = performance.now();
  let id = 0;
  let stopped = false;
  const step = (now: number) => {
    if (stopped) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (fn(dt) === false) return;
    id = requestAnimationFrame(step);
  };
  id = requestAnimationFrame(step);
  return () => { stopped = true; cancelAnimationFrame(id); };
}
