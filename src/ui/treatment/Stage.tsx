/**
 * Treatment canvas: inlines a view SVG (+ optional V13–V15 overlay), toggles layer groups, recolors skin/hair via
 * CSS variables, supports 1×/2× zoom around a focus point with pan, and reports taps / strokes in SCREEN-normalized
 * coords (0–1 of the drawn 1000×1400 frame, after mirroring). Children are drawn in a screen-space SVG
 * (viewBox 0 0 1000 1400) above the art.
 *
 * Precision mode (`precise`, tap tasks only): a touch shows a reticle ~48 px above the finger with a 2× magnifier
 * (a clone of the stage), dragging moves it, release taps at the reticle, a 2nd finger / cancel / leaving the canvas
 * aborts. Mouse input always taps directly at the cursor.
 */
import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { hash01, type Pt } from "./scoring";

export interface LayerSpec {
  landmarks: boolean;
  guides: boolean;
  /** Muscle svg id to show (others hidden); null hides the muscles layer. */
  muscle: string | null;
  fibers: boolean;
  /** Zone svg id to show; null hides the zones layer. */
  zone: string | null;
  /** All variant group ids that must be visible (e.g. "state-eyes-open", "expr-pain"). */
  show: string[];
  /** Variant group ids that must be hidden. */
  hide: string[];
}

export interface OverlaySpec {
  svg: string;
  mirrored?: boolean;
  /** group id → opacity (0 hides). Groups not listed are hidden. */
  groups: Record<string, number>;
}

export type StrokePhase = "start" | "move" | "end" | "cancel";

export interface StageProps {
  svg: string | null;
  mirrored: boolean;
  layers: LayerSpec;
  overlay?: OverlaySpec | null;
  cssVars: Record<string, string>;
  zoom: number;
  /** Screen-normalized point to center when zoomed. */
  focus: Pt;
  /** "drag": one-finger drag pans when zoomed (tap tasks). "twofinger": only two fingers pan (swipe tasks). */
  panMode: "drag" | "twofinger";
  onTap?: (p: Pt) => void;
  onStroke?: (phase: StrokePhase, p: Pt) => void;
  innerRef?: { current: HTMLDivElement | null };
  children?: ComponentChildren;
  badges?: { left?: string; right?: string; center?: string };
  /** Reticle + magnifier tapping for small targets (touch / pen only). */
  precise?: boolean;
  /** When set, the zoom view is centered at a deterministic offset from `focus` (so zooming never shows the exact answer). */
  focusSeed?: string;
  /** Reports the drawn width W of the 1000×1400 frame at 1× (CSS px). */
  onMetrics?: (m: { W: number }) => void;
  /** DEV-only test hook: serialized into data-qa on the stage area (targets in screen-normalized coords). */
  qa?: unknown;
}

const q = (root: Element, id: string) => root.querySelector(`[id="${id}"]`) as SVGElement | HTMLElement | null;
const setDisp = (el: Element | null, on: boolean) => { if (el) (el as HTMLElement).style.display = on ? "" : "none"; };

function applyLayers(root: HTMLElement, l: LayerSpec) {
  const lm = q(root, "landmarks");
  if (lm) {
    lm.style.display = "";
    for (const c of Array.from(lm.children)) setDisp(c, l.landmarks || c.id === "spinous-processes");
  }
  setDisp(q(root, "lm-dorsalis-pedis"), l.landmarks);
  setDisp(q(root, "guides"), l.guides);
  const mus = q(root, "muscles");
  if (mus) {
    mus.style.display = l.muscle ? "" : "none";
    for (const c of Array.from(mus.children)) {
      if (c.id === "muscle-fibers") setDisp(c, l.fibers);
      else {
        setDisp(c, c.id === l.muscle);
        c.classList.toggle("tx-hl", c.id === l.muscle);
      }
    }
  }
  const zones = q(root, "zones");
  if (zones) {
    zones.style.display = l.zone ? "" : "none";
    for (const c of Array.from(zones.children)) {
      setDisp(c, c.id === l.zone);
      c.classList.toggle("tx-hl", c.id === l.zone);
    }
  }
  for (const id of l.hide) setDisp(q(root, id), false);
  for (const id of l.show) setDisp(q(root, id), true);
}

function applyOverlay(root: HTMLElement, o: OverlaySpec) {
  const svg = root.querySelector("svg");
  if (!svg) return;
  const all = Array.from(svg.querySelectorAll("g[id]")) as SVGGElement[];
  const listed = new Set(Object.keys(o.groups));
  for (const g of all) {
    // A group is visible when it is listed (or inside a listed visible group and not itself listed).
    if (listed.has(g.id)) {
      const v = o.groups[g.id];
      g.style.display = v > 0 ? "" : "none";
      g.style.opacity = String(Math.max(0, Math.min(1, v)));
      g.style.transition = "opacity 0.25s";
    } else if (!g.parentElement?.closest("g[id]")) {
      g.style.display = "none";
    }
  }
}

/** Reticle offset above the fingertip and magnifier geometry (CSS px). */
export const AIM_OFFSET = 48;
const LENS_D = 88;
const LENS_MAG = 2;
const EDGE = 26;

interface Aim { id: number; fx: number; fy: number; raf: number; clone: HTMLElement | null; out: boolean; ox: number; oy: number }

export function Stage(p: StageProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const ovRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 390, h: 540 });
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>());
  const gesture = useRef<{ mode: "none" | "tap" | "stroke" | "pan" | "aim"; id: number; moved: number }>({ mode: "none", id: -1, moved: 0 });
  const lensRef = useRef<HTMLDivElement>(null);
  const lensViewRef = useRef<HTMLDivElement>(null);
  const aim = useRef<Aim | null>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setArea({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const W = Math.max(50, Math.min(area.w, area.h / 1.4));
  const H = W * 1.4;
  const bx = (area.w - W) / 2;
  const by = (area.h - H) / 2;
  const z = p.zoom;

  const clampPan = (x: number, y: number) => {
    if (z <= 1) return { x: 0, y: 0 };
    const cl = (v: number, a: number, b: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), v));
    return { x: cl(x, -bx, area.w - bx - z * W), y: cl(y, -by, area.h - by - z * H) };
  };

  const clampRef = useRef(clampPan);
  clampRef.current = clampPan;

  useEffect(() => { p.onMetrics?.({ W }); }, [W]);

  // Re-center on focus when zoom or focus changes. With a seed, the view center is shifted by up to 35% of the
  // visible half-extent in a deterministic direction: the target stays well inside the view but is not dead center.
  let fx = p.focus[0], fy = p.focus[1];
  if (p.focusSeed && z > 1) {
    const a = hash01(p.focusSeed) * Math.PI * 2;
    const k = 0.2 + 0.15 * hash01(p.focusSeed + "k");
    fx += Math.cos(a) * k * (area.w / (2 * z * W));
    fy += Math.sin(a) * k * (area.h / (2 * z * H));
  }
  useEffect(() => {
    setPan(clampPan(area.w / 2 - bx - z * fx * W, area.h / 2 - by - z * fy * H));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [z, fx, fy, W, H]);

  // ── Precision aim (reticle + magnifier) ──
  const reticle = (a: Aim) => ({ x: a.fx, y: a.fy - AIM_OFFSET });
  const frame = () => {
    const a = aim.current, stage = innerRef.current, area = areaRef.current, lens = lensRef.current;
    if (!a || !stage || !area || !lens) return;
    const ar = area.getBoundingClientRect();
    const r = reticle(a);
    a.out = r.x < ar.left || r.x > ar.right || r.y < ar.top || r.y > ar.bottom;
    // Edge auto-pan while zoomed: aiming near the canvas border scrolls the view.
    if (zRef.current > 1 && !a.out) {
      const push = (d: number) => (d < EDGE ? ((EDGE - d) / EDGE) * 7 : 0);
      const dx = push(r.x - ar.left) - push(ar.right - r.x);
      const dy = push(r.y - ar.top) - push(ar.bottom - r.y);
      if (dx || dy) setPan((s) => clampRef.current(s.x + dx, s.y + dy));
    }
    const sr = stage.getBoundingClientRect();
    if (a.clone) {
      const tx = LENS_D / 2 - (r.x - sr.left) * LENS_MAG;
      const ty = LENS_D / 2 - (r.y - sr.top) * LENS_MAG;
      a.clone.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${zRef.current * LENS_MAG})`;
    }
    lens.style.transform = `translate3d(${r.x - a.ox - LENS_D / 2}px, ${r.y - a.oy - LENS_D / 2}px, 0)`;
    lens.classList.toggle("out", a.out);
    a.raf = requestAnimationFrame(frame);
  };
  const startAim = (e: PointerEvent) => {
    stopAim();
    const stage = innerRef.current, view = lensViewRef.current, lens = lensRef.current;
    if (!stage || !view || !lens) return;
    const clone = stage.cloneNode(true) as HTMLElement;
    clone.removeAttribute("data-qa");
    clone.classList.add("tx-lens-stage");
    clone.style.left = "0px";
    clone.style.top = "0px";
    view.appendChild(clone);
    stage.style.transition = "none"; // follow edge-pan 1:1 while aiming
    // The lens is position:fixed; measure its real origin in case an ancestor creates a containing block.
    lens.style.transform = "none";
    lens.style.display = "block";
    const o = lens.getBoundingClientRect();
    aim.current = { id: e.pointerId, fx: e.clientX, fy: e.clientY, raf: 0, clone, out: false, ox: o.left, oy: o.top };
    frame();
  };
  function stopAim() {
    const a = aim.current;
    if (!a) return;
    cancelAnimationFrame(a.raf);
    a.clone?.remove();
    aim.current = null;
    if (lensRef.current) lensRef.current.style.display = "none";
    if (innerRef.current) innerRef.current.style.transition = "";
  }
  const zRef = useRef(z);
  zRef.current = z;
  useEffect(() => { if (!p.precise) { stopAim(); if (gesture.current.mode === "aim") gesture.current.mode = "none"; } }, [p.precise]);
  useEffect(() => () => stopAim(), []);

  // Layers
  const layerKey = JSON.stringify(p.layers);
  useLayoutEffect(() => {
    if (artRef.current && p.svg) applyLayers(artRef.current, p.layers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerKey, p.svg]);
  const ovKey = p.overlay ? JSON.stringify(p.overlay.groups) : "";
  useLayoutEffect(() => {
    if (ovRef.current && p.overlay) applyOverlay(ovRef.current, p.overlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ovKey, p.overlay?.svg]);

  const norm = (cx: number, cy: number): Pt => {
    const r = innerRef.current!.getBoundingClientRect();
    return [(cx - r.left) / r.width, (cy - r.top) / r.height];
  };

  const onDown = (e: PointerEvent) => {
    if ((e.target as Element).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    const g = gesture.current;
    if (pointers.current.size >= 2) {
      if (g.mode === "stroke") p.onStroke?.("cancel", norm(e.clientX, e.clientY));
      if (g.mode === "aim") stopAim();
      g.mode = z > 1 ? "pan" : "none";
      return;
    }
    g.id = e.pointerId;
    g.moved = 0;
    if (p.onStroke) {
      g.mode = "stroke";
      p.onStroke("start", norm(e.clientX, e.clientY));
    } else if (p.precise && p.onTap && e.pointerType !== "mouse") {
      g.mode = "aim";
      startAim(e);
    } else g.mode = "tap";
  };
  const onMove = (e: PointerEvent) => {
    const pt = pointers.current.get(e.pointerId);
    if (!pt) return;
    const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
    pt.x = e.clientX; pt.y = e.clientY;
    const g = gesture.current;
    if (g.mode === "pan") {
      const n = pointers.current.size || 1;
      setPan((s) => clampPan(s.x + dx / n, s.y + dy / n));
      return;
    }
    if (e.pointerId !== g.id) return;
    g.moved = Math.hypot(e.clientX - pt.sx, e.clientY - pt.sy);
    if (g.mode === "aim") {
      const a = aim.current;
      if (!a) return;
      a.fx = e.clientX; a.fy = e.clientY;
      // The finger leaving the canvas aborts the aim.
      const ar = areaRef.current!.getBoundingClientRect();
      if (e.clientX < ar.left || e.clientX > ar.right || e.clientY < ar.top || e.clientY > ar.bottom) { stopAim(); g.mode = "none"; }
      return;
    }
    if (g.mode === "stroke") p.onStroke?.("move", norm(e.clientX, e.clientY));
    else if (g.mode === "tap" && g.moved > 10 && z > 1 && p.panMode === "drag") g.mode = "pan";
  };
  const onUp = (e: PointerEvent) => {
    const pt = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!pt) return;
    if (e.pointerId === g.id) {
      if (g.mode === "tap" && g.moved <= 12 && e.type === "pointerup") p.onTap?.(norm(e.clientX, e.clientY));
      if (g.mode === "aim") {
        const a = aim.current;
        if (a) {
          a.fx = e.clientX; a.fy = e.clientY;
          const ar = areaRef.current!.getBoundingClientRect();
          const r = reticle(a);
          const out = r.x < ar.left || r.x > ar.right || r.y < ar.top || r.y > ar.bottom;
          stopAim();
          if (e.type === "pointerup" && !out) p.onTap?.(norm(r.x, r.y));
        }
      }
      if (g.mode === "stroke") p.onStroke?.(e.type === "pointerup" ? "end" : "cancel", norm(e.clientX, e.clientY));
    }
    if (pointers.current.size === 0) g.mode = "none";
  };

  return (
    <div
      class="tx-area"
      ref={areaRef}
      data-qa={import.meta.env.DEV && p.qa ? JSON.stringify(p.qa) : undefined}
      onPointerDown={onDown as never}
      onPointerMove={onMove as never}
      onPointerUp={onUp as never}
      onPointerCancel={onUp as never}
    >
      <div
        class="tx-stage"
        ref={(el) => { innerRef.current = el; if (p.innerRef) p.innerRef.current = el; }}
        style={{
          left: `${bx}px`, top: `${by}px`, width: `${W}px`, height: `${H}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${z})`,
          ...p.cssVars,
        }}
      >
        <div class={"tx-art" + (p.mirrored ? " tx-mirror" : "")} ref={artRef} dangerouslySetInnerHTML={{ __html: p.svg ?? "" }} />
        {p.overlay && (
          <div class={"tx-art tx-overlay" + (p.overlay.mirrored ? " tx-mirror" : "")} ref={ovRef} dangerouslySetInnerHTML={{ __html: p.overlay.svg }} />
        )}
        <svg class="tx-marks" viewBox="0 0 1000 1400" preserveAspectRatio="none">
          <defs>
            <filter id="tx-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>
            <filter id="tx-blur-s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
            <marker id="tx-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--guide)" />
            </marker>
            <marker id="tx-arrow-ok" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--ok)" />
            </marker>
          </defs>
          {p.children}
        </svg>
      </div>
      <div class="tx-lens" ref={lensRef} aria-hidden="true">
        <div class="tx-lens-view" ref={lensViewRef} />
        <svg class="tx-lens-cross" viewBox="0 0 88 88">
          <path d="M44 14 V36 M44 52 V74 M14 44 H36 M52 44 H74" stroke="#fff" stroke-width="4" stroke-linecap="round" />
          <path d="M44 14 V36 M44 52 V74 M14 44 H36 M52 44 H74" stroke="var(--outline, #8a5f4b)" stroke-width="2" stroke-linecap="round" />
          <circle cx="44" cy="44" r="3" fill="var(--danger, #e04f4f)" stroke="#fff" stroke-width="1.5" />
        </svg>
      </div>
      {p.badges && (
        <>
          {p.badges.left && <div class="tx-badge tx-badge-l">{p.badges.left}</div>}
          {p.badges.right && <div class="tx-badge tx-badge-r">{p.badges.right}</div>}
          {p.badges.center && <div class="tx-badge tx-badge-c">{p.badges.center}</div>}
        </>
      )}
    </div>
  );
}
