/** Foot reflexology zone task (V12): tap inside the zone polygon, then a short press. */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ItemResult, TapRecord } from "@/core/types";
import { zoneInfo } from "./content";
import type { ZonePlan } from "./plan";
import { Stage } from "./Stage";
import { autoZoomFor, FINGER_TOL_PX, pointInPolygon, polygonDistance, type Grade, type Pt } from "./scoring";
import {
  badgesFor, baseLayers, FREE_FOCUS, gradeColor, gradeText, HintBlob, HoldRing, Ripple, Sheet, startLoop, tapRecord, toScreen, toView,
  type TaskCtx,
} from "./common";
import { playSound } from "./sound";

type Phase = "intro" | "locate" | "retry" | "hold" | "done";
const HOLD_S = 2;

export function ZoneTask({ ctx }: { ctx: TaskCtx }) {
  const plan = ctx.plan as ZonePlan;
  const z = plan.target;
  const info = useMemo(() => zoneInfo(z.id, ctx.all), [z.id, ctx.all]);
  const hint = ctx.hint;
  const foot = ctx.item.kind === "zone" ? ctx.item.foot : "right";
  const [phase, setPhase] = useState<Phase>(hint === 0 ? "intro" : "locate");
  const [tap, setTap] = useState<{ p: Pt; grade: Grade; n: number } | null>(null);
  const res = useRef({ positionScore: 0, attempts: 0, graded: false, firstTap: undefined as TapRecord | undefined });
  const sim = useRef({ pressed: false, held: 0 });
  const [, setTick] = useState(0);

  useEffect(() => { ctx.setPaused(phase === "intro"); }, [phase]);

  // Center of the largest polygon (screen coords) + equivalent radius for hint blobs.
  const { center, rEq } = useMemo(() => {
    const poly = z.polygon as Pt[];
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const c: Pt = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    const r = Math.max(0.02, Math.min(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.4) / 2);
    return { center: toScreen(plan, c), rEq: r };
  }, [z]);

  // Finger-size adaptation (see PointTask). A zone's tolerance ≈ its inner half-size (0.7·rEq) + the "near" margin.
  const nearTol = hint >= 4 ? 0.014 : 0.02;
  const [stageW, setStageW] = useState(0);
  const tolPx = stageW * (0.7 * rEq + nearTol);
  const autoZoomed = useRef(false);
  useEffect(() => {
    if (!stageW) return;
    ctx.reportTol(tolPx);
    if (phase === "locate" && !autoZoomed.current) {
      autoZoomed.current = true;
      if (ctx.zoomAssist && FINGER_TOL_PX / tolPx > 2 && ctx.zoom < autoZoomFor(tolPx)) ctx.setZoom(autoZoomFor(tolPx));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageW, tolPx, phase]);

  const lock = () => setPhase("hold");

  const onTap = (p: Pt) => {
    if (phase !== "locate" && phase !== "retry") return;
    const v = toView(plan, p);
    res.current.attempts += 1;
    if (!res.current.firstTap) res.current.firstTap = tapRecord(plan, v);
    const inside = plan.polys.some((poly) => pointInPolygon(v, poly));
    const near = !inside && Math.min(...plan.polys.map((poly) => polygonDistance(v, poly))) <= nearTol;
    if (phase === "retry") {
      if (inside || near) { setTap({ p, grade: "good", n: res.current.attempts }); playSound("good"); ctx.toast("Đúng vùng rồi. Giữ ấn nhé!", "good"); lock(); }
      else { setTap({ p, grade: "miss", n: res.current.attempts }); playSound("miss"); ctx.toast("Chạm vào vùng đang sáng", "bad"); }
      return;
    }
    const grade: Grade = inside ? "perfect" : near ? "good" : "miss";
    setTap({ p, grade, n: res.current.attempts });
    res.current.graded = true;
    if (grade !== "miss") {
      res.current.positionScore = grade === "perfect" ? 100 : 70;
      playSound(grade === "perfect" ? "perfect" : "good");
      ctx.toast(gradeText[grade], grade);
      lock();
    } else {
      res.current.positionScore = 0;
      playSound("miss");
      ctx.toast("Chưa đúng — xem vùng đúng nhé", "bad");
      setPhase("retry");
    }
  };

  useEffect(() => {
    if (phase !== "hold") return;
    const s = sim.current;
    s.pressed = false;
    ctx.pressRef.current = (down) => { s.pressed = down; };
    const stop = startLoop((dt) => {
      if (s.pressed) { s.held += dt; ctx.setExpr("relaxed"); }
      setTick((n) => n + 1);
      if (s.held >= HOLD_S) {
        setPhase("done");
        playSound("done");
        const r: ItemResult = { item: ctx.item, positionScore: res.current.positionScore, attempts: Math.max(1, res.current.attempts), safetyErrors: 0 };
        if (res.current.firstTap) r.firstTap = res.current.firstTap;
        setTimeout(() => ctx.onDone(r), 700);
        return false;
      }
    });
    return () => { stop(); ctx.pressRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const showZone = hint === 0 || phase === "retry";
  const layers = baseLayers(plan, phase === "retry" ? 0 : hint, ctx.expr, { zone: showZone ? z.svgPath ?? `z-${z.id}` : null });

  return (
    <>
      <div class="tx-canvaswrap">
        <Stage svg={ctx.svg} mirrored={plan.mirrored} layers={layers} cssVars={ctx.cssVars} zoom={ctx.zoom} focus={ctx.zoomAssist ? center : FREE_FOCUS}
          panMode="drag" onTap={onTap} badges={badgesFor(plan)}
          precise={ctx.precise && (phase === "locate" || phase === "retry")}
          focusSeed={ctx.zoomAssist ? ctx.itemKey + "|zoom" : undefined} onMetrics={(m) => setStageW(m.W)}
          qa={import.meta.env.DEV ? { kind: "zone", phase, zoom: ctx.zoom, precise: ctx.precise, tolPx, polys: plan.polys.map((poly) => poly.map((q) => toScreen(plan, q))) } : undefined}>
          {phase === "locate" && <HintBlob at={center} r={rEq / 3} hint={hint} seed={ctx.itemKey + foot} />}
          {(phase === "hold" || phase === "done") && <HoldRing at={tap?.p ?? center} frac={phase === "done" ? 1 : sim.current.held / HOLD_S} />}
          {tap && <g key={tap.n}><Ripple at={tap.p} color={gradeColor[tap.grade]} /></g>}
        </Stage>
      </div>
      <div class="tx-bottom">
        <div class="tx-instr">
          {phase === "locate" && <>Chạm vào vùng phản xạ <b>{info.name}</b> ({foot === "left" ? "chân trái" : "chân phải"})</>}
          {phase === "retry" && <>Chạm vào vùng đang sáng<span class="lm">📍 {info.location}</span></>}
          {phase === "hold" && <>Giữ ngón ở bất kỳ đâu trong <b>{HOLD_S} giây</b></>}
          {phase === "done" && <>✓ Xong vùng {info.name}</>}
        </div>
        {phase === "hold" && <div class="tx-holdbar"><i style={{ width: `${Math.min(100, (sim.current.held / HOLD_S) * 100)}%` }} /></div>}
        {phase !== "hold" && phase !== "done" && ctx.tools}
      </div>
      {phase === "intro" && (
        <Sheet>
          <h2>Phản xạ: {info.name}</h2>
          <div class="sub"><span class="tx-tag">{foot === "left" ? "Chân trái" : "Chân phải"}</span><span class="tx-tag">Vùng mới</span></div>
          <dl>
            <dt>Vị trí</dt><dd>{info.location}</dd>
            <dt>Tương ứng</dt><dd>{info.bodyArea}</dd>
            {info.onlyFoot && <><dt>Chỉ có ở</dt><dd>{info.onlyFoot === "left" ? "bàn chân trái" : "bàn chân phải"}</dd></>}
          </dl>
          <div class="note">Phản xạ học bàn chân mang tính tham khảo trong đào tạo spa.</div>
          <div class="row"><button class="tx-btn primary" onClick={() => setPhase("locate")}>Bắt đầu</button></div>
        </Sheet>
      )}
    </>
  );
}
