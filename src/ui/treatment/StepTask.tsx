/** Care steps (skin care / hair wash / foot soak / hot stones): simple pleasant interactions, score 100 when done. */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { careInfo } from "./content";
import type { StepPlan } from "./plan";
import { Stage, type OverlaySpec, type StrokePhase } from "./Stage";
import { normDist, type Pt } from "./scoring";
import { baseLayers, HoldRing, startLoop, X, Y, type CareState, type TaskCtx } from "./common";
import { playSound } from "./sound";

const ACTION: Record<string, string> = {
  cleanse: "vuốt qua lại khắp mặt", steam: "giữ ngón để xông hơi", scrub: "xoa qua lại trên mặt", mask: "vuốt để dán mặt nạ",
  wet: "vuốt trên tóc để làm ướt", shampoo: "xoa để tạo bọt", rinse: "vuốt để xả sạch bọt", dry: "giữ ngón để lau khô",
  soak: "giữ ngón để ngâm chân", "place-stones": "kéo đá vào các vòng tròn",
};
const RUB_UNIT = 0.32; // width-fractions of rubbing per "swipe"

function stonesFrom(svg: string | null): { id: string; at: Pt }[] {
  if (!svg) return [];
  const out: { id: string; at: Pt }[] = [];
  const re = /id="(stone-\d+)"[^>]*?translate\(\s*([\d.]+)[ ,]+([\d.]+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) out.push({ id: m[1], at: [Number(m[2]) / 1000, Number(m[3]) / 1400] });
  return out;
}

export function StepTask({ ctx }: { ctx: TaskCtx }) {
  const plan = ctx.plan as StepPlan;
  const step = plan.step;
  const info = careInfo(step);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [pressed, setPressed] = useState(false);
  const rub = useRef({ last: null as Pt | null, dist: 0, ticks: 0 });
  const innerRef = useRef<HTMLDivElement | null>(null);
  const stones = useMemo(() => stonesFrom(ctx.overlaySvg), [ctx.overlaySvg]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => { ctx.setPaused(false); }, []);

  const complete = () => {
    if (done) return;
    setDone(true);
    playSound("done");
    const c: CareState = { ...ctx.care };
    if (step === "cleanse") c.faceFoam = 0;
    if (step === "scrub") c.scrub = 0;
    if (step === "mask") c.mask = 1;
    if (step === "wet") c.wet = 1;
    if (step === "shampoo") { c.hairFoam = 1; c.wet = 1; }
    if (step === "rinse") c.hairFoam = 0;
    if (step === "dry") c.wet = 0;
    ctx.setExpr("relaxed", 1800);
    ctx.toast("Khách thấy dễ chịu 😌", "good");
    setTimeout(() => { ctx.setCare(c); ctx.onDone({ item: ctx.item, positionScore: 100, attempts: 1, safetyErrors: 0 }); }, 900);
  };

  // Rub
  const onStroke = (ph: StrokePhase, p: Pt) => {
    if (done || plan.mode !== "rub") return;
    const r = rub.current;
    if (ph === "start") { r.last = p; return; }
    if (ph !== "move") { r.last = null; return; }
    if (r.last && p[0] > -0.05 && p[0] < 1.05) r.dist += Math.min(0.08, normDist(r.last, p));
    r.last = p;
    const pr = Math.min(1, r.dist / (plan.amount * RUB_UNIT));
    const ticks = Math.floor(pr * plan.amount);
    if (ticks > r.ticks) { r.ticks = ticks; playSound("tick"); }
    setProgress(pr);
    if (pr >= 1) complete();
  };

  // Hold
  useEffect(() => {
    if (plan.mode !== "hold" || done) return;
    let held = 0;
    let isDown = false;
    ctx.pressRef.current = (d) => { isDown = d; setPressed(d); };
    const stop = startLoop((dt) => {
      if (isDown) { held += dt; setProgress(Math.min(1, held / plan.amount)); }
      if (held >= plan.amount) { complete(); return false; }
    });
    return () => { stop(); ctx.pressRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // Stones drag
  const onStoneDown = (id: string) => (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ id, x: e.clientX, y: e.clientY });
  };
  const onStoneMove = (e: PointerEvent) => { if (drag) setDrag({ ...drag, x: e.clientX, y: e.clientY }); };
  const onStoneUp = (e: PointerEvent) => {
    if (!drag) return;
    setDrag(null);
    const el = innerRef.current;
    if (!el || e.type !== "pointerup") return;
    const r = el.getBoundingClientRect();
    const p: Pt = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    let best: { id: string; d: number } | null = null;
    for (const s of stones) {
      if (placed.includes(s.id)) continue;
      const d = normDist(p, s.at);
      if (d < 0.1 && (!best || d < best.d)) best = { id: s.id, d };
    }
    if (best) {
      const np = [...placed, best.id];
      setPlaced(np);
      playSound("good");
      setProgress(np.length / stones.length);
      if (np.length >= stones.length) complete();
    } else {
      playSound("miss");
      ctx.toast("Đặt đá vào vòng tròn trên lưng", "bad");
    }
  };

  // Overlay groups from care state + current progress
  const care = ctx.care;
  const pr = done ? 1 : progress;
  let overlay: OverlaySpec | null = null;
  if (ctx.overlaySvg && plan.overlay === "V13") {
    overlay = { svg: ctx.overlaySvg, groups: {
      foam: step === "cleanse" ? (done ? 0 : pr) : care.faceFoam,
      scrub: step === "scrub" ? (done ? 0 : pr) : care.scrub,
      mask: step === "mask" ? pr : care.mask,
    } };
  } else if (ctx.overlaySvg && plan.overlay === "V14") {
    const wet = step === "wet" ? pr : step === "dry" ? 1 - pr : step === "shampoo" || step === "rinse" ? 1 : care.wet;
    const foam = step === "shampoo" ? pr : step === "rinse" ? 1 - pr : care.hairFoam;
    const top = plan.view === "V03";
    overlay = { svg: ctx.overlaySvg, groups: {
      "wet-hair": wet, "wet-top": top ? wet : 0, "wet-back": top ? 0 : wet,
      foam, "foam-top": top ? foam : 0, "foam-back": top ? 0 : foam,
    } };
  } else if (ctx.overlaySvg && plan.overlay === "V15") {
    const g: Record<string, number> = { stones: 1 };
    for (const s of stones) g[s.id] = placed.includes(s.id) ? 1 : 0;
    overlay = { svg: ctx.overlaySvg, groups: g };
  }

  const layers = baseLayers(plan, 3, step === "mask" || step === "steam" ? "relaxed" : ctx.expr, { show: [], hide: [] });
  // eyes closed for face care if the view has the variant
  if (plan.view === "V01") {
    const eyes = plan.data.variants?.eyes ?? [];
    if (eyes.includes("eyes-closed")) {
      layers.show.push("state-eyes-closed");
      layers.hide.push(...eyes.filter((e) => e !== "eyes-closed").map((e) => `state-${e}`));
    }
    const exprs = plan.data.variants?.expr ?? [];
    const want = ctx.expr === "pain" ? "expr-pain" : "expr-relaxed";
    for (const e of exprs) (e === want ? layers.show : layers.hide).push(e);
    for (const mo of plan.data.variants?.mouth ?? []) (mo === (plan.variants.mouth ?? "mouth-closed") ? layers.show : layers.hide).push(`state-${mo}`);
  }

  const center: Pt = plan.view === "V01" ? [0.5, 0.5] : plan.view === "V06" ? [0.5, 0.45] : [0.5, 0.5];
  const steam = step === "steam" && (pressed || done);

  return (
    <>
      <div class="tx-canvaswrap">
        <Stage svg={ctx.svg} mirrored={false} layers={layers} overlay={overlay} cssVars={ctx.cssVars} zoom={ctx.zoom} focus={center}
          panMode={plan.mode === "rub" ? "twofinger" : "drag"} onStroke={plan.mode === "rub" ? onStroke : undefined} innerRef={innerRef}
          qa={import.meta.env.DEV ? { kind: "step", step, mode: plan.mode, done, stones: stones.filter((st) => !placed.includes(st.id)).map((st) => st.at) } : undefined}>
          {steam && [0, 1, 2, 3, 4].map((i) => (
            <circle key={i} class="tx-steam" cx={340 + i * 80} cy={860} r={60} fill="#ffffff" opacity={0.7} filter="url(#tx-blur-s)" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
          {step === "soak" && (
            <g>
              <rect x={-20} y={1400 - pr * 700} width={1040} height={pr * 700 + 20} fill="#9ccfd8" opacity={0.45} />
              <path d={`M-20 ${1400 - pr * 700} q 130 -26 260 0 t 260 0 t 260 0 t 260 0`} fill="none" stroke="#fff" stroke-width={8} opacity={0.8} />
            </g>
          )}
          {step === "dry" && pressed && [0, 1, 2].map((i) => (
            <path key={i} class="tx-steam" d={`M${300 + i * 160} 1000 q 30 -60 0 -120 q -30 -60 0 -120`} fill="none" stroke="#fff" stroke-width={10} stroke-linecap="round" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          {plan.mode === "stones" && stones.filter((s) => !placed.includes(s.id)).map((s) => (
            <circle key={s.id} cx={X(s.at)} cy={Y(s.at)} r={46} fill="rgba(232,180,106,0.18)" stroke="var(--amber)" stroke-width={5} stroke-dasharray="12 10" />
          ))}
          {plan.mode === "hold" && !done && <HoldRing at={center} frac={progress} />}
        </Stage>
      </div>
      <div class="tx-bottom">
        <div class="tx-instr">{done ? <>✓ Xong: {info.name}</> : <><b>{info.name}</b> — {ACTION[step]}<span class="lm">{info.instruction}</span></>}</div>
        {plan.mode === "stones" ? (
          <div class="tx-tray tx-nohold">
            {stones.filter((s) => !placed.includes(s.id)).map((s) => (
              <div key={s.id} class="tx-stone" style={{ opacity: drag?.id === s.id ? 0.3 : 1 }}
                onPointerDown={onStoneDown(s.id) as never} onPointerMove={onStoneMove as never} onPointerUp={onStoneUp as never} onPointerCancel={onStoneUp as never} />
            ))}
          </div>
        ) : (
          <div class="tx-holdbar"><i style={{ width: `${pr * 100}%` }} /></div>
        )}
        {!done && ctx.tools}
      </div>
      {drag && <div class="tx-stone ghost" style={{ left: `${drag.x}px`, top: `${drag.y}px` }} />}
    </>
  );
}
