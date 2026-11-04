import type { GameState, Staff as StaffT } from "@/core/types";
import { Gift, Lock, RefreshCw, TrendingUp, UserMinus, UserPlus, Moon } from "lucide-preact";
import { api } from "../api";
import { Bar, Btn, Chip, Empty, Section } from "../components/bits";
import { Portrait } from "../components/Svg";
import { content, tierDef } from "../content";
import { hhmm, vnd } from "../format";
import { dispatch, toast } from "../store";
import { Hud } from "./Hud";

const roleLabel = { ktv: "Kỹ thuật viên", receptionist: "Lễ tân", cleaner: "Tạp vụ" } as const;
const tierStars = (t: number) => "★".repeat(t);

/** What each role does for the shop (GAME_DESIGN §11.3–11.4). */
export function roleEffect(role: StaffT["role"], tier: number): string {
  const C = content.CONFIG;
  if (role === "receptionist") return `Tự đón khách ngay khi đến · khách chờ thêm ${C.patience.receptionistBonusMin} phút · báo vật tư sắp hết`;
  if (role === "cleaner") return `Tự dọn giường sau mỗi ca (${C.clock.cleanMin} phút/giường) · bớt khăn · ít phàn nàn hơn`;
  const f = C.ktvTimeFactor[tier as 1 | 2 | 3] ?? 1;
  return `Làm khách song song trên giường riêng · mỗi ca ${f === 1 ? "đúng thời lượng" : `×${f.toLocaleString("vi-VN")} thời lượng`}`;
}

/** Live status during opening hours. */
function nowDoing(s: GameState, x: StaffT): string | undefined {
  if (s.today.phase !== "open" || x.sickToday) return undefined;
  const job = s.today.inService.find((i) => i.performer === x.uid);
  if (job) return `Đang làm cho ${api.servingCustomer(s, job.customerId)?.name ?? "khách"}, xong lúc ${hhmm(job.endsAt)}`;
  const cl = (s.today.cleaning ?? []).find((j) => j.staffUid === x.uid);
  if (cl) return `Đang dọn giường, xong lúc ${hhmm(cl.endsAt)}`;
  return x.role === "receptionist" ? "Đang đứng quầy đón khách" : "Đang rảnh";
}

export function StaffScreen({ s }: { s: GameState }) {
  const unlocked = s.unlocked.features.includes("hire-ktv");
  return (
    <div class="screen">
      <Hud s={s} />
      <h1 class="screen-title">Nhân viên</h1>
      {!unlocked ? (
        <div class="card center-card locked">
          <Lock size={32} />
          <p><b>Chưa mở bảng tuyển dụng</b></p>
          <p class="muted">Bảng tuyển dụng kỹ thuật viên mở từ ngày 5 của Chương 1.</p>
        </div>
      ) : (
        <>
          <Section title={`Đang làm (${s.staff.length})`}>
            {s.staff.length === 0 && <Empty>Chưa thuê ai. Tiệm chỉ có mình bạn.</Empty>}
            <div class="list">{s.staff.map((x) => <StaffCard key={x.uid} x={x} s={s} />)}</div>
          </Section>
          <Candidates s={s} />
        </>
      )}
    </div>
  );
}

function StaffCard({ x, s }: { x: StaffT; s: GameState }) {
  const cur = tierDef(x.role, x.tier);
  const next = tierDef(x.role, (x.tier + 1) as 2 | 3);
  const severance = x.wage * content.CONFIG.severanceDays;
  const off = !!x.sickToday;
  return (
    <div class={`card staff-card${x.quitNoticeDaysLeft != null ? " quitting" : ""}`}>
      <div class="cc-top">
        <Portrait id={x.characterId} expr={x.satisfaction < 40 ? "tired" : x.satisfaction > 75 ? "happy" : "neutral"} size={64} />
        <div class="grow">
          <div class="cc-name"><b>{x.name}</b> <Chip tone="amber">{tierStars(x.tier)} {cur?.label ?? ""}</Chip></div>
          <div class="muted small">{roleLabel[x.role]} · lương {vnd(x.wage)}/ngày{x.role === "ktv" ? ` · hoa hồng ${x.commissionPct}%` : ""}</div>
          <div class="staff-effect small">{roleEffect(x.role, x.tier)}</div>
          {nowDoing(s, x) && <div class="small staff-now">{nowDoing(s, x)}</div>}
          <div class="stat"><span class="small">Hài lòng</span><Bar value={x.satisfaction} max={100} tone={x.satisfaction < 20 ? "danger" : x.satisfaction < 50 ? "warn" : "ok"} /><span class="small">{Math.round(x.satisfaction)}</span></div>
          {next && cur && <div class="stat"><span class="small">Kinh nghiệm</span><Bar value={x.exp} max={cur.expToPromote} tone="ok" /><span class="small">{x.exp}/{cur.expToPromote}</span></div>}
          <div class="chips">
            {off && <Chip tone="guide" icon={<Moon size={14} />}>Nghỉ hôm nay</Chip>}
            {x.unpaidDays > 0 && <Chip tone="danger">Nợ lương {x.unpaidDays} ngày</Chip>}
            {x.quitNoticeDaysLeft != null && <Chip tone="danger">Xin nghỉ – còn {x.quitNoticeDaysLeft} ngày</Chip>}
          </div>
        </div>
      </div>
      {x.promotionRequested && (
        <div class="promo">
          <TrendingUp size={18} />
          <div class="grow small"><b>{x.name}</b> xin lên <b>{next?.label ?? "trình độ mới"}</b>{next ? ` (lương ${vnd(next.baseWage)}, hoa hồng ${next.commissionPct}%)` : ""}.</div>
          <Btn small onClick={() => dispatch((g) => api.answerPromotion(g, x.uid, true))}>Đồng ý</Btn>
          <Btn small kind="ghost" onClick={() => dispatch((g) => api.answerPromotion(g, x.uid, false))}>Từ chối</Btn>
        </div>
      )}
      <div class="cc-actions">
        <Btn small kind="secondary" onClick={() => dispatch((g) => api.giveRaise(g, x.uid, 10000)) && toast(`Đã tăng lương cho ${x.name}`, "ok")}>+10k lương</Btn>
        <Btn small kind="secondary" disabled={s.money < 50000} onClick={() => dispatch((g) => api.giveBonus(g, x.uid, 50000)) && toast(`Đã thưởng ${x.name} 50.000đ`, "ok")}><Gift size={16} /> Thưởng 50k</Btn>
        <Btn small kind="secondary" onClick={() => dispatch((g) => api.setDayOff(g, x.uid, !off))}>{off ? "Đi làm lại" : "Cho nghỉ 1 ngày"}</Btn>
        <Btn small kind="danger" onClick={() => confirm(`Cho ${x.name} nghỉ việc? Trợ cấp thôi việc ${vnd(severance)} (${content.CONFIG.severanceDays} ngày lương).`) && dispatch((g) => api.fire(g, x.uid))}>
          <UserMinus size={16} /> Cho nghỉ việc
        </Btn>
      </div>
    </div>
  );
}

function Candidates({ s }: { s: GameState }) {
  const fee = content.CONFIG.postJobFee;
  const daysLeft = s.candidatesRefreshDay - s.day;
  return (
    <Section title="Bảng tuyển dụng" right={<span class="muted small">{daysLeft > 0 ? `Làm mới sau ${daysLeft} ngày` : "Làm mới hôm nay"}</span>}>
      {s.candidates.length === 0 && <Empty>Chưa có ứng viên.</Empty>}
      <div class="list">
        {s.candidates.map((c, i) => {
          const t = tierDef(c.role, c.tier);
          return (
            <div class="card row-card" key={`${c.characterId}-${i}`}>
              <Portrait id={c.characterId} size={60} />
              <div class="grow">
                <div class="cc-name"><b>{c.name}</b> <Chip tone="amber">{tierStars(c.tier)} {t?.label ?? ""}</Chip></div>
                <div class="muted small">{roleLabel[c.role]} · {vnd(c.wage)}/ngày{c.role === "ktv" ? ` · ${c.commissionPct}% hoa hồng` : ""}</div>
                <div class="staff-effect small">{roleEffect(c.role, c.tier)}</div>
                {t && c.role === "ktv" && <div class="muted small">Chất lượng dự kiến ~{t.avgStars.toLocaleString("vi-VN")} ★</div>}
              </div>
              <Btn small onClick={() => dispatch((g) => api.hire(g, i)) && toast(`Đã thuê ${c.name}`, "ok")}><UserPlus size={16} /> Thuê</Btn>
            </div>
          );
        })}
      </div>
      <Btn kind="secondary" block disabled={s.money < fee} onClick={() => dispatch((g) => api.refreshCandidates(g, true))}><RefreshCw size={16} /> Đăng tin mới · {vnd(fee)}</Btn>
    </Section>
  );
}
