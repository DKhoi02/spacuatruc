/** Full-screen treatment session shell: top bar, ticket, current task, health profile, patience, summary. */
import "./treatment.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Crosshair, X as XIcon, ZoomIn, ZoomOut } from "lucide-preact";
import type { ItemResult, TaskItem, TreatmentResult } from "@/core/types";
import { characterById, characterSvg, overlaySvg, viewSvg, type ViewData } from "@/ui/art/assets";
import type { SessionProgress, TreatmentSessionProps } from "./index";
import { itemKeyOf, itemLabel, muscleInfo, pointInfo } from "./content";
import { loadAllViews, planFor, type Plan } from "./plan";
import { CARE_INIT, Sheet, type CareState, type Expr, type HintLevel, type TaskCtx, type ToastKind } from "./common";
import { PointTask } from "./PointTask";
import { MuscleTask } from "./MuscleTask";
import { ZoneTask } from "./ZoneTask";
import { StepTask } from "./StepTask";
import { autoZoomFor, itemScore, hash01, needsPrecision, patienceLeft } from "./scoring";
import { playSound, unlockAudio } from "./sound";

// Character palette (copied from art/characters/palette.json keys → CSS variables used by the view SVGs).
const SKIN: Record<string, [string, string]> = {
  sang: ["#f8e0d0", "#f2d0bc"], trung: ["#f3d2bd", "#efc7b0"], ngam: ["#e2b694", "#d6a682"], dam: ["#c48d68", "#b47d59"],
};
const HAIR: Record<string, string> = {
  den: "#2f2420", "nau-den": "#3b2a24", nau: "#6b4434", "hat-de": "#8a5a3c", "muoi-tieu": "#8d8580", bac: "#cbc3bd", "do-ruou": "#6e3a3a",
};

function cssVarsFor(characterId: string): Record<string, string> {
  const c = characterById(characterId) as { skin?: string; hairColor?: string } | undefined;
  const skinKeys = Object.keys(SKIN), hairKeys = Object.keys(HAIR);
  const h = hash01(characterId);
  const sk = SKIN[c?.skin ?? ""] ?? SKIN[skinKeys[Math.floor(h * skinKeys.length)]];
  const hr = HAIR[c?.hairColor ?? ""] ?? HAIR[hairKeys[Math.floor(hash01(characterId + "h") * hairKeys.length)]];
  return { "--skin": sk[0], "--skin-shade": sk[1], "--hair": hr };
}

const svgToUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

type Phase = "loading" | "profile" | "work" | "summary";

export function SessionShell({ config, onFinish, onAbort, initialProgress, onProgress }: TreatmentSessionProps) {
  const { customer, service } = config;
  const items = customer.items;
  // Only trust saved progress that belongs to this very customer/ticket.
  const init = initialProgress && initialProgress.customerId === customer.id && initialProgress.results.length === items.length
    ? initialProgress : undefined;
  const initDone = !!init && init.results.every(Boolean);
  const pregnant = customer.health?.id === "pregnant";
  const [all, setAll] = useState<ViewData[] | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [results, setResults] = useState<(ItemResult | null)[]>(() => init ? init.results.slice() : items.map(() => null));
  const [cur, setCur] = useState(() => {
    if (!init) return 0;
    if (init.cur >= 0 && init.cur < items.length && !init.results[init.cur]) return init.cur;
    const k = init.results.findIndex((r) => !r);
    return k < 0 ? 0 : k;
  });
  const [expr, setExprState] = useState<Expr>("neutral");
  const exprRef = useRef<Expr>("neutral");
  const exprTimer = useRef<number | undefined>(undefined);
  const [portraits, setPortraits] = useState<Record<string, string>>({});
  const [toast, setToastState] = useState<{ text: string; kind: ToastKind; n: number } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  /** Working seconds spent so far (patience is derived from it vs. the expected time G). Restored on resume. */
  const [elapsed, setElapsed] = useState<number | null>(() => {
    const e = (init as (SessionProgress & { elapsed?: number }) | undefined)?.elapsed;
    return typeof e === "number" && e >= 0 ? e : init ? null : 0; // null: legacy save → derive from the fraction once G is known
  });
  const paused = useRef(true);
  const [zoom, setZoom] = useState(1);
  /** Current tap target's tolerance at 1× in CSS px (null for swipe/step tasks). */
  const [tolPx, setTolPx] = useState<number | null>(null);
  /** Player's "Chạm chính xác" choice for this session (null = automatic: on when the target is finger-small). */
  const [preciseChoice, setPreciseChoice] = useState<boolean | null>(null);
  const [care, setCare] = useState<CareState>(() => init?.care ? { ...CARE_INIT, ...init.care } : CARE_INIT);
  const [confirmExit, setConfirmExit] = useState(false);
  const pressRef = useRef<((down: boolean) => void) | null>(null);
  const downIds = useRef(new Set<number>());
  const cssVars = useMemo(() => cssVarsFor(customer.characterId), [customer.characterId]);

  useEffect(() => {
    let alive = true;
    loadAllViews().then((v) => {
      if (!alive) return;
      setAll(v);
      // Resumed sessions skip the health profile card (already read before the reload).
      setPhase(initDone ? "summary" : init && init.results.some(Boolean) ? "work" : customer.health ? "profile" : "work");
    });
    return () => { alive = false; };
  }, []);

  // Portraits per expression
  const portraitExpr = phase === "summary" ? "happy" : expr;
  useEffect(() => {
    if (portraits[portraitExpr]) return;
    characterSvg(customer.characterId, portraitExpr).then((s) => setPortraits((p) => ({ ...p, [portraitExpr]: svgToUrl(s) }))).catch(() => {});
  }, [portraitExpr, customer.characterId]);

  // Block iOS pinch-zoom on the page while the session is open.
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("dblclick", prevent);
    return () => { document.removeEventListener("gesturestart", prevent); document.removeEventListener("dblclick", prevent); };
  }, []);

  const setExpr = useCallback((e: Expr, ms?: number) => {
    window.clearTimeout(exprTimer.current);
    if (ms) exprTimer.current = window.setTimeout(() => { exprRef.current = "neutral"; setExprState("neutral"); }, ms);
    if (exprRef.current === e) return;
    exprRef.current = e;
    setExprState(e);
  }, []);

  const showToast = useCallback((text: string, kind: ToastKind, ms = 1500) => {
    window.clearTimeout(toastTimer.current);
    setToastState((t) => ({ text, kind, n: (t?.n ?? 0) + 1 }));
    toastTimer.current = window.setTimeout(() => setToastState(null), ms);
  }, []);

  // Patience: full for the expected working time G of the ticket, then drains to 0 over another G.
  // G = Σ point 4 + 1.4·seconds, muscle 4·strokes, zone 6, step 3 (seconds). Only working time counts
  // (no clock during intro cards, the health profile, loading/resume or the summary).
  const expectedG = useMemo(() => {
    if (!all) return 0;
    return items.reduce((g, it) => g + (it.kind === "point" ? 4 + 1.4 * (pointInfo(it.id, all).seconds || 3)
      : it.kind === "muscle" ? 4 * (muscleInfo(it.id, all).strokesRequired || 3)
      : it.kind === "zone" ? 6 : 3), 0);
  }, [all, items]);
  useEffect(() => {
    // Legacy progress (fraction only): invert the drain curve.
    if (elapsed === null && expectedG > 0) {
      const f = Math.max(0, Math.min(1, init?.patience ?? 1));
      setElapsed(f >= 1 ? 0 : expectedG * (2 - f));
    }
  }, [elapsed, expectedG]);
  const patience = config.usePatience ? patienceLeft(elapsed ?? 0, expectedG) : 1;
  useEffect(() => {
    if (!config.usePatience || phase !== "work" || elapsed === null) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(1, (now - last) / 1000);
      last = now;
      if (!paused.current && !document.hidden) setElapsed((e) => (e ?? 0) + dt);
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, config.usePatience, elapsed === null]);

  // Persist progress (throttled: every 2 working seconds) so a reload can resume.
  const progRef = useRef(onProgress);
  progRef.current = onProgress;
  // `elapsed` rides along as an extra field (the stored object is kept whole); `patience` stays the 0–1 fraction.
  const elapsedStep = Math.floor((elapsed ?? 0) / 2);
  useEffect(() => {
    if (phase === "loading" || elapsed === null) return;
    const prog: SessionProgress & { elapsed: number } = {
      customerId: customer.id, results, cur, patience: Math.round(patience * 1000) / 1000, care, elapsed: Math.round((elapsed ?? 0) * 10) / 10,
    };
    progRef.current?.(prog);
  }, [phase, results, cur, care, elapsedStep]);

  const finishItem = useCallback((r: ItemResult) => {
    setResults((prev) => {
      const next = prev.slice();
      next[cur] = r;
      const nextIdx = [...next.keys()].map((k) => (cur + 1 + k) % next.length).find((k) => !next[k]);
      if (nextIdx === undefined) {
        setPhase("summary");
        playSound("finish");
      } else setCur(nextIdx);
      return next;
    });
    setZoom(1);
    setTolPx(null);
    setExpr("neutral");
    pressRef.current = null;
  }, [cur]);

  const skip = () => {
    const item = items[cur];
    const contra = pregnant && item.kind === "point" && all && pointInfo(item.id, all).pregnancy;
    if (contra) {
      showToast("Đúng rồi! Khách cảm ơn bạn đã cẩn thận 🙏", "perfect", 2200);
      setExpr("relaxed", 1800);
      playSound("good");
    } else showToast("Đã bỏ qua mục này", "info");
    finishItem({ item, positionScore: 0, attempts: 0, safetyErrors: 0, skipped: true });
  };

  const finishAll = () => {
    const res: TreatmentResult = {
      customerId: customer.id,
      items: items.map((item, i) => results[i] ?? { item, positionScore: 0, attempts: 0, safetyErrors: 0, skipped: true }),
    };
    if (config.usePatience) res.patienceLeft = Math.round(patience * 100) / 100;
    onFinish(res);
  };

  // Root press forwarding (hold anywhere)
  const onRootDown = (e: PointerEvent) => {
    unlockAudio();
    const t = e.target as Element;
    if (t.closest("button, .tx-nohold, .tx-ticket, .tx-top")) return;
    downIds.current.add(e.pointerId);
    pressRef.current?.(true);
  };
  const onRootUp = (e: PointerEvent) => {
    if (!downIds.current.delete(e.pointerId)) return;
    if (downIds.current.size === 0) pressRef.current?.(false);
  };

  const hintOf = (item: TaskItem): HintLevel => {
    if (item.kind === "step") return 3;
    if (config.examMode) return 3;
    return config.hintLevel(itemKeyOf(item) as never);
  };

  const item = items[cur];
  const plan: Plan | null = useMemo(() => (all && item ? planFor(item, all) : null), [all, cur]);
  const labels = useMemo(() => (all ? items.map((it) => itemLabel(it, all)) : []), [all, items]);

  // Load SVGs for the current plan
  const [svgs, setSvgs] = useState<{ key: string; svg: string | null; overlay: string | null }>({ key: "", svg: null, overlay: null });
  const planKey = plan ? `${plan.view}|${plan.kind === "step" ? plan.overlay ?? "" : ""}` : "";
  useEffect(() => {
    if (!plan) return;
    let alive = true;
    const ov = plan.kind === "step" && plan.overlay ? overlaySvg(plan.overlay) : Promise.resolve(null);
    Promise.all([viewSvg(plan.view), ov]).then(([s, o]) => { if (alive) setSvgs({ key: planKey, svg: s, overlay: o }); });
    return () => { alive = false; };
  }, [planKey]);

  // Keep the current ticket chip visible (long tickets scroll horizontally).
  const ticketRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ticketRef.current?.querySelector(".tx-chip.cur") as HTMLElement | null;
    const box = ticketRef.current;
    if (!el || !box) return;
    const left = el.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
    if (left < box.scrollLeft || left + el.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollTo({ left: Math.max(0, left - 24), behavior: "smooth" });
  }, [cur, phase, all]);

  const doneCount = results.filter(Boolean).length;
  const isPointLike = item && (item.kind === "point" || item.kind === "zone");

  const zoomIn = Math.max(2, autoZoomFor(tolPx));
  const tapTask = !!item && (item.kind === "point" || item.kind === "zone") && tolPx != null;
  const precise = tapTask && (preciseChoice ?? needsPrecision(tolPx, zoom));
  const fmtZ = (z: number) => `${String(z).replace(".", ",")}×`;
  const tools = (
    <div class="tx-tools">
      <button class={"tx-btn" + (zoom > 1 ? " primary" : "")} onClick={() => setZoom((z) => (z > 1 ? 1 : zoomIn))} aria-label={zoom > 1 ? "Thu nhỏ" : "Phóng to"}>
        {zoom > 1 ? <ZoomOut size={20} /> : <ZoomIn size={20} />}{zoom > 1 ? "1×" : fmtZ(zoomIn)}
      </button>
      {tapTask && (
        <button class={"tx-btn aim" + (precise ? " on" : "")} aria-pressed={precise} onClick={() => setPreciseChoice(!precise)}>
          <Crosshair size={19} />Chạm chính xác{precise ? " ✓" : ""}
        </button>
      )}
      {customer.health && item && item.kind !== "step" && (
        <button class="tx-btn skip" onClick={skip}>{isPointLike ? "Không làm huyệt này" : "Không làm mục này"}</button>
      )}
    </div>
  );

  let task = null;
  if (phase === "work" && plan && item && all) {
    const ctx: TaskCtx = {
      item, itemKey: itemKeyOf(item), plan, hint: hintOf(item), svg: svgs.key === planKey ? svgs.svg : null,
      overlaySvg: svgs.key === planKey ? svgs.overlay : null, config, pregnant, all, cssVars, expr, setExpr, toast: showToast,
      pressRef, setPaused: (p) => { paused.current = p; }, onDone: finishItem, zoom, tools, care, setCare,
      setZoom, reportTol: setTolPx, precise,
    };
    const k = `${cur}`;
    task = plan.kind === "point" ? <PointTask key={k} ctx={ctx} />
      : plan.kind === "muscle" ? <MuscleTask key={k} ctx={ctx} />
      : plan.kind === "zone" ? <ZoneTask key={k} ctx={ctx} />
      : <StepTask key={k} ctx={ctx} />;
  } else if (phase === "work" && item && all && !plan) {
    task = (
      <div class="tx-loading">
        <div style={{ textAlign: "center", padding: 20 }}>
          <p>Chưa có hình cho mục này.</p>
          <button class="tx-btn" onClick={() => finishItem({ item, positionScore: 0, attempts: 0, safetyErrors: 0, skipped: true })}>Bỏ qua</button>
        </div>
      </div>
    );
  }

  const titleInfo = item && all && labels[cur];

  return (
    <div class="tx-root" onPointerDown={onRootDown as never} onPointerUp={onRootUp as never} onPointerCancel={onRootUp as never}
      onContextMenu={(e) => e.preventDefault()}>
      <div class="tx-top">
        <div class="tx-portrait">{portraits[portraitExpr] && <img src={portraits[portraitExpr]} alt="" />}</div>
        <div class="tx-who">
          <b>{customer.name}</b>
          <span>{service.name}{config.examMode ? " · Bài kiểm tra" : ""} · {doneCount}/{items.length}</span>
          {config.usePatience && <div class={"tx-patience" + (patience < 0.3 ? " low" : "")} title="Kiên nhẫn"><i style={{ width: `${patience * 100}%` }} /></div>}
        </div>
        {onAbort && (
          // stays tappable above a task's intro card (so the player can always leave), but not above summary/confirm
          <button class={"tx-iconbtn" + (phase === "work" && !confirmExit ? " tx-above" : "")} aria-label={config.practice ? "Dừng luyện" : "Dừng ca"} onClick={() => setConfirmExit(true)}><XIcon size={22} /></button>
        )}
      </div>

      <div class="tx-ticket" ref={ticketRef}>
        {items.map((it, i) => {
          const r = results[i];
          const l = labels[i];
          return (
            <button key={i} class={"tx-chip" + (i === cur && phase === "work" ? " cur" : "") + (r ? (r.skipped ? " done skip" : " done") : "")}
              onClick={() => { if (!r && phase === "work" && i !== cur) { setCur(i); setZoom(1); setTolPx(null); pressRef.current = null; } }}>
              <span class="bx">{r ? (r.skipped ? "–" : "✓") : ""}</span>
              {l ? l.name : "…"}{l?.sub && <small>{l.sub}</small>}
            </button>
          );
        })}
      </div>

      {phase === "work" && titleInfo && (
        <div class="tx-title">
          <b>{titleInfo.name}</b>
          {titleInfo.sub && <span>{titleInfo.sub}{item.kind === "point" || item.kind === "muscle" ? " (của khách)" : ""}</span>}
          {item.kind === "point" && <span class="code">{item.id}</span>}
        </div>
      )}

      {phase === "loading" && <div class="tx-loading">Đang chuẩn bị…</div>}
      {task}
      {toast && phase === "work" && <div key={toast.n} class={`tx-toast ${toast.kind}`}>{toast.text}</div>}

      {phase === "profile" && customer.health && (
        <Sheet>
          <div class="tx-profile-ico">{portraits[portraitExpr] && <img src={portraits[portraitExpr]} alt="" />}</div>
          <h2>Hồ sơ khách</h2>
          <div class="sub">{customer.name} · {service.name}</div>
          <div class="warn">🩺 {customer.health.label}</div>
          <div class="note">
            Xem kỹ phiếu trước khi làm. Huyệt <b>chống chỉ định</b> thì bấm “Không làm huyệt này”. Huyệt <b>cần thận trọng</b> thì ấn nhẹ hơn mức thường 1 bậc.
          </div>
          <div class="row"><button class="tx-btn primary" onClick={() => { unlockAudio(); setPhase("work"); }}>Đã hiểu, bắt đầu</button></div>
        </Sheet>
      )}

      {phase === "summary" && (
        <Sheet>
          <h2>{config.practice ? "Xong buổi luyện!" : "Xong ca trị liệu!"}</h2>
          <div class="sub">{config.practice ? "Chỉ để luyện tay – không tính tiền, uy tín hay độ thành thạo." : `${customer.name} · ${service.name}`}</div>
          <ul class="tx-sum-list">
            {items.map((it, i) => {
              const r = results[i];
              const sc = r ? itemScore(r) : 0;
              const l = labels[i];
              return (
                <li key={i}>
                  <span class="nm">{l?.name}{l?.sub && <small>{l.sub}</small>}</span>
                  {r?.safetyErrors ? <span title="Lỗi an toàn">⚠×{r.safetyErrors}</span> : null}
                  {r?.skipped ? <span class="tx-score skip">Bỏ qua</span>
                    : <span class={"tx-score" + (sc >= 90 ? "" : sc >= 70 ? " mid" : " low")}>{sc}</span>}
                </li>
              );
            })}
          </ul>
          {config.usePatience && (
            <div class="tx-sum-total"><span>Kiên nhẫn còn lại</span><span>{Math.round(patience * 100)}%</span></div>
          )}
          <div class="row"><button class="tx-btn primary" onClick={finishAll}>Hoàn tất</button></div>
        </Sheet>
      )}

      {confirmExit && (
        <Sheet>
          <h2>{config.practice ? "Dừng luyện tập?" : "Dừng ca trị liệu?"}</h2>
          <div class="note">{config.practice
            ? "Em quay lại phần nhận xét của anh Khôi. Lúc nào muốn thì bấm “Luyện lại các huyệt sai” để tập lại từ đầu."
            : "Khách vẫn nằm chờ trên giường. Phần đã làm không được tính, bấm “Tiếp tục” ở hàng chờ để làm lại ca này."}</div>
          <div class="row">
            <button class="tx-btn" onClick={() => setConfirmExit(false)}>{config.practice ? "Luyện tiếp" : "Làm tiếp"}</button>
            <button class="tx-btn skip" onClick={() => { setConfirmExit(false); onAbort?.(); }}>{config.practice ? "Dừng luyện" : "Dừng ca"}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
