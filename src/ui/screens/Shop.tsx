import { useState } from "preact/hooks";
import type { GameState, OwnedEquipment, ServiceId, SupplyId } from "@/core/types";
import { equipmentArt, sceneSlots, type SceneSlots } from "@/ui/art/assets";
import { ArrowUpCircle, BedDouble, Check, Lock, Megaphone, Expand, Package, Tag, Wrench, Sofa, Plus } from "lucide-preact";
import { api } from "../api";
import { Bar, Btn, Chip, Empty, Section } from "../components/bits";
import { EquipIcon, ItemIcon } from "../components/Svg";
import { SceneView } from "../components/Scene";
import { content, equipmentDef, serviceDef, serviceName } from "../content";
import { vnd } from "../format";
import { dispatch, query, toast } from "../store";
import { areaLabel, areaScene, areasOf, artOf, decorFor, durabilityState, placementsFor, roomOf, type Area } from "../sceneState";
import { Decorate } from "./Decorate";
import { useAsync } from "../useAsync";
import { Hud } from "./Hud";

type ShopTab = "supplies" | "equipment" | "decor" | "prices" | "more";

export function Shop({ s }: { s: GameState }) {
  const [tab, setTab] = useState<ShopTab>("supplies");
  const f = s.unlocked.features;
  const tabs: { id: ShopTab; label: string; show: boolean }[] = [
    { id: "supplies", label: "Vật tư", show: true },
    { id: "equipment", label: "Đồ dùng", show: true },
    { id: "decor", label: "Trang trí", show: true },
    { id: "prices", label: "Giá", show: f.includes("pricing") },
    { id: "more", label: "Mở rộng", show: f.includes("expansion") || f.includes("ads") || f.includes("combo") },
  ];
  return (
    <div class="screen">
      <Hud s={s} />
      <h1 class="screen-title">Cửa hàng</h1>
      <div class="seg">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.id} class={`seg-btn${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === "supplies" && <Supplies s={s} />}
      {tab === "equipment" && <Equipment s={s} />}
      {tab === "decor" && <Decorate s={s} />}
      {tab === "prices" && <Prices s={s} />}
      {tab === "more" && <More s={s} />}
    </div>
  );
}

function Supplies({ s }: { s: GameState }) {
  const list = content.SUPPLIES.filter((x) => s.unlocked.supplies.includes(x.id));
  const need = new Map<SupplyId, number>();
  for (const id of s.unlocked.services) {
    const d = serviceDef(id);
    if (d) for (const [k, v] of Object.entries(d.supplies)) need.set(k as SupplyId, Math.max(need.get(k as SupplyId) ?? 0, v ?? 0));
  }
  if (!list.length) return <Empty>Chưa có vật tư nào để mua.</Empty>;
  return (
    <div class="list">
      {list.map((x) => {
        const have = s.inventory[x.id] ?? 0;
        const low = have < (need.get(x.id) ?? 1) * 3;
        return (
          <div class="card row-card" key={x.id}>
            <ItemIcon id={x.id} size={52} />
            <div class="grow">
              <b>{x.name}</b>
              <div class="muted small">Gói {x.packSize} phần · {vnd(x.packPrice)}</div>
              <div class="chips"><Chip tone={have === 0 ? "danger" : low ? "amber" : "sage"} icon={<Package size={14} />}>Còn {have}</Chip></div>
            </div>
            <div class="col-actions">
              <Btn small disabled={s.money < x.packPrice} onClick={() => dispatch((g) => api.buySupply(g, x.id, 1)) && toast(`Đã nhập ${x.packSize} ${x.name.toLowerCase()}`, "ok")}>+1 gói</Btn>
              <Btn small kind="secondary" disabled={s.money < x.packPrice * 3} onClick={() => dispatch((g) => api.buySupply(g, x.id, 3))}>+3 gói</Btn>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Tier stars ★★☆ (Thường / Tốt / Cao cấp). */
export function TierStars({ tier }: { tier: number }) {
  return <span class={`tier-stars tier-${tier}`} aria-label={`Cấp ${api.tierName(tier)}`}>{"★".repeat(tier)}<span class="off">{"★".repeat(3 - tier)}</span></span>;
}

/** Area tabs: Phòng 1 / Phòng 2 (shop level ≥2) / Khu gội đầu / Khu ngâm chân. `busy` adds a small count per tab. */
export function AreaTabs({ areas, area, setArea, busy }: { areas: Area[]; area: Area; setArea: (a: Area) => void; busy?: (a: Area) => number }) {
  return (
    <div class={`seg room-tabs area-tabs n${areas.length}`} role="tablist">
      {areas.map((a) => {
        const n = busy?.(a) ?? 0;
        return (
          <button key={a} role="tab" aria-selected={area === a} class={`seg-btn${area === a ? " on" : ""}`} onClick={() => setArea(a)}>
            {areaLabel[a]}{n > 0 && <span class="tab-busy" aria-label={`${n} đang làm`}>{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Area an owned item belongs to (for the "Đồ đang có" list under the area tabs): lobby / VIP items stay with Phòng 1. */
export function areaOfItem(e: OwnedEquipment): Area {
  const sc = equipmentDef(e.id)?.scene;
  if (sc === "S04") return "wash";
  if (sc === "S05") return "foot";
  if (sc === "S02" && roomOf(e) === 2) return "room2";
  return "room1";
}

/** Upgrade preview: what the next tier gives (§12.2). */
function upgradePreview(e: OwnedEquipment): string {
  const T = content.CONFIG.equipmentTiers;
  const d = equipmentDef(e.id)!;
  const t = api.tierOf(e);
  const nx = { ...e, tier: (t + 1) as 2 | 3 };
  const parts: string[] = [];
  if ((d.effect.queueSeats ?? 0) > 0) parts.push(`khách chờ thêm ${T.patienceMin[t]} phút`);
  else if (d.scene === "S02" && !d.effect.beds && (d.effect.tipBonusPct ?? 0) > 0) parts.push(`tip +${pct(T.tipPct[t])}`);
  else parts.push(`khách trả +${pct(T.pricePct[t])}`, `tip +${pct(T.tipPct[t])}`);
  if (d.effect.beds || d.id === "E06" || d.id === "E10") parts.push("ít phàn nàn hơn");
  parts.push(`bền ×${T.durability[t].toLocaleString("vi-VN")}`);
  if (d.electricityPerUse || d.dailyElectricity) parts.push(`điện ×${T.electricity[t].toLocaleString("vi-VN")}`);
  parts.push(`sửa ${vnd(api.repairCost(nx))}`);
  return parts.join(" · ");
}

function Equipment({ s }: { s: GameState }) {
  const level = s.shopLevel ?? 0;
  const areas = areasOf(s);
  const [pick, setArea] = useState<Area>("room1");
  const area = areas.includes(pick) ? pick : "room1";
  const scene = areaScene(area, level);
  const r: 1 | 2 = area === "room2" ? 2 : 1;
  const roomSlots = useAsync<SceneSlots>(() => sceneSlots(scene), [scene]);
  const canUpgrade = s.unlocked.features.includes("upgrades");
  const unlocked = content.EQUIPMENT.filter((e) => s.unlocked.equipment.includes(e.id));
  const roomPlacements = placementsFor(s, roomSlots?.scene === scene ? roomSlots : null, scene, r);
  // beds & room items first, then the other rooms, waiting chairs last
  const order = (id: string) => ["S02", "S03", "S04", "S05", "S01"].indexOf(equipmentDef(id)?.scene ?? "S01");
  const owned = [...s.equipment].sort((a, b) => order(a.id) - order(b.id) || Number(!equipmentDef(a.id)?.effect.beds) - Number(!equipmentDef(b.id)?.effect.beds) || slotNo(a.slot) - slotNo(b.slot));
  const tabbed = areas.length > 1;
  const shown = tabbed ? owned.filter((e) => (areas.includes(areaOfItem(e)) ? areaOfItem(e) : "room1") === area) : owned;
  const title = area === "room1" ? (level >= 2 ? "Phòng trị liệu 1" : "Phòng trị liệu") : area === "room2" ? "Phòng trị liệu 2" : areaLabel[area];
  const front = level >= 1 || area === "wash" || area === "foot" || roomPlacements.some((p) => roomSlots?.slots.find((x) => x.id === p.slot)?.layer === "slots-front");
  return (
    <>
      <Section title={title}>
        {tabbed && <AreaTabs areas={areas} area={area} setArea={setArea} />}
        <SceneView scene={scene} placements={roomPlacements} actors={[]} decor={area === "room1" ? decorFor(s, "room1") : undefined}
          class={`room-scene card area-${area}${r === 2 ? " room-2" : ""}${front ? " front-row" : ""}`} />
      </Section>
      <Section title="Đồ đang có" right={tabbed ? <span class="muted small">{area === "room1" ? "Phòng 1 + đồ chung" : areaLabel[area]}</span> : undefined}>
        {shown.length === 0 && <Empty>Chưa có đồ dùng.</Empty>}
        <div class="list">
          {shown.map((e) => {
            const d = equipmentDef(e.id);
            if (!d) return null;
            const st = durabilityState(e);
            const max = api.maxUsesOf(e);
            const p = Math.round((e.usesLeft / max) * 100);
            const cost = api.repairCost(e);
            const up = api.upgradeCost(e);
            const tier = api.tierOf(e);
            const tiered = api.hasTiers(e.id);
            const inUse = s.today.inService.some((x) => x.bedSlot === e.uid);
            return (
              <div class="card equip-card" key={e.uid}>
                <div class="row-card">
                  <EquipIcon art={artOf(e)} size={60} />
                  <div class="grow">
                    <b>{d.name}{d.effect.beds && e.slot ? ` ${slotNo(e.slot)}` : ""}</b>
                    {tiered && <div class="tier-line"><TierStars tier={tier} /> <span class="small">{api.tierName(tier)}</span>{level >= 2 && d.effect.beds ? <span class="muted small"> · Phòng {roomOf(e)}</span> : null}</div>}
                    <div class="dur"><Bar value={e.usesLeft} max={max} /><span class="small">{p}%</span></div>
                    <div class="chips">
                      {st === "broken" && <Chip tone="danger">Hỏng</Chip>}
                      {st === "warn" && <Chip tone="amber">Sắp hỏng</Chip>}
                      <span class="muted small">{e.usesLeft}/{max} lần</span>
                    </div>
                  </div>
                  {p < 100 && !tiered && (
                    <Btn small kind={st === "ok" ? "secondary" : "primary"} disabled={s.money < cost} onClick={() => dispatch((g) => api.repairEquipment(g, e.uid)) && toast(`Đã sửa ${d.name}`, "ok")}>
                      <Wrench size={16} /> {vnd(cost)}
                    </Btn>
                  )}
                </div>
                {p < 100 && tiered && (
                  <div class="upgrade-row repair-row">
                    <div class="grow small"><b>Sửa về 100%</b><div class="muted tiny">30% giá trị cấp {api.tierName(tier)} ({vnd(api.tierValue(e))})</div></div>
                    <Btn small kind={st === "ok" ? "secondary" : "primary"} disabled={s.money < cost} onClick={() => dispatch((g) => api.repairEquipment(g, e.uid)) && toast(`Đã sửa ${d.name}`, "ok")}>
                      <Wrench size={16} /> {vnd(cost)}
                    </Btn>
                  </div>
                )}
                {tiered && up !== undefined && canUpgrade && (
                  <div class="upgrade-row">
                    <span class="upgrade-art" title={`Hình cấp ${api.tierName(tier + 1)}`}><EquipIcon art={equipmentArt(d.art, tier + 1)} size={44} /></span>
                    <div class="grow small">
                      <b>Nâng lên {api.tierName(tier + 1)}</b> <TierStars tier={tier + 1} />
                      <div class="muted tiny">{upgradePreview(e)}</div>
                    </div>
                    <Btn small disabled={s.money < up || inUse} onClick={() => confirm(`Nâng ${d.name} lên cấp ${api.tierName(tier + 1)} với giá ${vnd(up)}?`) && dispatch((g) => api.upgradeEquipment(g, e.uid)) && toast(`${d.name}: cấp ${api.tierName(tier + 1)}!`, "ok")}>
                      <ArrowUpCircle size={16} /> {vnd(up)}
                    </Btn>
                  </div>
                )}
                {tiered && up === undefined && p >= 100 && <div class="upgrade-row muted tiny">Cấp cao nhất · sửa chữa {pct(content.CONFIG.repairPctOfPrice)} giá trị {vnd(api.tierValue(e))}</div>}
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="Mua thêm">
        {!s.unlocked.features.includes("buy-equipment") && unlocked.length === 0 && <Empty><Lock size={14} /> Mở khóa sau.</Empty>}
        <div class="list">
          {unlocked.map((d) => {
            const slots = api.slotsFor(d.id, level);
            const taken = new Set(s.equipment.map((e) => e.slot).filter(Boolean));
            const has = s.equipment.some((e) => e.id === d.id);
            const noRoom = slots.length > 0 && slots.every((x) => taken.has(x));
            const moreLevels = level < api.maxShopLevel() && s.unlocked.features.includes("expansion");
            return (
              <div class="card row-card" key={d.id}>
                <EquipIcon art={d.art} size={60} />
                <div class="grow">
                  <b>{d.name}</b>
                  <div class="muted small">{d.description}</div>
                  <div class="muted small">Độ bền {d.maxUses} lần{d.electricityPerUse ? ` · điện ${vnd(d.electricityPerUse)}/lần` : ""}{d.dailyElectricity ? ` · điện ${vnd(d.dailyElectricity)}/ngày` : ""}</div>
                </div>
                <div class="col-actions">
                  <Btn small disabled={s.money < d.price || noRoom} onClick={() => dispatch((g) => api.buyEquipment(g, d.id)) && toast(`Đã mua ${d.name}`, "ok")}>
                    {vnd(d.price)}
                  </Btn>
                  {noRoom && <span class="muted tiny">{has && slots.length === 1 ? "Đã có" : moreLevels ? "Hết chỗ – nâng cấp mặt bằng" : "Hết chỗ đặt"}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

const slotNo = (slot?: string) => Number(/(\d+)$/.exec(slot ?? "")?.[1] ?? 0);

function Prices({ s }: { s: GameState }) {
  const [lo, hi] = content.CONFIG.priceRange;
  const steps: number[] = [];
  for (let m = lo; m <= hi + 1e-9; m += 0.05) steps.push(Math.round(m * 100) / 100);
  return (
    <div class="list">
      <p class="muted small">Giá cao thì ít khách hơn và dễ bị chê đắt. Giá thấp thì đông khách nhưng lãi mỏng.</p>
      {s.unlocked.services.map((id) => {
        const d = serviceDef(id);
        if (!d) return null;
        const m = s.priceMultiplier[id] ?? 1;
        return (
          <div class="card" key={id}>
            <div class="row-between"><b>{d.name}</b><b>{vnd(Math.round(d.basePrice * m))}</b></div>
            <input type="range" class="range" min={lo} max={hi} step={0.05} value={m}
              onChange={(e) => dispatch((g) => api.setPriceMultiplier(g, id, Number((e.target as HTMLInputElement).value)))} />
            <div class="row-between muted small"><span>−{Math.round((1 - lo) * 100)}%</span><span>{m === 1 ? "Giá gốc" : `${m > 1 ? "+" : "−"}${Math.round(Math.abs(m - 1) * 100)}%`}</span><span>+{Math.round((hi - 1) * 100)}%</span></div>
          </div>
        );
      })}
    </div>
  );
}

function More({ s }: { s: GameState }) {
  const f = s.unlocked.features;
  const C = content.CONFIG;
  return (
    <>
      {f.includes("expansion") && <Expansion s={s} />}
      {f.includes("ads") && (
        <Section title={<><Megaphone size={18} /> Quảng cáo</>}>
          <div class="card">
            <p>Thêm khách trong vài ngày tới. {s.adsDaysLeft > 0 && <b>Còn {s.adsDaysLeft} ngày.</b>}</p>
            <div class="row-gap">
              {[1, 3, 7].map((d) => (
                <Btn key={d} small kind="secondary" disabled={s.money < d * C.adsCostPerDay} onClick={() => dispatch((g) => api.buyAds(g, d))}>{d} ngày · {vnd(d * C.adsCostPerDay)}</Btn>
              ))}
            </div>
          </div>
        </Section>
      )}
      {f.includes("combo") && <Combos s={s} />}
    </>
  );
}

/** GAME_DESIGN §12.1: every shop level with cost, rent, beds, chairs, premium; the next one can be bought. */
function Expansion({ s }: { s: GameState }) {
  const level = s.shopLevel ?? 0;
  const levels = content.CONFIG.shopLevels;
  const nx = query(() => api.nextShopLevel(s), undefined);
  const next = nx ? levels[nx.level] : undefined;
  const cur = levels[level];
  return (
    <Section title={<><Expand size={18} /> Mặt bằng</>} right={<span class="muted small">Đang ở cấp {level}</span>}>
      <div class="card levels">
        <p class="small">Mỗi cấp có thêm chỗ đặt giường, <b>tặng 2 ghế chờ</b>, thêm khách và khách sang hơn – nhưng <b>tiền thuê cao hơn</b>. Giường mua riêng ở mục Đồ dùng.</p>
        <div class="level-list">
          {levels.map((L) => {
            const state = L.level < level ? "done" : L.level === level ? "now" : L.level === nx?.level ? "next" : "later";
            const extraCust = L.customers[1] > 0 ? `+${L.customers[0]}–${L.customers[1]} khách/ngày` : "khách thường";
            return (
              <div class={`level-row lv-${state}`} key={L.level}>
                <div class="lv-head">
                  <span class="lv-no">{L.level}</span>
                  <b class="grow">{L.name}</b>
                  {state === "now" ? <Chip tone="sage" icon={<Check size={13} />}>Đang dùng</Chip> : state === "done" ? <Chip icon={<Check size={13} />}>Đã có</Chip> : L.level > 0 && !s.freeMode && s.chapter < L.unlockChapter ? <Chip icon={<Lock size={13} />}>Chương {L.unlockChapter}</Chip> : null}
                </div>
                <div class="lv-grid small">
                  <span>{L.cost ? vnd(L.cost) : "có sẵn"}</span>
                  <span>Thuê {vnd(L.rent)}/tuần</span>
                  <span><BedDouble size={13} /> {L.maxBeds} giường{L.maxBeds > 4 ? " (2 phòng)" : ""}</span>
                  <span><Sofa size={13} /> {L.chairSlots} ghế chờ{L.freeChairs ? ` (tặng ${L.freeChairs})` : ""}</span>
                  <span>{extraCust}</span>
                  <span>{L.pricePct ? `Giá +${pct(L.pricePct)}` : "Giá gốc"}</span>
                </div>
              </div>
            );
          })}
        </div>
        {next && nx && (
          nx.ok ? (
            <Btn block disabled={s.money < next.cost} onClick={() => confirm(`Lên cấp ${next.level} – ${next.name}? Tiền thuê tăng từ ${vnd(cur.rent)} lên ${vnd(next.rent)}/tuần.`) && dispatch((g) => api.buyExpansion(g)) && toast(`Đã lên cấp ${next.level}! Tặng ${next.freeChairs} ghế chờ.`, "ok")}>
              Lên cấp {next.level} · {vnd(next.cost)}
            </Btn>
          ) : <p class="muted small center">Cấp {nx.level}: {nx.reason}</p>
        )}
        {!nx && <p class="muted small center">Tiệm đã ở cấp cao nhất.</p>}
      </div>
    </Section>
  );
}

function Combos({ s }: { s: GameState }) {
  const [sel, setSel] = useState<ServiceId[]>([]);
  const [name, setName] = useState("");
  const [pct, setPct] = useState(90);
  const cc = content.CONFIG.combo;
  const list = (ids: ServiceId[]) => ids.reduce((a, id) => a + (serviceDef(id)?.basePrice ?? 0), 0);
  const mins = (ids: ServiceId[]) => Math.max(5, Math.round((ids.reduce((a, id) => a + (serviceDef(id)?.durationMin ?? 30), 0) * cc.durationPct) / 5) * 5);
  const sum = list(sel);
  const minP = Math.ceil((sum * cc.minPricePct) / 1000) * 1000;
  const p = Math.min(sum, Math.max(minP, Math.round((sum * pct) / 100 / 1000) * 1000));
  return (
    <Section title={<><Tag size={18} /> Gói combo</>}>
      {s.combos.map((c) => {
        const l = list(c.services);
        return (
          <div class="card" key={c.id}>
            <b>{c.name}</b> · {vnd(c.price)} {l > c.price && <Chip tone="sage">giảm {Math.round((1 - c.price / l) * 100)}%</Chip>}
            <div class="muted small">{c.services.map(serviceName).join(" + ")} · {mins(c.services)} phút</div>
          </div>
        );
      })}
      <div class="card">
        <p class="muted small">Chọn 2–3 dịch vụ:</p>
        <div class="chips">
          {s.unlocked.services.map((id) => (
            <button key={id} class={`chip chip-toggle${sel.includes(id) ? " on" : ""}`} onClick={() => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : sel.length < 3 ? [...sel, id] : sel)}>{serviceName(id)}</button>
          ))}
        </div>
        <input class="input" placeholder="Tên gói" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
        {sum > 0 && (
          <>
            <div class="row-between"><span>Giá gói: <b>{vnd(p)}</b></span><span class="muted small">giá lẻ {vnd(sum)}</span></div>
            <input class="range" type="range" min={Math.round(cc.minPricePct * 100)} max={Math.round(cc.maxPricePct * 100)} step={5} value={pct} onInput={(e) => setPct(Number((e.target as HTMLInputElement).value))} />
            <p class="muted small">{pct < 100 ? `Giảm ${100 - pct}%: gói càng rẻ càng nhiều khách gọi.` : "Không giảm giá: ít khách gọi gói."} Một ca mất {mins(sel)} phút (90% tổng thời gian).</p>
          </>
        )}
        <Btn block disabled={sel.length < 2 || !name.trim() || p <= 0} onClick={() => { if (dispatch((g) => api.createCombo(g, name.trim(), sel, p))) { setSel([]); setName(""); setPct(90); } }}><Plus size={18} /> Tạo gói</Btn>
      </div>
    </Section>
  );
}
