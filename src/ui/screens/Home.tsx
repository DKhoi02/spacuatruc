import { useState } from "preact/hooks";
import type { Customer, GameState } from "@/core/types";
import { sceneSlots, type SceneSlots } from "@/ui/art/assets";
import { BedDouble, Bell, Brush, CalendarDays, Clock, DoorClosed, DoorOpen, HeartPulse, Hourglass, Package, PackageX, Sparkles, TriangleAlert, UserCheck, Users } from "lucide-preact";
import { api } from "../api";
import { Bar, Btn, Chip, Empty, Section } from "../components/bits";
import { Portrait } from "../components/Svg";
import { SceneView } from "../components/Scene";
import { chapterDayDef, chapterDef, content, equipmentDef, itemNameByKey, serviceDef, serviceName, supplyDef } from "../content";
import * as flow from "../flow";
import { areaLabel, areasOf, lobbyActors, lobbyScene, placementsFor, type Area } from "../sceneState";
import { AreaTabs, areaOfItem } from "./Shop";
import { query } from "../store";
import { setUi } from "../ui";
import { hhmm, vnd } from "../format";
import { useAsync } from "../useAsync";
import { Hud } from "./Hud";

export function Home({ s }: { s: GameState }) {
  const big = (s.shopLevel ?? 0) >= 1;
  const scene = lobbyScene(s.shopLevel);
  const slots = useAsync<SceneSlots>(() => sceneSlots(scene), [scene]);
  const placements = placementsFor(s, slots?.scene === scene ? slots : null, scene);
  const actors = lobbyActors(s, placements);
  const open = s.today.phase === "open";
  // Waiting chairs beyond the lobby art's slots (shop level 2–3: up to 10) show as a "+N ghế" badge.
  const chairs = content.CONFIG.startSeats + s.equipment.filter((e) => (equipmentDef(e.id)?.effect.queueSeats ?? 0) > 0).length;
  const extraChairs = slots ? Math.max(0, chairs - placements.filter((p) => p.slot.startsWith("chair-")).length) : 0;
  return (
    <div class="screen home">
      <Hud s={s} />
      {/* While open, a compact lobby (floor, chairs, counter) keeps the clock card and the queue within reach. */}
      <div class="lobby-wrap">
        <SceneView scene={scene} shopName={s.shopName} placements={placements} actors={actors} crop={open ? (big ? [0.42, 0.98] : [0.42, 0.8]) : undefined} class={`lobby-scene${big ? " front-row" : ""}${open ? " compact" : ""}`} />
        {extraChairs > 0 && <span class="chairs-more" title="Ghế chờ thêm ngoài khung hình">+{extraChairs} ghế</span>}
      </div>
      <div class="home-body">
        <ExamCard s={s} />
        {s.today.phase === "prep" && <MorningBrief s={s} />}
        {s.today.phase === "open" && <OpenShop s={s} />}
        {s.today.phase === "summary" && (
          <div class="card center-card">
            <p>Tiệm đã đóng cửa hôm nay.</p>
            <Btn onClick={() => flow.nextDay()} block>Sang ngày mới</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function ExamCard({ s }: { s: GameState }) {
  const examDay = query(() => api.isExamDay(s), false);
  if (!examDay || s.today.phase !== "prep") return null;
  const retry = query(() => api.retryReview(s), undefined);
  return (
    <div class="card exam-card">
      <Portrait id="anh-khoi" expr="happy" size={72} />
      <div class="grow">
        <h3>{retry ? "Hôm nay anh Khôi đến kiểm tra lại" : "Hôm nay anh Khôi đến kiểm tra tay nghề"}</h3>
        <p class="muted">Bài kiểm tra cuối chương {s.chapter}. Anh Khôi đến lúc tiệm vắng khách và ngồi chờ trong hàng – chạm “Bắt đầu kiểm tra” khi sẵn sàng (bài kiểm tra mất khoảng 1 giờ).</p>
        {retry && <p class="small">Lần trước (ngày {retry.day}): {Math.round(retry.score)} điểm, chưa đạt. Xem lại các mục sai trước khi thi nhé.</p>}
        {retry && <Btn small kind="secondary" class="exam-review-btn" onClick={flow.openLastReview}>Xem lại nhận xét</Btn>}
      </div>
    </div>
  );
}

/** Supplies at 0 / required tools not owned for some unlocked service (its customers would walk out on arrival). */
function outOfStockFor(s: GameState): string[] {
  const out = new Set<string>();
  for (const id of s.unlocked.services) {
    const svc = serviceDef(id);
    if (!svc) continue;
    for (const [k, n] of Object.entries(svc.supplies ?? {})) {
      if ((n ?? 0) > 0 && (s.inventory[k as keyof typeof s.inventory] ?? 0) <= 0) out.add(supplyDef(k)?.name ?? k);
    }
    for (const tid of svc.requiresEquipment ?? []) {
      if (!s.equipment.some((e) => e.id === tid) && !(equipmentDef(tid)?.effect.beds)) out.add(equipmentDef(tid)?.name ?? tid);
    }
  }
  return [...out];
}

const kindLabel = { learn: "Ngày học", review: "Ngày ôn tập", exam: "Ngày kiểm tra" } as const;

function MorningBrief({ s }: { s: GameState }) {
  const brief = query(() => api.getMorningBrief(s), null);
  // Supply warnings get their own block with a shortcut to the shop; the rent reminder has its own line below.
  const isSupplyTip = (t: string) => /^(Hết|Sắp hết|Chưa có) /.test(t);
  // (rent reminders are replaced by the single warn line below, but keep the landlord's "chưa trả" warning)
  const isRentTip = (t: string) => !!brief && brief.rentDueInDays <= 2 && /trả tiền thuê|tiền thuê .*đến hạn/i.test(t) && !/chưa trả/i.test(t);
  const tips = brief ? brief.tips.filter((t) => !isSupplyTip(t) && !isRentTip(t)) : [];
  const supplyTips = brief ? brief.tips.filter(isSupplyTip) : [];
  const outOfStock = outOfStockFor(s);
  const day = chapterDayDef(s.chapter, s.chapterDay);
  const ch = chapterDef(s.chapter);
  return (
    <div class="card brief">
      <div class="brief-head">
        <Sparkles size={22} />
        <div>
          <h2>Chào buổi sáng!</h2>
          <p class="muted">{ch ? `Chương ${s.chapter} – ${ch.title}` : `Chương ${s.chapter}`}{day ? ` · ${kindLabel[day.kind]}` : ""}</p>
        </div>
      </div>
      {day && day.newItems.length > 0 && (
        <div class="brief-row">
          <span class="label">Huyệt mới hôm nay</span>
          <div class="chips">{day.newItems.map((it) => <Chip tone="sage" key={it.id}>{itemNameByKey(`${it.kind === "point" ? "P" : it.kind === "muscle" ? "M" : "Z"}:${it.id}`)}</Chip>)}</div>
        </div>
      )}
      {brief ? (
        <>
          <div class="brief-row">
            <span class="label"><Users size={16} /> Khách dự kiến</span>
            <b>{brief.expectedCustomers[0] === brief.expectedCustomers[1] ? brief.expectedCustomers[0] : `${brief.expectedCustomers[0]}–${brief.expectedCustomers[1]}`} khách</b>
          </div>
          {brief.likelyServices.length > 0 && (
            <div class="brief-row">
              <span class="label">Dịch vụ có thể được gọi</span>
              <div class="chips">{brief.likelyServices.map((id) => <Chip key={id}>{serviceName(id)}</Chip>)}</div>
            </div>
          )}
          {brief.event && (
            <div class="event-card"><TriangleAlert size={18} /><div><b>{brief.event.title}</b><p>{brief.event.description}</p></div></div>
          )}
          {tips.length > 0 && (
            <ul class="tips">{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          )}
          {supplyTips.length > 0 && (
            <div class="event-card supply-warn">
              <PackageX size={18} />
              <div class="grow">
                {supplyTips.map((t, i) => <p key={i}>{t}</p>)}
                <Btn small kind="secondary" onClick={() => setUi({ tab: "shop" })}>Đến cửa hàng</Btn>
              </div>
            </div>
          )}
          {brief.rentDueInDays <= 2 && (
            <p class="warn-line"><CalendarDays size={16} /> {brief.rentDueInDays <= 0 ? "Cuối ngày hôm nay" : brief.rentDueInDays === 1 ? "Ngày mai" : `Sau ${brief.rentDueInDays} ngày`} trả tiền thuê {vnd(s.rent.amount)}</p>
          )}
        </>
      ) : (
        <p class="muted">Chưa có dự báo hôm nay.</p>
      )}
      <Btn block onClick={() => {
        if (outOfStock.length && !confirm(`Thiếu ${outOfStock.join(", ")}. Khách gọi dịch vụ cần thứ này sẽ bỏ về ngay. Vẫn mở cửa?`)) return;
        flow.openShop();
      }}><DoorOpen size={20} /> Mở cửa</Btn>
    </div>
  );
}

function OpenShop({ s }: { s: GameState }) {
  const t = s.today;
  const playerBusy = t.inService.find((x) => x.performer === "player");
  const freeKtvs = s.staff.filter((x) => x.role === "ktv" && !x.sickToday && !t.inService.some((i) => i.performer === x.uid));
  const canHire = s.unlocked.features.includes("hire-ktv");
  const dayOver = query(() => api.isDayOver(s), false);
  const queue = t.queue.filter((c) => !t.inService.some((x) => x.customerId === c.id));
  return (
    <>
      {playerBusy && <ResumeCard s={s} customerId={playerBusy.customerId} />}
      {!dayOver && <TimeBar s={s} busy={!!playerBusy} />}
      <Section title={<><Users size={18} /> Hàng chờ ({queue.length})</>} right={t.arrivals.length > 0 ? <span class="muted small">Sắp đến: {t.arrivals.length} khách</span> : undefined}>
        {queue.length === 0 && !dayOver && (
          <div class="card center-card">
            <Empty>Chưa có khách đang chờ.</Empty>
          </div>
        )}
        {queue.map((c) => (
          <CustomerCard key={c.id} c={c} s={s} busy={!!playerBusy} ktvs={canHire ? freeKtvs : []} />
        ))}
      </Section>
      <Stations s={s} busy={!!playerBusy} />
      {t.walkouts.length > 0 && <WalkoutNote s={s} />}
      {dayOver && (
        <div class="card center-card">
          <p><b>Hết khách hôm nay.</b></p>
          <Btn block onClick={() => flow.closeDay()}>Đóng cửa & tổng kết</Btn>
        </div>
      )}
    </>
  );
}

/** Clock + "Chờ" (jump to the next event) + early close. */
function TimeBar({ s, busy }: { s: GameState; busy: boolean }) {
  const ev = query(() => api.nextEvent(s), undefined);
  const early = query(() => api.canCloseEarly(s), false);
  // Shortcut: a bed to clean when nobody else will (no cleaner on duty) and customers are waiting.
  const cleanerWorks = s.staff.some((x) => x.role === "cleaner" && !x.sickToday);
  const labels = stationLabels(s);
  const d = !cleanerWorks && s.today.queue.length > 0 ? s.equipment.find((e) => e.dirty && labels.has(e.uid) && !s.today.inService.some((x) => x.bedSlot === e.uid)) : undefined;
  const dirty = d && { uid: d.uid, label: labels.get(d.uid)! };
  return (
    <div class="card timebar">
      <div class="tb-clock"><Clock size={18} /> <b>{hhmm(s.today.clock)}</b><span class="muted small"> / đóng cửa {hhmm(content.CONFIG.clock.close)}</span></div>
      {ev ? (
        <Btn kind="secondary" block disabled={busy} onClick={() => flow.waitNext()}>
          <Hourglass size={18} /> <span class="tb-wait">Chờ đến {hhmm(ev.at)} – {ev.label}</span>
        </Btn>
      ) : !early && <p class="muted small center">Không còn khách nào sắp đến.</p>}
      {dirty && <Btn kind="secondary" block disabled={busy} onClick={() => flow.cleanStation(dirty.uid)}><Brush size={18} /> Dọn {dirty.label.toLowerCase()} · {content.CONFIG.clock.cleanMin} phút</Btn>}
      {early && <Btn kind="ghost" block onClick={() => flow.closeEarly()}><DoorClosed size={18} /> Đóng cửa sớm</Btn>}
    </div>
  );
}

/** Display name for each station: Giường 1, 2…, Ghế gội 1, Phòng VIP. */
function stationLabels(s: GameState): Map<string, string> {
  const out = new Map<string, string>();
  const counts = new Map<string, number>();
  const stations = s.equipment.filter((e) => isStation(e.id)).sort((a, b) => (a.slot ?? "").localeCompare(b.slot ?? "", undefined, { numeric: true }));
  const group = (id: string) => (id === "E01" ? "bed" : id);
  for (const e of stations) {
    const g = group(e.id);
    const n = (counts.get(g) ?? 0) + 1;
    counts.set(g, n);
    const many = stations.filter((x) => group(x.id) === g).length > 1;
    const base = g === "bed" ? "Giường" : equipmentDef(e.id)?.name ?? e.id;
    out.set(e.uid, many || g === "bed" ? `${base} ${n}` : base);
  }
  return out;
}
const isStation = (id: string) => ["E01", "E06", "E10", "vip-room"].includes(id) || (equipmentDef(id)?.effect.beds ?? 0) > 0;

/** Room view: every station with its state (trống / đang làm / cần dọn / tạp vụ đang dọn). */
function Stations({ s, busy }: { s: GameState; busy: boolean }) {
  const labels = stationLabels(s);
  const t = s.today;
  const cleanerWorks = s.staff.some((x) => x.role === "cleaner" && !x.sickToday);
  const [pick, setArea] = useState<Area>("room1");
  if (!labels.size) return null;
  // Tabs: Phòng 1 / Phòng 2 (level ≥2) / Khu gội đầu / Khu ngâm chân. Beds bed-5..8 are in room 2; the VIP room is listed with room 1.
  const areas = areasOf(s, { stationsOnly: true });
  const area = areas.includes(pick) ? pick : "room1";
  const tabbed = areas.length > 1;
  const areaOfUid = (uid: string): Area => { const a = areaOfItem(s.equipment.find((x) => x.uid === uid)!); return areas.includes(a) ? a : "room1"; };
  const inArea = (uid: string) => !tabbed || areaOfUid(uid) === area;
  const busyIn = (a: Area) => [...labels.keys()].filter((uid) => areaOfUid(uid) === a && t.inService.some((x) => x.bedSlot === uid)).length;
  const list = [...labels].filter(([uid]) => inArea(uid));
  const title = !tabbed || area === "room1" || area === "room2" ? "Phòng trị liệu" : areaLabel[area];
  return (
    <Section title={<><BedDouble size={18} /> {title}</>} right={cleanerWorks ? <span class="muted small">Tạp vụ tự dọn</span> : undefined}>
      {tabbed && <AreaTabs areas={areas} area={area} setArea={setArea} busy={busyIn} />}
      <div class="card stations">
        {list.length === 0 && <Empty>{area === "wash" ? "Chưa có ghế gội đầu. Mua trong Cửa hàng › Đồ dùng." : area === "foot" ? "Chưa có ghế ngâm chân. Mua trong Cửa hàng › Đồ dùng." : "Chưa có giường ở phòng này."}</Empty>}
        {list.map(([uid, label]) => {
          const e = s.equipment.find((x) => x.uid === uid)!;
          const job = t.inService.find((x) => x.bedSlot === uid);
          const clean = (t.cleaning ?? []).find((x) => x.stationUid === uid);
          let body;
          if (job) {
            const c = query(() => api.servingCustomer(s, job.customerId), undefined);
            const who = job.performer === "player" ? "Bạn" : `KTV ${s.staff.find((x) => x.uid === job.performer)?.name ?? ""}`;
            const total = Math.max(1, job.endsAt - job.startAt);
            const done = job.performer === "player" ? 0 : Math.min(total, t.clock - job.startAt);
            body = (
              <div class="st-body">
                <div class="st-line"><Chip tone="amber">Đang làm</Chip><span class="small">{who} · {c?.name ?? "khách"}</span></div>
                <div class="st-line"><Bar value={done} max={total} tone="ok" /><span class="small muted nowrap">{job.performer === "player" ? `${total} phút` : `xong ${hhmm(job.endsAt)}`}</span></div>
              </div>
            );
          } else if (clean) {
            body = (
              <div class="st-body">
                <div class="st-line"><Chip tone="guide">Tạp vụ đang dọn</Chip></div>
                <div class="st-line"><Bar value={t.clock - clean.startAt} max={Math.max(1, clean.endsAt - clean.startAt)} tone="ok" /><span class="small muted nowrap">xong {hhmm(clean.endsAt)}</span></div>
              </div>
            );
          } else if (e.usesLeft <= 0) {
            body = <div class="st-body"><div class="st-line"><Chip tone="danger">Hỏng</Chip><span class="small muted">Sửa trong Cửa hàng</span></div></div>;
          } else if (e.dirty) {
            body = (
              <div class="st-body st-row">
                <Chip tone="rose" icon={<Sparkles size={13} />}>Cần dọn</Chip>
                <Btn small kind="secondary" disabled={busy} onClick={() => flow.cleanStation(uid)}><Brush size={16} /> {e.id === "E06" || e.id === "E10" ? "Dọn ghế" : e.id === "vip-room" ? "Dọn phòng" : "Dọn giường"} · {content.CONFIG.clock.cleanMin} phút</Btn>
              </div>
            );
          } else {
            body = <div class="st-body"><div class="st-line"><Chip tone="sage">Trống</Chip></div></div>;
          }
          return (
            <div class="station" key={uid}>
              <StationName label={label} tier={e.tier ?? 1} />
              {body}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** Station name; the number and tier stars stay together when a long name ("Ghế ngâm chân 1 ★★") wraps. */
function StationName({ label, tier }: { label: string; tier: number }) {
  const m = /^(.*?)( \d+)?$/.exec(label)!;
  return (
    <div class="st-name">
      {m[1]}<span class="nowrap">{m[2] ?? ""}{tier > 1 && <span class="tier-stars tier-mini">{"★".repeat(tier - 1)}</span>}</span>
    </div>
  );
}

/** "Khách đã bỏ về: N" + why (queue full, waited too long...), grouped by reason. */
function WalkoutNote({ s }: { s: GameState }) {
  const ids = s.today.walkouts.filter((id) => !id.startsWith("exam-"));
  if (!ids.length) return null;
  const counts = new Map<string, number>();
  for (const id of ids) {
    const r = query(() => api.walkoutReason(s, id), undefined);
    if (r?.key === "closing") continue;
    const text = r?.text ?? "Khách bỏ về.";
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (!total) return null;
  return (
    <div class="muted small walkouts">
      <p>Khách đã bỏ về: {total}</p>
      {[...counts].map(([text, n]) => <p key={text}>{n > 1 ? `${n} khách – ${text.replace(/,? khách bỏ về\.?$/i, "")}` : text}</p>)}
    </div>
  );
}

function ResumeCard({ s, customerId }: { s: GameState; customerId: string }) {
  const c = query(() => api.servingCustomer(s, customerId), undefined) ?? s.today.queue.find((q) => q.id === customerId);
  return (
    <div class="card resume-card">
      <HeartPulse size={22} />
      <div class="grow">
        <b>Đang phục vụ {c?.name ?? "khách"}</b>
        <p class="muted small">Ca trị liệu chưa xong.</p>
      </div>
      <Btn small onClick={() => flow.resumeFromSave(c)}>Tiếp tục</Btn>
    </div>
  );
}

function CustomerCard({ c, s, busy, ktvs }: { c: Customer; s: GameState; busy: boolean; ktvs: GameState["staff"] }) {
  const services = c.combo ? c.combo.services : [c.serviceId];
  const staffOk = ktvs.length > 0 && c.checkedIn && services.every((id) => query(() => api.staffCanPerform(s, id), false));
  const can = query(() => api.canServe(s, c.id), { ok: false as const, reason: "" });
  const isExaminer = c.special === "examiner";
  const rate = c.checkedIn ? 1 : content.CONFIG.patience.uncheckedRate;
  const left = Math.max(0, Math.floor(c.patience / rate));
  const walkoutsOn = s.chapter > 1 || s.freeMode || s.unlocked.features.includes("walkout");
  const impatient = !isExaminer && left <= 10;
  return (
    <div class={`card customer-card${impatient ? " impatient" : ""}`}>
      <div class="cc-top">
        <Portrait id={c.characterId} expr={impatient ? "annoyed" : "neutral"} size={64} class="cc-portrait" />
        <div class="grow">
          <div class="cc-name">
            <b>{c.name}</b>
            {c.regular && <Chip tone="sage" icon={<UserCheck size={14} />}>Khách quen</Chip>}
            {c.special === "vip" && <Chip tone="amber">VIP</Chip>}
          </div>
          <div class="cc-service">
            {isExaminer ? "Bài kiểm tra cuối chương" : c.combo ? <><Package size={14} class="cc-combo-ic" /> {c.combo.name}</> : serviceName(c.serviceId)}
          </div>
          {c.combo && <div class="muted tiny">{c.combo.services.map(serviceName).join(" + ")}</div>}
          <div class="chips">
            {!isExaminer && <Chip icon={<Clock size={14} />}>{c.durationMin} phút</Chip>}
            <Chip>{c.items.length} mục</Chip>
            {isExaminer ? <Chip tone="sage">Chờ bạn sẵn sàng</Chip> : (
              <Chip tone={left <= 5 ? "danger" : left <= 15 ? "amber" : "neutral"} icon={<Hourglass size={14} />}>
                {left <= 0 ? (walkoutsOn ? "Sắp bỏ về" : "Chờ lâu rồi") : `Đến ${hhmm(c.arriveAt)} · chờ được ~${left} phút`}
              </Chip>
            )}
            {!isExaminer && !c.checkedIn && <Chip tone="guide" icon={<Bell size={14} />}>Chưa đón</Chip>}
            {c.health && <Chip tone="rose" icon={<HeartPulse size={14} />}>{c.health.label}</Chip>}
          </div>
        </div>
      </div>
      {!isExaminer && c.checkedIn && !can.ok && can.reason && !busy && <p class="cc-reason small">{can.reason}</p>}
      <div class="cc-actions">
        {isExaminer ? (
          <>
            <Btn onClick={() => flow.startExam()} disabled={busy}>Bắt đầu kiểm tra</Btn>
            {query(() => api.retryReview(s), undefined) && <Btn kind="secondary" class="cc-review" onClick={flow.openLastReview} disabled={busy}>Xem lại nhận xét</Btn>}
          </>
        ) : !c.checkedIn ? (
          <Btn onClick={() => flow.checkIn(c.id)} disabled={busy}><Bell size={18} /> Đón khách · {content.CONFIG.clock.checkInMin} phút</Btn>
        ) : (
          <Btn onClick={() => flow.serve(c.id)} disabled={busy || !can.ok}>Phục vụ</Btn>
        )}
        {staffOk && can.ok && !isExaminer && ktvs.map((k) => (
          <Btn key={k.uid} kind="secondary" onClick={() => flow.assign(c.id, k.uid)}>Giao {k.name} · {query(() => api.staffMinutes(c, k.tier), c.durationMin)} phút</Btn>
        ))}
        {!isExaminer && <Btn kind="ghost" onClick={() => flow.sendAway(c.id)}>Từ chối</Btn>}
      </div>
    </div>
  );
}
