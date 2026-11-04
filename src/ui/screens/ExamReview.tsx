/** "Anh Khôi nhận xét": one card per wrong / weak exam item with the view, the correct spot and the player's first tap. */
import { useEffect, useMemo, useState } from "preact/hooks";
import { ChevronLeft, ChevronRight, ShieldAlert } from "lucide-preact";
import type { ReviewEntry } from "@/core/api";
import type { TaskItem, ViewId } from "@/core/types";
import type { ViewData } from "@/ui/art/assets";
import { loadAllViews, planFor } from "@/ui/treatment/plan";
import { zoneInfo } from "@/ui/treatment/content";
import { analyzeSwipe, analyzeTap } from "@/ui/review/analyze";
import { buildRemark, summaryLine, type ReviewDef } from "@/ui/review/remarks";
import { Btn, Chip } from "../components/bits";
import { Portrait } from "../components/Svg";
import { ViewMarker, type ReviewMarks } from "../components/ViewMarker";
import { content } from "../content";

let viewsCache: Promise<ViewData[]> | null = null;
function useViews() {
  const [all, setAll] = useState<ViewData[] | null>(null);
  useEffect(() => {
    let alive = true;
    (viewsCache ??= loadAllViews()).then((v) => alive && setAll(v));
    return () => { alive = false; };
  }, []);
  return all;
}

function defOf(item: TaskItem, all: ViewData[]): ReviewDef | null {
  if (item.kind === "point") { const d = content.ACUPOINTS.find((p) => p.id === item.id); return d ? { kind: "point", def: d, side: item.side } : null; }
  if (item.kind === "muscle") { const d = content.MUSCLES.find((p) => p.id === item.id); return d ? { kind: "muscle", def: d, side: item.side } : null; }
  if (item.kind === "zone") {
    const d = content.REFLEX_ZONES.find((p) => p.id === item.id);
    return d ? { kind: "zone", def: { ...d, location: zoneInfo(item.id, all).location }, foot: item.foot } : null;
  }
  return null;
}

const SIDE: Record<string, string> = { left: "trái", right: "phải", front: "trước", back: "sau" };

function ReviewCard({ e, all }: { e: ReviewEntry; all: ViewData[] }) {
  const item = e.result.item;
  const def = defOf(item, all);
  const pregnant = e.customer.health?.id === "pregnant";
  const card = useMemo(() => {
    const tap = e.result.firstTap, sw = e.result.firstSwipe;
    // The view the player worked on (recorded), else the one the session would have used.
    const plan = planFor(item, all);
    const view: ViewId | undefined = tap?.view ?? sw?.view ?? plan?.view;
    const mirrored = tap ? !!tap.mirrored : sw ? !!sw.mirrored : !!plan?.mirrored;
    const data = all.find((v) => v.view === view);
    const tapV = data && tap ? analyzeTap(data, item, tap) : null;
    const swV = data && sw ? analyzeSwipe(data, item, sw) : null;
    const remark = def ? buildRemark({ item: def, issues: e.issues, score: e.score, pregnant, tap: tapV, swipe: swV, swipeIssue: sw?.issue }) : null;
    const marks: ReviewMarks = {
      side: item.kind === "zone" ? item.foot : item.kind === "step" ? undefined : item.side, mirrored,
      ...(tap ? { tap: [tap.x, tap.y] as [number, number], showForbidden: !!tapV?.forbidden } : {}),
      ...(sw ? { swipe: { from: [sw.from.x, sw.from.y] as [number, number], to: [sw.to.x, sw.to.y] as [number, number] } } : {}),
    };
    const variant = item.kind === "point" ? (plan?.kind === "point" ? plan.target.variant ?? undefined : undefined) ?? (def?.kind === "point" ? def.def.variant : undefined) : undefined;
    const limb = data?.mirrorable ? (data.limb === "hand" ? "Tay" : data.limb === "leg" ? "Chân" : data.limb === "foot" ? "Bàn chân" : "Nửa mặt") : null;
    return { view, marks, remark, variant, limb };
  }, [e, all]);
  if (!def || item.kind === "step") return null;
  const sideTxt = item.kind === "zone" ? `bàn chân ${SIDE[item.foot]}` : item.side !== "center" ? `${SIDE[item.side] ?? item.side} của khách` : "";
  const r = card.remark;
  const hasTap = !!card.marks.tap || !!card.marks.swipe;
  return (
    <div class="rv-card">
      <div class="rv-title">
        <b>{def.def.name}</b>
        {sideTxt && <span class="muted small"> · {sideTxt}</span>}
        {item.kind === "point" && <span class="muted small"> · {item.id}</span>}
        <span class={`rv-score${e.wrong ? " bad" : " mid"}`}>{e.safetyErrors > 0 ? "⚠ Lỗi an toàn" : e.result.skipped ? "Bỏ qua" : `${e.score}/100`}</span>
      </div>
      {card.view && (
        <div class="rv-view">
          <ViewMarker view={card.view} kind={item.kind} id={item.id} variant={card.variant} review={card.marks} />
          {card.limb && <span class="rv-badge">{card.limb} {item.kind === "zone" ? SIDE[item.foot] : SIDE[item.side] ?? ""} của khách</span>}
        </div>
      )}
      <div class="rv-legend">
        <span><i class="ok-dot" /> {e.issues.includes("contra-done") ? "Huyệt chống chỉ định (phải bỏ qua)" : "Chỗ đúng"}</span>
        {card.marks.tap && <span><i class="bad-x">×</i> Em chạm lần đầu</span>}
        {card.marks.swipe && <span><i class="bad-x">→</i> Em vuốt</span>}
        {!hasTap && e.result.skipped && <span class="muted">Em đã bỏ qua mục này</span>}
      </div>
      {r && (
        <div class="speaker rv-speaker">
          <Portrait id="anh-khoi" expr={e.wrong ? "critique" : "neutral"} size={58} />
          <div class="bubble">
            {r.problems.map((p, i) => <p key={i} class={i === 0 ? "rv-main" : ""}>{p}</p>)}
          </div>
        </div>
      )}
      {r && (
        <dl class="facts rv-facts">
          {r.landmark && <><dt>{item.kind === "muscle" ? "Vị trí" : "Mốc"}</dt><dd>{r.landmark}</dd></>}
          {r.howTo && <><dt>Cách làm</dt><dd>{r.howTo}</dd></>}
          {r.safety && <><dt class="danger-t"><ShieldAlert size={14} /> An toàn</dt><dd class="danger-t">{r.safety}</dd></>}
        </dl>
      )}
    </div>
  );
}

export function ExamReview({ entries, total, pass, score, passed }: { entries: ReviewEntry[]; total: number; pass: number; score: number; passed: boolean }) {
  const all = useViews();
  const [i, setI] = useState(0);
  const wrong = entries.filter((e) => e.wrong).length;
  if (!entries.length) return null;
  const idx = Math.min(i, entries.length - 1);
  return (
    <div class="rv">
      {!passed && <h3 class="rv-head">Anh Khôi nhận xét</h3>}
      <p class={`rv-summary${passed ? "" : " fail"}`}>{summaryLine(wrong, total, pass, score, entries.reduce((n, e) => n + e.safetyErrors, 0))}</p>
      <div class="rv-nav">
        <Btn small kind="secondary" disabled={idx === 0} onClick={() => setI(idx - 1)}><ChevronLeft size={18} /> Trước</Btn>
        <span class="rv-count">
          Mục {idx + 1}/{entries.length}
          {entries[idx].wrong ? <Chip tone="danger">Sai</Chip> : <Chip tone="amber">Chưa tối đa</Chip>}
        </span>
        <Btn small kind="secondary" disabled={idx >= entries.length - 1} onClick={() => setI(idx + 1)}>Tiếp <ChevronRight size={18} /></Btn>
      </div>
      {all ? <ReviewCard key={idx} e={entries[idx]} all={all} /> : <p class="muted center">Đang tải hình…</p>}
    </div>
  );
}
