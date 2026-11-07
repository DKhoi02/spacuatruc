/** Acupoint task: locate (tap) → lock → hold (ch1: time only; ch2+: force bar). */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ItemResult, TapRecord } from "@/core/types";
import { FORCE_LABEL, pointInfo, sideLabel } from "./content";
import type { PointPlan } from "./plan";
import { Stage } from "./Stage";
import { ForceBar } from "./ForceBar";
import {
  autoZoomFor, FINGER_TOL_PX, FORCE_ZONES, forceScoreOf, forceZoneOf, inShape, lighterForce, normDist, scorePosition, stepForce, toleranceRadius,
  type Grade, type Pt, type ShapeLike,
} from "./scoring";
import {
  badgesFor, baseLayers, FREE_FOCUS, gradeColor, gradeText, HintBlob, HoldRing, Ripple, Sheet, startLoop, TargetDot,
  tapRecord, toScreen, toView, type TaskCtx,
} from "./common";
import { playSound } from "./sound";

type Phase = "intro" | "locate" | "retry" | "hold" | "done";

export function PointTask({ ctx }: { ctx: TaskCtx }) {
  const plan = ctx.plan as PointPlan;
  const t = plan.target;
  const info = useMemo(() => pointInfo(t.id, ctx.all), [t.id, ctx.all]);
  const hint = ctx.hint;
  const contra = ctx.pregnant && info.pregnancy === "contraindicated";
  const caution = ctx.pregnant && info.pregnancy === "caution";
  const reqForce = caution ? lighterForce(info.force) : info.force;
  const tol = toleranceRadius(t.r, hint);
  const useForce = ctx.config.useForceBar;
  const seconds = info.seconds || 3;
  const tgt: Pt = toScreen(plan, [t.x, t.y]);
  const itemSide = ctx.item.kind === "point" ? ctx.item.side : "center";

  const [phase, setPhase] = useState<Phase>(hint === 0 ? "intro" : "locate");
  const res = useRef({ positionScore: 0, attempts: 0, safetyErrors: 0, graded: false, forbidden: new Set<string>(), forceScore: undefined as number | undefined, firstTap: undefined as TapRecord | undefined, forceOver: false });
  const [tap, setTap] = useState<{ p: Pt; grade: Grade; n: number } | null>(null);
  const [landmark, setLandmark] = useState<string | null>(null);
  const sim = useRef({ pressed: false, held: 0, force: 0, inZone: 0, total: 0, started: false, over: 0, overWarned: false, safetyCounted: false, earlyWarned: false });
  const [, setTick] = useState(0);

  useEffect(() => { ctx.setPaused(phase === "intro"); }, [phase]);

  // Finger-size adaptation: report the 1× on-screen tolerance; auto-zoom once when the item starts if it's tiny.
  const [stageW, setStageW] = useState(0);
  const tolPx = stageW * tol;
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

  const finish = () => {
    setPhase("done");
    playSound("done");
    const r: ItemResult = {
      item: ctx.item, positionScore: res.current.positionScore, attempts: Math.max(1, res.current.attempts),
      safetyErrors: res.current.safetyErrors,
    };
    if (res.current.forceScore !== undefined) r.forceScore = res.current.forceScore;
    if (res.current.firstTap) r.firstTap = res.current.firstTap;
    if (res.current.forceOver) r.forceIssue = "over";
    else if (res.current.forceScore !== undefined && res.current.forceScore < 70) r.forceIssue = "under";
    setTimeout(() => ctx.onDone(r), 750);
  };

  const lock = () => {
    if (contra) {
      res.current.safetyErrors += 1;
      ctx.setExpr("pain", 2500);
      playSound("safety");
      ctx.toast(`Khách đang mang thai: ${info.name} chống chỉ định! Lẽ ra phải bấm "Không làm huyệt này".`, "safety", 3800);
      setPhase("done");
      const r: ItemResult = { item: ctx.item, positionScore: res.current.positionScore, attempts: Math.max(1, res.current.attempts), safetyErrors: res.current.safetyErrors };
      if (res.current.firstTap) r.firstTap = res.current.firstTap;
      setTimeout(() => ctx.onDone(r), 2200);
      return;
    }
    setLandmark(null);
    setPhase("hold");
  };

  const onTap = (p: Pt) => {
    if (phase !== "locate" && phase !== "retry") return;
    const v = toView(plan, p);
    const d = normDist(v, [t.x, t.y]);
    res.current.attempts += 1;
    if (!res.current.firstTap) res.current.firstTap = tapRecord(plan, v);
    const g = scorePosition(d, tol);
    if (phase === "retry") {
      if (d <= Math.max(tol, t.r)) {
        setTap({ p, grade: "good", n: res.current.attempts });
        playSound("good");
        ctx.toast("Đúng chỗ rồi. Giờ giữ ấn nhé!", "good");
        lock();
      } else {
        setTap({ p, grade: "miss", n: res.current.attempts });
        playSound("miss");
        ctx.toast("Chạm vào chấm đang sáng", "bad");
      }
      return;
    }
    setTap({ p, grade: g.grade, n: res.current.attempts });
    if (g.grade !== "miss") {
      if (!res.current.graded) res.current.positionScore = g.score;
      res.current.graded = true;
      playSound(g.grade === "perfect" ? "perfect" : "good");
      ctx.toast(gradeText[g.grade], g.grade);
      lock();
      return;
    }
    res.current.graded = true;
    res.current.positionScore = 0;
    // Forbidden zone?
    const fb = (plan.data.forbidden as (ShapeLike & { id: string; message: string })[]).find((f) => inShape(v, f));
    if (fb) {
      if (!res.current.forbidden.has(fb.id)) { res.current.forbidden.add(fb.id); res.current.safetyErrors += 1; }
      ctx.setExpr("pain", 2200);
      playSound("safety");
      ctx.toast("⚠ " + fb.message, "safety", 3600);
    } else if (plan.otherSide && normDist(v, [plan.otherSide.x, plan.otherSide.y]) <= Math.max(tol, plan.otherSide.r)) {
      playSound("miss");
      ctx.toast(`Sai bên! Đó là ${sideLabel(plan.otherSide.side as "left")} của khách.`, "bad", 2600);
    } else {
      playSound("miss");
      ctx.toast("Chưa đúng — xem chỗ đúng nhé", "bad");
    }
    setLandmark(info.location || t.note || null);
    setPhase("retry");
  };

  // Hold loop
  useEffect(() => {
    if (phase !== "hold") return;
    const s = sim.current;
    s.pressed = false;
    ctx.pressRef.current = (down) => { s.pressed = down; };
    const stop = startLoop((dt) => {
      if (!useForce) {
        if (s.pressed) {
          s.held += dt;
          ctx.setExpr("relaxed");
        } else if (s.held > 0) {
          if (s.held < seconds) {
            if (!s.earlyWarned) { ctx.toast("Nhấc ngón sớm quá, giữ lại nhé", "bad"); s.earlyWarned = true; }
            s.held = 0;
          }
        }
        setTick((n) => n + 1);
        if (s.held >= seconds) { finish(); return false; }
        return;
      }
      s.force = stepForce(s.force, s.pressed, dt);
      const z = forceZoneOf(s.force);
      const inZone = z === reqForce;
      if (inZone) s.started = true;
      if (s.started) { s.total += dt; if (inZone) s.inZone += dt; }
      const over = s.force > FORCE_ZONES[reqForce][1];
      if (over) {
        s.over += dt;
        // 0.25 s over: pain face + "too strong" warning. Sensitive / pregnancy-caution points only count a SAFETY
        // ERROR after 0.4 s continuously over the zone (grace for a brief overshoot).
        if (s.over > 0.25) {
          res.current.forceOver = true;
          ctx.setExpr("pain", 900);
          if (!s.overWarned) {
            s.overWarned = true;
            playSound("miss");
            ctx.toast("Mạnh quá, khách đau!", "bad");
          }
        }
        if (s.over > 0.4 && (info.sensitive || caution) && !s.safetyCounted) {
          s.safetyCounted = true;
          res.current.safetyErrors += 1;
          playSound("safety");
          ctx.toast(caution ? "⚠ Khách mang thai: phải ấn nhẹ hơn mức thường!" : `⚠ Quá lực ở huyệt nhạy cảm! ${info.safetyNote ?? "Ấn nhẹ thôi."}`, "safety", 3400);
        }
      } else {
        s.over = 0;
        if (inZone && s.pressed) ctx.setExpr("relaxed");
      }
      setTick((n) => n + 1);
      if (s.inZone >= seconds) {
        res.current.forceScore = forceScoreOf(s.inZone, s.total);
        finish();
        return false;
      }
    });
    return () => { stop(); ctx.pressRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const s = sim.current;
  const holdFrac = useForce ? s.inZone / seconds : s.held / seconds;
  const showDot = hint === 0 || phase === "retry";
  const layers = baseLayers(plan, phase === "retry" ? 0 : hint, ctx.expr);

  let instr: preact.ComponentChildren;
  if (phase === "locate") instr = <>Chạm vào huyệt <b>{info.name}</b>{itemSide !== "center" ? ` (${sideLabel(itemSide)} của khách)` : ""}</>;
  else if (phase === "retry") instr = <>Chạm lại đúng chấm sáng{landmark && <span class="lm">📍 {landmark}</span>}</>;
  else if (phase === "hold") instr = useForce
    ? <>Giữ ngón (ở đâu cũng được) để tăng lực, thả để giảm. Giữ kim ở vùng <b>{FORCE_LABEL[reqForce]}</b>{caution ? " (thai phụ: nhẹ hơn 1 bậc)" : ""}.</>
    : <>Giữ ngón ở bất kỳ đâu trên màn hình trong <b>{seconds} giây</b></>;
  else if (phase === "done") instr = <>✓ Xong {info.name}</>;

  return (
    <>
      <div class="tx-canvaswrap">
        <Stage
          svg={ctx.svg} mirrored={plan.mirrored} layers={layers} cssVars={ctx.cssVars} zoom={ctx.zoom} focus={ctx.zoomAssist ? tgt : FREE_FOCUS}
          panMode="drag" onTap={onTap} badges={badgesFor(plan)}
          precise={ctx.precise && (phase === "locate" || phase === "retry")}
          focusSeed={ctx.zoomAssist ? ctx.itemKey + "|zoom" : undefined} onMetrics={(m) => setStageW(m.W)}
          qa={import.meta.env.DEV ? { kind: "point", phase, tgt, safety: res.current.safetyErrors, zoom: ctx.zoom, precise: ctx.precise, tolPx, r: t.r, useForce, force: s.force, req: FORCE_ZONES[reqForce], contra, other: plan.otherSide ? toScreen(plan, [plan.otherSide.x, plan.otherSide.y]) : null } : undefined}
        >
          {(phase === "locate") && <HintBlob at={tgt} r={t.r} hint={hint} seed={ctx.itemKey + t.side} />}
          {showDot && phase !== "hold" && phase !== "done" && <TargetDot at={tgt} color={phase === "retry" ? "var(--warn)" : "var(--sage-dark)"} />}
          {(phase === "hold" || phase === "done") && <HoldRing at={tgt} frac={phase === "done" ? 1 : holdFrac} color={useForce && forceZoneOf(s.force) !== reqForce && phase === "hold" ? "var(--amber)" : "var(--ok)"} />}
          {tap && (
            <g key={tap.n}>
              <Ripple at={tap.p} color={gradeColor[tap.grade]} />
            </g>
          )}
        </Stage>
      </div>
      <div class="tx-bottom">
        <div class="tx-instr">{instr}</div>
        {(phase === "hold" || phase === "done") && info.effects && (
          <div class="tx-effect"><b>Tác dụng:</b> {info.effects} <span class="muted">(tham khảo)</span></div>
        )}
        {phase === "hold" && useForce && <ForceBar value={s.force} required={reqForce} />}
        {phase === "hold" && (
          <div class="tx-forcerow">
            <span>{useForce ? "Thời gian đúng lực" : "Đang giữ"}</span>
            <span>{Math.min(seconds, useForce ? s.inZone : s.held).toFixed(1)} / {seconds} giây</span>
          </div>
        )}
        {phase === "hold" && <div class="tx-holdbar"><i style={{ width: `${Math.min(100, holdFrac * 100)}%` }} /></div>}
        {phase !== "hold" && phase !== "done" && ctx.tools}
      </div>
      {phase === "intro" && (
        <Sheet>
          <h2>{info.name}{info.altName ? ` (${info.altName})` : ""}</h2>
          <div class="sub"><span class="tx-tag">{info.id}</span>{itemSide !== "center" && <span class="tx-tag">{sideLabel(itemSide)} của khách</span>}<span class="tx-tag">Huyệt mới</span></div>
          <dl>
            <dt>Vị trí</dt><dd>{info.location || t.note}</dd>
            <dt>Lực</dt><dd>{FORCE_LABEL[info.force]}{caution ? ` → thai phụ: ${FORCE_LABEL[reqForce]}` : ""}</dd>
            <dt>Giữ</dt><dd>{seconds} giây · {info.technique}</dd>
            {info.effects && <><dt>Tác dụng</dt><dd>{info.effects} <span class="muted">(tham khảo)</span></dd></>}
          </dl>
          {info.safetyNote && <div class="warn">⚠ {info.safetyNote}</div>}
          <div class="row"><button class="tx-btn primary" onClick={() => setPhase("locate")}>Bắt đầu</button></div>
        </Sheet>
      )}
    </>
  );
}
