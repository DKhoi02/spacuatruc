import type { Customer, EquipmentId, GameState, OwnedEquipment, ServiceDef, ServiceId, SupplyId } from "./types";
import { C, equipmentDef, serviceDef, supplyDef } from "./content";
import { hasFeature } from "./chapters";
import { activeEventEffect } from "./events";
import { clone, clamp, roundK, round2, vErr } from "./util";
import { hasTiers, isStationId, maxShopLevel, maxUsesOf, newUid, requiredTools, shopLevelDef, slotsFor, tierName, tierOf, tierPricePct, tierTipPct, tierValue, toolFor, upgradeCost } from "./equipment";

import type { Bill } from "./types";
import { decorTipPct } from "./decor";
export type { Bill };

const TIP_PCT: Record<1 | 2 | 3, number> = { 1: 0, 2: 0.05, 3: 0.1 };

export function computeBill(s: GameState, customer: Customer, svc: ServiceDef, stars: 1 | 2 | 3, score: number, opts: { patienceLeft?: number; stationUid?: string }): Bill {
  const cfg = C().CONFIG;
  // Combo: the combo price replaces the list price (no per-service price multiplier).
  const combo = customer.combo;
  const listPrice = combo ? combo.price : svc.basePrice;
  const mult = combo ? 1 : s.priceMultiplier[svc.id] ?? 1;
  const vip = customer.special === "vip" ? 1.5 : 1;
  const starMultiplier = cfg.starMultiplier[stars];
  // GAME_DESIGN §12: upgraded station (bed/chair) + the service's main tool raise the price; so does the shop level.
  const p = billPremium(s, customer, svc, opts.stationUid);
  const price = roundK(listPrice * mult * vip * starMultiplier * (1 + p.equip + p.shop));
  let tip = price * TIP_PCT[stars] * clamp(1 + (s.reputation - 3) * 0.1, 0.5, 1.2);
  if (opts.patienceLeft !== undefined) tip *= clamp(opts.patienceLeft, 0, 1);
  // Equipment comfort bonus: the station used + non-station items in the service's scene (+ tier tip bonus of
  // the station, the main tool and those scene items).
  let bonusPct = p.tip;
  const room = svc.room;
  for (const e of s.equipment) {
    const d = equipmentDef(e.id);
    if (!d || e.usesLeft <= 0 || !d.effect.tipBonusPct) continue;
    const isStation = isStationId(e.id);
    if ((isStation && e.uid === opts.stationUid) || (!isStation && (d.scene === room || (room === "S03" && d.scene === "S02")))) {
      bonusPct += d.effect.tipBonusPct / 100;
      if (!isStation) bonusPct += tierTipPct(e);
    }
  }
  bonusPct += decorTipPct(s, room); // decorations in treatment room 1
  tip += price * bonusPct;
  tip = roundK(tip);
  return {
    serviceName: combo ? combo.name : svc.name, basePrice: listPrice, starMultiplier, price, tip, discount: 0, total: price + tip, stars, score,
    ...(p.equip > 0 ? { equipPremiumPct: round2(p.equip) } : {}), ...(p.shop > 0 ? { shopPremiumPct: round2(p.shop) } : {}),
  };
}

/** Price premiums of a visit: station tier + best main tool tier (fractions), shop level, tier tip bonus (station + tool). */
export function billPremium(s: GameState, customer: Customer, svc: ServiceDef, stationUid?: string): { equip: number; shop: number; tip: number } {
  const station = s.equipment.find((e) => e.uid === stationUid);
  const svcs = customer.combo ? customerServices(customer) : [svc];
  let tool: OwnedEquipment | undefined;
  for (const id of requiredTools(svcs)) {
    const e = toolFor(s, id);
    if (e && (!tool || tierPricePct(e) > tierPricePct(tool))) tool = e;
  }
  return { equip: tierPricePct(station) + tierPricePct(tool), shop: shopLevelDef(s.shopLevel ?? 0).pricePct, tip: tierTipPct(station) + tierTipPct(tool) };
}

/** Units of each supply the service consumes now (cleaner saves towels). */
export function suppliesNeeded(s: GameState, svc: ServiceDef): Partial<Record<SupplyId, number>> {
  const cleaner = s.staff.some((x) => x.role === "cleaner" && !x.sickToday);
  const out: Partial<Record<SupplyId, number>> = {};
  for (const [id, n] of Object.entries(svc.supplies) as [SupplyId, number][]) {
    if (!n) continue;
    out[id] = id === "I01" && cleaner ? Math.max(1, Math.floor(n * 0.7)) : n;
  }
  return out;
}

/** Services a customer's visit consists of (one, or every service of the combo). */
export function customerServices(c: Customer): ServiceDef[] {
  const ids = c.combo ? c.combo.services : [c.serviceId];
  return ids.map((id) => serviceDef(id)).filter((x): x is ServiceDef => !!x);
}

/** Supplies a customer's visit uses (combo: sum over its services). */
export function suppliesForCustomer(s: GameState, c: Customer): Partial<Record<SupplyId, number>> {
  const out: Partial<Record<SupplyId, number>> = {};
  for (const svc of customerServices(c)) for (const [id, n] of Object.entries(suppliesNeeded(s, svc)) as [SupplyId, number][]) out[id] = (out[id] ?? 0) + n;
  return out;
}

export function missingSupply(s: GameState, need: ServiceDef | Customer): SupplyId | undefined {
  const map = "basePrice" in need ? suppliesNeeded(s, need) : suppliesForCustomer(s, need);
  for (const [id, n] of Object.entries(map) as [SupplyId, number][]) if ((s.inventory[id] ?? 0) < n) return id;
  return undefined;
}

/** Consume supplies (mutates); P&L cost of used supplies goes into ledger.supplies. */
export function consumeSupplies(s: GameState, need: ServiceDef | Customer): void {
  const map = "basePrice" in need ? suppliesNeeded(s, need) : suppliesForCustomer(s, need);
  for (const [id, n] of Object.entries(map) as [SupplyId, number][]) {
    s.inventory[id] = Math.max(0, (s.inventory[id] ?? 0) - n);
    const d = supplyDef(id);
    if (d && d.packSize > 0) s.today.ledger.supplies += Math.round((d.packPrice / d.packSize) * n);
  }
}

function needMoney(s: GameState, cost: number) {
  if (cost > 0 && s.money < cost) throw vErr("Không đủ tiền.");
}

export function buySupply(s0: GameState, id: SupplyId, packs: number): GameState {
  const d = supplyDef(id);
  if (!d) throw vErr("Không tìm thấy vật tư.");
  if (!s0.unlocked.supplies.includes(id)) throw vErr("Vật tư này chưa mở.");
  if (!Number.isInteger(packs) || packs < 1) throw vErr("Số gói không hợp lệ.");
  if (activeEventEffect(s0) === "late-delivery") throw vErr("Hôm nay hàng giao trễ, chưa nhập được vật tư.");
  const cost = d.packPrice * packs;
  needMoney(s0, cost);
  const s = clone(s0);
  s.money -= cost;
  s.inventory[id] = (s.inventory[id] ?? 0) + d.packSize * packs;
  s.today.ledger.purchases += cost;
  return s;
}

export function buyEquipment(s0: GameState, id: EquipmentId, slot?: string): GameState {
  const d = equipmentDef(id);
  if (!d) throw vErr("Không tìm thấy đồ dùng.");
  if (!s0.unlocked.equipment.includes(id)) throw vErr("Đồ dùng này chưa mở.");
  needMoney(s0, d.price);
  const s = clone(s0);
  const slots = slotsFor(id, s.shopLevel);
  let chosen: string | undefined;
  if (slots.length) {
    const taken = new Set(s.equipment.map((e) => e.slot).filter(Boolean));
    if (slot) {
      if (!slots.includes(slot)) throw vErr("Không đặt được ở chỗ này.");
      if (taken.has(slot)) throw vErr("Chỗ này đã có đồ.");
      chosen = slot;
    } else {
      chosen = slots.find((x) => !taken.has(x));
      if (!chosen) throw vErr(s.shopLevel < maxShopLevel() ? "Không còn chỗ đặt. Nâng cấp mặt bằng để có thêm chỗ." : "Không còn chỗ đặt.");
    }
  } else if (s.equipment.some((e) => e.id === id) && id !== "chair-extra") {
    throw vErr("Tiệm đã có đồ này rồi.");
  }
  const e: OwnedEquipment = { uid: newUid(s, "eq"), id, usesLeft: d.maxUses, tier: 1, ...(chosen ? { slot: chosen } : {}) };
  s.equipment.push(e);
  s.money -= d.price;
  s.today.ledger.purchases += d.price;
  return s;
}

/**
 * GAME_DESIGN §12.2: Thường → Tốt → Cao cấp. Cost = upgradePct × base price; durability keeps its % (scaled to the
 * longer tier life). Needs the "upgrades" feature.
 */
export function upgradeEquipment(s0: GameState, uid: string): GameState {
  if (!hasFeature(s0, "upgrades")) throw vErr("Chưa mở chức năng nâng cấp đồ dùng.");
  const e0 = s0.equipment.find((x) => x.uid === uid);
  if (!e0) throw vErr("Không tìm thấy đồ dùng.");
  if (!hasTiers(e0.id)) throw vErr("Đồ này không nâng cấp được.");
  const cost = upgradeCost(e0);
  if (cost === undefined) throw vErr("Đồ này đã ở cấp cao nhất.");
  if (s0.today.inService.some((x) => x.bedSlot === uid)) throw vErr("Đang có khách dùng, nâng cấp sau nhé.");
  needMoney(s0, cost);
  const s = clone(s0);
  const e = s.equipment.find((x) => x.uid === uid)!;
  // An upgrade is better parts, not a repair: the item keeps its wear (same durability %) at the longer tier life.
  const frac = e.usesLeft / Math.max(1, maxUsesOf(e));
  e.tier = (tierOf(e) + 1) as 2 | 3;
  e.usesLeft = Math.round(maxUsesOf(e) * frac);
  s.money -= cost;
  s.today.ledger.purchases += cost;
  return s;
}

export { tierName };

/** GAME_DESIGN §12.2: 30% of the item's current tier value (base + upgrades paid). */
export function repairCost(e: OwnedEquipment): number {
  return roundK(tierValue(e) * C().CONFIG.repairPctOfPrice);
}

export function repairEquipment(s0: GameState, uid: string): GameState {
  const e0 = s0.equipment.find((x) => x.uid === uid);
  if (!e0) throw vErr("Không tìm thấy đồ dùng.");
  const d = equipmentDef(e0.id);
  if (!d) throw vErr("Không tìm thấy đồ dùng.");
  const max = maxUsesOf(e0);
  if (e0.usesLeft >= max) throw vErr("Đồ này còn mới, chưa cần sửa.");
  const cost = repairCost(e0);
  needMoney(s0, cost);
  const s = clone(s0);
  const e = s.equipment.find((x) => x.uid === uid)!;
  e.usesLeft = max;
  s.money -= cost;
  s.today.ledger.repairs += cost;
  return s;
}

export function setPriceMultiplier(s0: GameState, serviceId: ServiceId, mult: number): GameState {
  if (!hasFeature(s0, "pricing")) throw vErr("Chưa mở chức năng chỉnh giá.");
  if (!serviceDef(serviceId)) throw vErr("Không tìm thấy dịch vụ.");
  const [lo, hi] = C().CONFIG.priceRange;
  const s = clone(s0);
  s.priceMultiplier[serviceId] = round2(clamp(mult, lo, hi));
  return s;
}

/** Next shop level the player can buy now, or why not (GAME_DESIGN §12.1). */
export function nextShopLevel(s: GameState): { level: number; ok: true } | { level: number; ok: false; reason: string } | undefined {
  const lv = (s.shopLevel ?? 0) + 1;
  if (lv > maxShopLevel()) return undefined;
  if (!hasFeature(s, "expansion")) return { level: lv, ok: false, reason: "Chưa mở chức năng mở rộng mặt bằng." };
  const d = shopLevelDef(lv);
  if (!s.freeMode && s.chapter < d.unlockChapter) return { level: lv, ok: false, reason: `Mở từ Chương ${d.unlockChapter}.` };
  return { level: lv, ok: true };
}

/** Buys the next shop level: higher rent, more bed/chair slots, free waiting chairs, more (and richer) customers. */
export function buyExpansion(s0: GameState): GameState {
  const nx = nextShopLevel(s0);
  if (!nx) throw vErr("Tiệm đã ở cấp mặt bằng cao nhất.");
  if (!nx.ok) throw vErr(nx.reason);
  const def = shopLevelDef(nx.level);
  needMoney(s0, def.cost);
  const s = clone(s0);
  s.money -= def.cost;
  s.today.ledger.purchases += def.cost;
  s.shopLevel = nx.level;
  s.rent.amount = def.rent;
  // GAME_DESIGN §11.7 / §12.1: every level comes with free waiting chairs (first free chair slots).
  const taken = new Set(s.equipment.map((e) => e.slot).filter(Boolean));
  const free = slotsFor("E02", nx.level).filter((x) => !taken.has(x));
  for (const slot of free.slice(0, def.freeChairs)) {
    s.equipment.push({ uid: newUid(s, "eq"), id: "E02", usesLeft: equipmentDef("E02")?.maxUses ?? 500, tier: 1, slot });
  }
  return s;
}

export function buyAds(s0: GameState, days: number): GameState {
  if (!hasFeature(s0, "ads")) throw vErr("Chưa mở chức năng quảng cáo.");
  if (!Number.isInteger(days) || days < 1) throw vErr("Số ngày không hợp lệ.");
  const cost = C().CONFIG.adsCostPerDay * days;
  needMoney(s0, cost);
  const s = clone(s0);
  s.money -= cost;
  s.today.ledger.other += cost;
  s.adsDaysLeft += days;
  return s;
}

export function createCombo(s0: GameState, name: string, services: ServiceId[], price: number): GameState {
  if (!hasFeature(s0, "combo")) throw vErr("Chưa mở chức năng gói combo.");
  const nm = name.trim();
  if (!nm) throw vErr("Hãy đặt tên cho gói.");
  const uniq = [...new Set(services)];
  if (uniq.length < 2 || uniq.length > 3) throw vErr("Gói combo cần 2–3 dịch vụ.");
  if (uniq.some((id) => !s0.unlocked.services.includes(id))) throw vErr("Có dịch vụ chưa mở.");
  if (!(price > 0)) throw vErr("Giá gói không hợp lệ.");
  const list = uniq.reduce((a, id) => a + (serviceDef(id)?.basePrice ?? 0), 0);
  const { minPricePct, maxPricePct } = C().CONFIG.combo;
  if (price < list * minPricePct - 0.5 || price > list * maxPricePct + 0.5) {
    throw vErr(`Giá gói phải từ ${Math.round(minPricePct * 100)}% đến ${Math.round(maxPricePct * 100)}% tổng giá lẻ (${roundK(list * minPricePct).toLocaleString("vi-VN")}đ – ${roundK(list * maxPricePct).toLocaleString("vi-VN")}đ).`);
  }
  const s = clone(s0);
  let n = s.combos.length + 1;
  while (s.combos.some((c) => c.id === `combo-${n}`)) n++;
  s.combos.push({ id: `combo-${n}`, name: nm, services: uniq, price: Math.round(price) });
  return s;
}
