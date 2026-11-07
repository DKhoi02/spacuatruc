/** Muscle release task: swipe inside the muscle along the stroke direction, N times. */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ItemResult, SwipeRecord } from "@/core/types";
import { muscleInfo, sideLabel } from "./content";
import type { MusclePlan } from "./plan";
import { Stage, type StrokePhase } from "./Stage";
import { average, evaluateSwipe, inShape, normDist, type Pt, type ShapeLike, type StrokeLike } from "./scoring";
import { badgesFor, baseLayers, FREE_FOCUS, Sheet, toScreen, toView, X, Y, type TaskCtx } from "./common";
import { playSound } from "./sound";

type Phase = "intro" | "swipe" | "done";
const r4 = (n: number) => Math.round(n * 10000) / 10000;

function Arrow({ s, plan, color, dashed, width = 10 }: { s: StrokeLike; plan: MusclePlan; color: "guide" | "ok"; dashed?: boolean; width?: number }) {
  const a = toScreen(plan, s.from), b = toScreen(plan, s.to);
  return (
    <line x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={color === "ok" ? "var(--ok)" : "var(--guide)"} stroke-width={width}
      stroke-linecap="round" stroke-dasharray={dashed ? "4 22" : undefined} marker-end={`url(#tx-arrow${color === "ok" ? "-ok" : ""})`} opacity={dashed ? 0.75 : 0.95} />
  );
}

export function MuscleTask({ ctx }: { ctx: TaskCtx }) {
  const plan = ctx.plan as MusclePlan;
  const m = plan.target;
  const info = useMemo(() => muscleInfo(m.id, ctx.all), [m.id, ctx.all]);
  const hint = ctx.hint;
  const need = info.strokesRequired || 3;
  const [phase, setPhase] = useState<Phase>(hint === 0 ? "intro" : "swipe");
  const [count, setCount] = useState(0);
  const [trail, setTrail] = useState<Pt[]>([]);
  const [last, setLast] = useState<{ ok: boolean; n: number; at: Pt; text: string } | null>(null);
  const [arrow, setArrow] = useState<StrokeLike | null>(null);
  const samples = useRef<Pt[]>([]);
  const res = useRef({ scores: [] as number[], attempts: 0, safetyErrors: 0, lastFailed: false, forbidden: new Set<string>(), firstSwipe: undefined as SwipeRecord | undefined, swipeFailed: false });
  const itemSide = ctx.item.kind === "muscle" ? ctx.item.side : "center";

  useEffect(() => { ctx.setPaused(phase === "intro"); }, [phase]);

  const centroid: Pt = useMemo(() => {
    const xs = m.polygon.map((p) => p[0]), ys = m.polygon.map((p) => p[1]);
    return toScreen(plan, [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]);
  }, [m]);

  const onStroke = (ph: StrokePhase, p: Pt) => {
    if (phase !== "swipe") return;
    if (ph === "start") { samples.current = [toView(plan, p)]; setTrail([p]); return; }
    if (ph === "move") {
      const v = toView(plan, p);
      const prev = samples.current[samples.current.length - 1];
      if (!prev || normDist(prev, v) > 0.004) { samples.current.push(v); setTrail((t) => [...t, p]); }
      return;
    }
    if (ph === "cancel") { samples.current = []; setTrail([]); return; }
    // end
    const pts = samples.current;
    samples.current = [];
    if (pts.length < 2 || normDist(pts[0], pts[pts.length - 1]) < 0.02) { setTrail([]); return; }
    res.current.attempts += 1;
    // forbidden (e.g. carotid) — ≥30% of samples inside
    let safetyNow = false;
    for (const f of plan.data.forbidden as (ShapeLike & { id: string; message: string })[]) {
      const frac = pts.filter((q) => inShape(q, f)).length / pts.length;
      if (frac >= 0.3 && !res.current.forbidden.has(f.id)) {
        res.current.forbidden.add(f.id);
        res.current.safetyErrors += 1;
        safetyNow = true;
        ctx.setExpr("pain", 2200);
        playSound("safety");
        ctx.toast("⚠ " + f.message, "safety", 3600);
      }
    }
    const ev = evaluateSwipe(pts, m as unknown as Parameters<typeof evaluateSwipe>[1]);
    // Keep the first faulty swipe (what the review points out), or the very first swipe while none failed.
    if (!res.current.swipeFailed && (!ev.ok || !res.current.firstSwipe)) {
      const u = plan.data.unwarp ?? ((p: Pt) => p); // canonical art coords for the review
      const a = u(pts[0]), b = u(pts[pts.length - 1]);
      const rec: SwipeRecord = { view: plan.view, from: { x: r4(a[0]), y: r4(a[1]) }, to: { x: r4(b[0]), y: r4(b[1]) } };
      if (plan.mirrored) rec.mirrored = true;
      if (!ev.ok) { rec.issue = ev.reason === "outside" ? "outside" : ev.reason === "direction" ? "direction" : "short"; res.current.swipeFailed = true; }
      res.current.firstSwipe = rec;
    }
    const end = toScreen(plan, pts[pts.length - 1]);
    if (ev.ok) {
      res.current.scores.push(ev.score);
      res.current.lastFailed = false;
      setArrow(null);
      const c = count + 1;
      setCount(c);
      const perfect = ev.score >= 90;
      setLast({ ok: true, n: res.current.attempts, at: end, text: perfect ? "Hoàn hảo!" : "Tốt" });
      if (!res.current.forbidden.size) ctx.setExpr("relaxed", 1500);
      playSound(perfect ? "perfect" : "good");
      if (!safetyNow) ctx.toast(perfect ? "Hoàn hảo!" : "Tốt", perfect ? "perfect" : "good");
      if (c >= need) {
        setPhase("done");
        const score = Math.round(average(res.current.scores));
        playSound("done");
        const r: ItemResult = { item: ctx.item, positionScore: score, swipeScore: score, attempts: res.current.attempts, safetyErrors: res.current.safetyErrors };
        if (res.current.firstSwipe) r.firstSwipe = res.current.firstSwipe;
        setTimeout(() => ctx.onDone(r), 800);
      }
    } else {
      if (!res.current.lastFailed) res.current.scores.push(0);
      res.current.lastFailed = true;
      setArrow(ev.stroke);
      playSound("miss");
      const why = ev.reason === "outside" ? `Vuốt trên ${info.name.toLowerCase()} nhé` : ev.reason === "direction" ? "Sai hướng — vuốt theo mũi tên" : "Vuốt dài hơn một chút";
      if (!safetyNow) ctx.toast(why, "bad", 2200);
      setLast({ ok: false, n: res.current.attempts, at: end, text: "Chưa đúng" });
    }
    setTimeout(() => setTrail([]), 350);
  };

  // Layers: hint 0–1 → target muscle highlighted (+ fibers at 0); after a miss also highlight.
  const showMuscle = hint <= 1 || arrow !== null;
  const layers = baseLayers(plan, hint, ctx.expr, { muscle: showMuscle ? m.svgPath ?? null : null, fibers: false });
  const trailD = trail.map((p, i) => `${i ? "L" : "M"}${X(p).toFixed(1)} ${Y(p).toFixed(1)}`).join(" ");

  return (
    <>
      <div class="tx-canvaswrap">
        <Stage svg={ctx.svg} mirrored={plan.mirrored} layers={layers} cssVars={ctx.cssVars} zoom={ctx.zoom} focus={ctx.zoomAssist ? centroid : FREE_FOCUS}
          panMode="twofinger" onStroke={onStroke} badges={badgesFor(plan)}
          qa={import.meta.env.DEV ? { kind: "muscle", phase, count, need, strokes: m.strokes.map((st) => [toScreen(plan, st.from), toScreen(plan, st.to)]) } : undefined}>
          {hint === 0 && phase !== "done" && m.strokes.map((s, i) => <Arrow key={i} s={s} plan={plan} color="guide" dashed width={8} />)}
          {arrow && <g class="tx-pulse-soft"><Arrow s={arrow} plan={plan} color="ok" width={14} /></g>}
          {trailD && <path d={trailD} fill="none" stroke="rgba(255,255,255,0.9)" stroke-width={22} stroke-linecap="round" stroke-linejoin="round" />}
          {trailD && <path d={trailD} fill="none" stroke="var(--rose)" stroke-width={10} stroke-linecap="round" stroke-linejoin="round" />}
        </Stage>
      </div>
      <div class="tx-bottom">
        <div class="tx-instr">
          {phase === "done" ? <>✓ Xong {info.name}</> : <>Vuốt <b>{info.name}</b>{itemSide !== "center" ? ` (${sideLabel(itemSide)} của khách)` : ""} — {count}/{need} lần
            {(hint <= 1 || arrow) && <span class="lm">↗ {info.strokeDirection}</span>}</>}
        </div>
        <div class="tx-holdbar"><i style={{ width: `${(count / need) * 100}%` }} /></div>
        {phase !== "done" && ctx.tools}
      </div>
      {phase === "intro" && (
        <Sheet>
          <h2>{info.name}</h2>
          <div class="sub">{info.latin && <span class="tx-tag">{info.latin}</span>}{itemSide !== "center" && <span class="tx-tag">{sideLabel(itemSide)} của khách</span>}<span class="tx-tag">Cơ mới</span></div>
          <dl>
            {info.location && <><dt>Vị trí</dt><dd>{info.location}</dd></>}
            <dt>Hướng vuốt</dt><dd>{info.strokeDirection}</dd>
            <dt>Số lần</dt><dd>{need} lần vuốt</dd>
          </dl>
          {info.safetyNote && <div class="warn">⚠ {info.safetyNote}</div>}
          <div class="row"><button class="tx-btn primary" onClick={() => setPhase("swipe")}>Bắt đầu</button></div>
        </Sheet>
      )}
    </>
  );
}
