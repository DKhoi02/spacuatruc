import type { DaySummary, FeatureId, GameState } from "@/core/types";
import { Award, ChevronDown, ChevronUp, Dumbbell, Package, Receipt, TriangleAlert } from "lucide-preact";
import { useState } from "preact/hooks";
import { ExamReview } from "./ExamReview";
import { TreatmentSession } from "@/ui/treatment";
import { Btn, Chip, Modal, stars } from "../components/bits";
import { Portrait, UiArt } from "../components/Svg";
import { chapterDayDef, content, itemNameByKey, tierDef } from "../content";
import { FEATURE_TIPS } from "../featureTips";
import * as flow from "../flow";
import { hhmm, k, rep, signed, vnd } from "../format";
import { dispatch } from "../store";
import type { UiState } from "../ui";
import { setUi } from "../ui";

export function TreatmentHost({ ui }: { ui: UiState }) {
  if (!ui.treatment) return null;
  return (
    <div class="treatment-host">
      <TreatmentSession key={ui.treatment.config.customer.id} config={ui.treatment.config} onFinish={flow.finishTreatment} onAbort={flow.abortTreatment}
        initialProgress={ui.treatment.progress} onProgress={ui.treatment.kind === "service" ? flow.treatmentProgress : undefined} />
    </div>
  );
}

export function BillModal({ ui, s }: { ui: UiState; s: GameState }) {
  const b = ui.bill ?? ui.billQueue?.[0];
  if (!b) return null;
  const { bill } = b;
  return (
    <Modal class="bill" title={<><Receipt size={20} /> Hóa đơn{b.staffName ? <span class="bill-by"> · KTV {b.staffName} làm</span> : null}</>}>
      <div class="bill-shop">{s.shopName}</div>
      <div class="bill-customer">
        <Portrait id={b.characterId} expr={bill.stars === 3 ? "happy" : bill.stars === 1 ? "annoyed" : "relaxed"} size={72} />
        <div>
          <b>{b.customerName}</b>
          <div class="bill-stars">{stars(bill.stars)}</div>
          <div class="muted small">{b.staffName ? `Do KTV ${b.staffName} làm` : `Điểm ca: ${Math.round(bill.score)}/100`}</div>
        </div>
      </div>
      {b.combo && <p class="bill-combo"><Package size={16} /> <span>Gói combo: {b.combo.join(" + ")}</span></p>}
      <table class="ledger">
        <tbody>
          <tr><td>{bill.serviceName}</td><td class="num">{vnd(bill.basePrice)}</td></tr>
          <tr><td>× hệ số sao ({stars(bill.stars)})</td><td class="num">× {bill.starMultiplier.toLocaleString("vi-VN")}</td></tr>
          {!!bill.equipPremiumPct && <tr class="premium"><td>Thiết bị cao cấp</td><td class="num pos">+{Math.round(bill.equipPremiumPct * 100)}%</td></tr>}
          {!!bill.shopPremiumPct && <tr class="premium"><td>Tiệm cao cấp</td><td class="num pos">+{Math.round(bill.shopPremiumPct * 100)}%</td></tr>}
          {bill.price !== Math.round(bill.basePrice * bill.starMultiplier) && <tr><td class="muted">Giá sau điều chỉnh</td><td class="num">{vnd(bill.price)}</td></tr>}
          <tr><td>Tip</td><td class="num pos">+{vnd(bill.tip)}</td></tr>
          {bill.discount > 0 && <tr><td>Giảm giá</td><td class="num neg">−{vnd(bill.discount)}</td></tr>}
          <tr class="total"><td>Tổng</td><td class="num">{vnd(bill.total)}</td></tr>
        </tbody>
      </table>
      <Btn block onClick={() => flow.afterBill()}>Thu tiền</Btn>
    </Modal>
  );
}

export function ComplaintModal({ s }: { s: GameState }) {
  const c = s.today.complaints[0];
  if (!c) return null;
  const cust = s.today.queue.find((q) => q.id === c.customerId);
  const charId = cust?.characterId ?? flow.characterOf(c.customerId);
  const R = content.CONFIG.reputation;
  return (
    <Modal class="complaint" title={<><TriangleAlert size={20} /> Khách phàn nàn</>}>
      <div class="complaint-body">
        {charId && <Portrait id={charId} expr="annoyed" size={80} />}
        <div>
          <b>{c.customerName}</b>
          <blockquote>“{c.reason}”</blockquote>
        </div>
      </div>
      <div class="stack">
        <Btn block onClick={() => flow.resolveComplaint(c.id, "apologize-refund")}>Xin lỗi + giảm {Math.round(content.CONFIG.refundPct * 100)}% (−{vnd(c.refundIfApologize)})</Btn>
        <p class="muted small center">Uy tín {signed(R.complaintRefund)}</p>
        <Btn block kind="secondary" onClick={() => flow.resolveComplaint(c.id, "apologize")}>Chỉ xin lỗi</Btn>
        <p class="muted small center">Không mất tiền · Uy tín {signed(R.complaintApology)}</p>
      </div>
    </Modal>
  );
}

export function FeatureIntro({ s }: { s: GameState }) {
  const day = chapterDayDef(s.chapter, s.chapterDay);
  // Day-clock basics are also explained to saves from before they existed (unlocked but never shown).
  const basics: FeatureId[] = ["clock", "checkin", "cleaning"];
  const f = (day?.introduce.find((x) => !s.seenTips.includes(x) && FEATURE_TIPS[x])
    ?? basics.find((x) => s.today.phase === "open" && s.unlocked.features.includes(x) && !s.seenTips.includes(x))) as FeatureId | undefined;
  if (!f) return null;
  const tip = FEATURE_TIPS[f];
  return (
    <Modal class="feature-intro" title={<>Mới: {tip.title}</>}>
      <ul class="tips">{tip.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <Btn block onClick={() => dispatch((g) => ({ ...g, seenTips: [...g.seenTips, f] }))}>Đã hiểu</Btn>
    </Modal>
  );
}

function pick<T>(arr: T[] | undefined, seed: number): T | undefined {
  return arr && arr.length ? arr[seed % arr.length] : undefined;
}

export function ExamOverlay({ ui, s }: { ui: UiState; s: GameState }) {
  const e = ui.exam;
  if (!e || e.phase === "running" || e.phase === "practice") return null;
  if (e.phase === "intro") {
    const c = e.customers[e.idx];
    const multi = e.customers.length > 1;
    return (
      <Modal class="exam" title="Bài kiểm tra cuối chương" onClose={e.idx === 0 ? flow.closeExam : undefined}>
        <div class="speaker">
          <Portrait id="anh-khoi" expr={e.idx === 0 ? "neutral" : "happy"} size={110} />
          <div class="bubble">
            {e.idx === 0
              ? <>Chào em! Hôm nay anh kiểm tra tay nghề. Làm đủ các mục trong phiếu, huyệt 2 bên thì làm cả 2 bên. Anh chỉ ghi tên huyệt thôi nhé.</>
              : <>Tốt. Sang ca tiếp theo nào.</>}
          </div>
        </div>
        <p class="center">{multi ? `Ca ${e.idx + 1}/${e.customers.length} · ` : ""}{c.items.length} mục · Đạt khi điểm ≥ {chapterExamPass(s)} và không lỗi an toàn</p>
        <Btn block onClick={() => flow.runExamItem()}>{e.idx === 0 ? "Bắt đầu" : "Ca tiếp theo"}</Btn>
      </Modal>
    );
  }
  const o = e.outcome!;
  if (e.revisit) {
    const pass = content.CHAPTERS.find((c) => c.no === e.revisit!.chapter)?.exam.passScore ?? 80;
    return (
      <Modal class="exam" title="Xem lại nhận xét" onClose={flow.closeExam}>
        <p class="rv-revisit-head">
          Bài kiểm tra chương {e.revisit.chapter} · ngày {e.revisit.day} · <b>{Math.round(o.score)}/100</b>{" "}
          {o.passed ? <Chip tone="sage">Đạt</Chip> : <Chip tone="danger">Chưa đạt</Chip>}
        </p>
        <ReviewBlock e={e} passed={o.passed} score={o.score} pass={pass} startOpen />
        {!e.review?.entries.length && <p class="center">Bài này không có mục nào cần xem lại. Tốt lắm!</p>}
        <Btn block kind={practiceable(e) && !e.practice?.done ? "secondary" : "primary"} onClick={flow.closeExam}>Đóng</Btn>
      </Modal>
    );
  }
  const praise = pick(content.TEXTS.examinerPraise, s.day) ?? "Tay nghề vững lắm. Chúc mừng em!";
  const critique = critiqueFor(e, s) ?? pick(content.TEXTS.examinerCritique, s.day) ?? "Còn vài huyệt chưa chắc. Mai em làm lại nhé.";
  return (
    <Modal class="exam" title={o.passed ? "Đạt bài kiểm tra!" : "Chưa đạt"}>
      <div class="speaker">
        <Portrait id="anh-khoi" expr={o.passed ? "praise" : "critique"} size={110} />
        <div class="bubble">{o.passed ? praise : critique}</div>
      </div>
      <p class="exam-score">Điểm: <b>{Math.round(o.score)}</b>/100</p>
      {o.passed ? (
        <div class="exam-reward">
          <UiArt name={o.badge || `badge-ch${o.chapter}`} size={130} />
          <p class="badge-line"><Award size={18} /> Huy hiệu Chương {o.chapter}</p>
          <p>Thưởng <b>{vnd(o.rewardMoney)}</b> · Uy tín <b>{signed(o.rewardRep)}</b></p>
          {s.freeMode ? <p>Đã mở chế độ <b>Khách tự do</b>!</p> : <p>Đã mở <b>Chương {Math.min(8, o.chapter + 1)}</b>.</p>}
        </div>
      ) : (
        <div>
          {!e.review?.entries.length && (
            <>
              <p>Huyệt cần luyện thêm:</p>
              <ul class="weak">{o.weakItems.map((key) => <li key={key}>{itemNameByKey(key)}</li>)}</ul>
            </>
          )}
        </div>
      )}
      <ReviewBlock e={e} passed={o.passed} score={o.score} pass={chapterExamPass(s)} />
      {!o.passed && <p class="muted small center">Được thi lại từ ngày hôm sau, không bị phạt tiền.</p>}
      <Btn block kind={practiceable(e) && !e.practice?.done ? "secondary" : "primary"} onClick={flow.closeExam}>Tiếp tục</Btn>
    </Modal>
  );
}
const practiceable = (e: NonNullable<UiState["exam"]>) => !!e.review?.entries.some((x) => x.wrong);

/** Review cards: open on a fail, collapsed on a pass (only items below 100). Practice button for wrong items. */
function ReviewBlock({ e, passed, score, pass, startOpen }: { e: NonNullable<UiState["exam"]>; passed: boolean; score: number; pass: number; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen || !passed);
  const r = e.review;
  if (!r?.entries.length) return null;
  const p = e.practice;
  return (
    <div class="rv-block">
      {passed && (
        <button class="rv-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          Anh Khôi nhận xét · {r.entries.length} mục cần xem lại {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      )}
      {open && <ExamReview entries={r.entries} total={r.total} pass={pass} score={score} passed={passed} />}
      {practiceable(e) && (
        <div class="rv-practice">
          {p?.done && <p class="rv-practice-done">Luyện xong: đúng <b>{p.good}/{p.total}</b> mục{p.good === p.total ? " – tốt lắm!" : "."}</p>}
          <Btn block onClick={flow.startPractice}><Dumbbell size={18} /> {p?.done ? "Luyện lại lần nữa" : "Luyện lại các huyệt sai"}</Btn>
          <p class="muted small center">Chỉ để luyện tay: có gợi ý, không tính tiền, uy tín hay độ thành thạo.</p>
        </div>
      )}
    </div>
  );
}

/** Pick the examiner's remark that matches what actually went wrong (position / eye safety / force / health profile). */
function critiqueFor(e: NonNullable<UiState["exam"]>, s: GameState): string | undefined {
  const L = (content.TEXTS.examinerCritique ?? []) as string[];
  const find = (re: RegExp) => L.find((t) => re.test(t));
  const items = e.results.flatMap((r) => r.items);
  const pregnant = e.customers.some((c) => c.health?.id === "pregnant");
  if (items.some((i) => i.safetyErrors > 0)) {
    if (pregnant && e.results.some((r, idx) => e.customers[idx]?.health && r.items.some((i) => i.safetyErrors > 0))) return find(/hồ sơ/);
    if (s.chapter === 1) return find(/nhãn cầu/);
  }
  if (s.unlocked.features.includes("force-bar") && items.some((i) => i.forceScore !== undefined && i.forceScore < 70)) return find(/^Lực/);
  return find(/lệch|mốc/);
}

function chapterExamPass(s: GameState) {
  return content.CHAPTERS.find((c) => c.no === s.chapter)?.exam.passScore ?? 80;
}

export function ChallengeResult({ ui }: { ui: UiState }) {
  const r = ui.challengeResult;
  if (!r) return null;
  return (
    <Modal title="Thử thách hôm nay" onClose={() => setUi({ challengeResult: undefined })}>
      <p class="exam-score">Điểm: <b>{Math.round(r.score)}</b>/100</p>
      <p class="center">Chuỗi ngày liên tiếp: <b>{r.streak}</b></p>
      {r.reward > 0 && <p class="center">Thưởng: <b>{vnd(r.reward)}</b></p>}
      <Btn block onClick={() => setUi({ challengeResult: undefined })}>Xong</Btn>
    </Modal>
  );
}

// ── Day summary (GAME_DESIGN §7.9) ──
export function SummaryScreen({ s, summary }: { s: GameState; summary: DaySummary }) {
  const L = summary.ledger;
  const recs = s.today.records ?? [];
  const byStaff = new Map<string, { count: number; revenue: number }>();
  for (const r of recs) {
    if (r.performer === "player") continue;
    const cur = byStaff.get(r.performer) ?? { count: 0, revenue: 0 };
    byStaff.set(r.performer, { count: cur.count + 1, revenue: cur.revenue + r.price });
  }
  const servedPlayer = summary.served - summary.servedByStaff;
  const staffParts = [...byStaff].map(([uid, v]) => `${staffLabel(s, uid)} ${v.count}`);
  const rewards = L.rewards ?? 0;
  const revenue = L.revenuePlayer + L.revenueStaff + L.tips + rewards;
  const opex = L.supplies + L.electricity + L.repairs + L.refunds + L.rent + L.other;
  const wages = L.wagesBase + L.wagesCommission + L.severance + L.bonuses;
  const repNow = s.reputation;
  const rentIn = s.rent.nextDueDay - s.day;
  const hasRentNote = summary.notes.some((n) => /thuê/i.test(n));
  const staffList = s.staff.filter((x) => x.role === "ktv" || x.role === "receptionist" || x.role === "cleaner");
  const roleLabel = { ktv: "KTV", receptionist: "Lễ tân", cleaner: "Tạp vụ" } as const;
  return (
    <div class="screen summary-screen">
      <div class="card summary">
        <h2 class="summary-title">Ngày {summary.day} – Tổng kết</h2>
        <p class="summary-shop">{s.shopName}</p>
        <p class="summary-line">
          Khách: phục vụ <b>{summary.served}</b>
          {summary.servedByStaff > 0 && <> (bạn {servedPlayer}{staffParts.length ? " · " + staffParts.join(" · ") : ` · KTV ${summary.servedByStaff}`})</>}
          {" "}· bỏ đi {summary.walkouts} · phàn nàn {summary.complaints}
        </p>
        {s.today.phase === "summary" && s.today.clock > content.CONFIG.clock.open && <p class="summary-line">Đóng cửa lúc <b>{hhmm(Math.max(s.today.clock, 0))}</b></p>}
        <p class="summary-line">Uy tín: <b>{rep(repNow)} ★</b> <span class={summary.reputationDelta < 0 ? "neg" : summary.reputationDelta > 0 ? "pos" : ""}>({signed(summary.reputationDelta)})</span></p>
        <hr />
        <LedgerRow label="Doanh thu" parts={[["bạn làm", L.revenuePlayer], ["KTV làm", L.revenueStaff], ["tip", L.tips], ["thưởng", rewards]]} total={revenue} />
        <LedgerRow label="Chi phí vận hành" neg parts={[["vật tư", L.supplies], ["điện", L.electricity], ["sửa chữa", L.repairs], ["đền bù", L.refunds], ["tiền thuê", L.rent], ["khác", L.other]]} total={-opex} />
        <LedgerRow
          label="Lương nhân viên"
          neg
          parts={
            byStaff.size === 0 && staffList.length === 0
              ? [["cứng", L.wagesBase], ["hoa hồng", L.wagesCommission], ["trợ cấp", L.severance], ["thưởng", L.bonuses]]
              : [["cứng", L.wagesBase], ["hoa hồng", L.wagesCommission], ["trợ cấp thôi việc", L.severance], ["thưởng", L.bonuses]]
          }
          total={-wages}
          sub={staffList.filter((x) => x.role === "ktv").map((x) => {
            const v = byStaff.get(x.uid);
            const comm = v ? Math.round((v.revenue * x.commissionPct) / 100) : 0;
            return `${roleLabel[x.role]} ${x.name}: cứng −${k(x.wage)}${comm ? ` hoa hồng −${k(comm)}` : ""}`;
          })}
        />
        <LedgerRow label="Khấu hao" neg parts={[["đồ dùng", L.depreciation]]} total={-L.depreciation} />
        <hr />
        <div class={`ledger-total${summary.profit < 0 ? " neg" : ""}`}><span>{summary.profit < 0 ? "Lỗ hôm nay" : "Lãi hôm nay"}</span><b>{k(summary.profit)}</b></div>
        <div class="ledger-total"><span>Số dư</span><b>{k(summary.moneyEnd)}</b></div>
        {L.purchases > 0 && <p class="muted small">Nhập vật tư / mua đồ hôm nay: −{k(L.purchases)} (đã trừ vào số dư, không tính vào lãi)</p>}
        {L.supplies + L.depreciation > 0 && <p class="muted small">Vật tư lấy từ kho và khấu hao được tính vào lãi nhưng không trừ thêm vào số dư.</p>}
        {!hasRentNote && rentIn <= 2 && <p class="warn-line">Tiền thuê đến hạn {rentIn <= 0 ? "hôm nay" : rentIn === 1 ? "ngày mai" : `sau ${rentIn} ngày`}: {k(s.rent.amount)}</p>}
        {summary.notes.map((n, i) => <p class="warn-line" key={i}>{n}</p>)}
        {(staffList.length > 0 || summary.itemsPracticed.length > 0 || summary.toReview.length > 0) && <hr />}
        {staffList.map((x) => {
          const next = tierDef(x.role, ((x.tier + 1) as 2 | 3));
          const cur = tierDef(x.role, x.tier);
          return (
            <p class="summary-line" key={x.uid}>
              Nhân viên: {roleLabel[x.role]} {x.name} – hài lòng {Math.round(x.satisfaction)}
              {next && cur ? ` · ${x.exp}/${cur.expToPromote} ca để lên ${next.label}` : ""}
              {x.quitNoticeDaysLeft != null && <span class="neg"> · sắp nghỉ ({x.quitNoticeDaysLeft} ngày)</span>}
            </p>
          );
        })}
        {summary.itemsPracticed.length > 0 && (
          <p class="summary-line">
            Huyệt hôm nay:{" "}
            {summary.itemsPracticed.map((it, i) => (
              <span key={it.key}>{i > 0 && " · "}{itemNameByKey(it.key)} {it.correct}/{it.total} <span class={it.correct === it.total ? "pos" : "warn"}>{it.correct === it.total ? "✓" : "⚠"}</span></span>
            ))}
          </p>
        )}
        {summary.toReview.length > 0 && <p class="summary-line">Cần ôn: <b>{summary.toReview.map(itemNameByKey).join(", ")}</b></p>}
      </div>
      <div class="summary-actions">
        <Btn block onClick={() => flow.nextDay()}>Sang ngày {summary.day + 1}</Btn>
      </div>
    </div>
  );
}

function staffLabel(s: GameState, uid: string) {
  const st = s.staff.find((x) => x.uid === uid);
  return st ? `${st.role === "ktv" ? "KTV " : ""}${st.name}` : "KTV";
}

function LedgerRow({ label, parts, total, neg, sub }: { label: string; parts: [string, number][]; total: number; neg?: boolean; sub?: string[] }) {
  const shown = parts.filter(([, v]) => v !== 0);
  return (
    <div class="ledger-row">
      <div class="lr-head"><span class="lr-label">{label}</span><b class={total < 0 ? "neg" : ""}>{total === 0 ? "0" : k(total)}</b></div>
      {sub && sub.length > 0 ? (
        <div class="lr-parts">{sub.join(" · ")}</div>
      ) : (
        shown.length > 0 && <div class="lr-parts">{shown.map(([n, v]) => `${n} ${neg ? k(-v) : k(v)}`).join("   ")}</div>
      )}
    </div>
  );
}
