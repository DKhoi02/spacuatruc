import type { EquipmentDef, EquipmentId, GameState, OwnedEquipment, ServiceDef } from "./types";
import { C, equipmentDef } from "./content";
import { activeEventEffect } from "./events";
import type { ShopLevelDef } from "@/data";

const BED_IDS: EquipmentId[] = ["E01", "E01-upgraded"];
const STATION_IDS: EquipmentId[] = ["E01", "E01-upgraded", "E06", "E10", "vip-room"];


/** Definition of a shop level (clamped to the defined range). */
export function shopLevelDef(level: number): ShopLevelDef {
  const L = C().CONFIG.shopLevels;
  return L[Math.max(0, Math.min(L.length - 1, Math.floor(level || 0)))];
}
export const maxShopLevel = (): number => C().CONFIG.shopLevels.length - 1;

const range = (prefix: string, from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => `${prefix}${from + i}`);

/** Treatment room of a bed slot: bed-1..4 → room 1, bed-5..8 → room 2 (GAME_DESIGN §12.1, levels 2–3). */
export function roomOfSlot(slot: string | undefined): 1 | 2 {
  const m = /^bed-(\d+)$/.exec(slot ?? "");
  return m && Number(m[1]) > 4 ? 2 : 1;
}

/** Scene slots each equipment can be placed in at a shop level (from art/shop/*.slots.json; room 2 reuses S02's bed slots). */
export function slotsFor(id: EquipmentId, level: number): string[] {
  const L = shopLevelDef(level);
  switch (id) {
    case "E01": case "E01-upgraded": return range("bed-", 1, L.maxBeds);
    case "E02": case "chair-extra": return range("chair-", 3, L.chairSlots);
    case "E03": return ["steamer"];
    case "E05": return ["aroma"];
    case "E06": return ["shampoo-chair-1", "shampoo-chair-2"];
    case "E07": return ["shelf-tool"];
    case "E08": return ["water-heater"];
    case "E09": return ["hot-stone"];
    case "E10": return ["footbath-chair-1", "footbath-chair-2", "footbath-chair-3"];
    case "vip-room": return ["vip-1"];
    default: return [];
  }
}

export function isStationId(id: EquipmentId): boolean {
  return STATION_IDS.includes(id) || (equipmentDef(id)?.effect.beds ?? 0) > 0;
}

export function isElectric(def: EquipmentDef | undefined): boolean {
  return !!def && (def.electricityPerUse > 0 || def.dailyElectricity > 0);
}

/** Owned item is usable now (not broken; not electric during a power outage). */
export function usable(s: GameState, e: OwnedEquipment): boolean {
  if (e.usesLeft <= 0) return false;
  if (activeEventEffect(s) === "power-outage" && isElectric(equipmentDef(e.id))) return false;
  return true;
}

/** Which station ids can host this service. */
export function stationIdsFor(svc: ServiceDef): EquipmentId[] {
  const req = svc.requiresEquipment.filter((id) => isStationId(id));
  if (req.length) return req;
  if (svc.room === "S03" && C().EQUIPMENT.some((e) => e.id === "vip-room")) return ["vip-room"];
  return BED_IDS;
}

/** Station ids for a visit of one or more services (combo): the first service needing a special station decides, else beds. */
export function stationIdsForAll(svcs: ServiceDef[]): EquipmentId[] {
  for (const svc of svcs) { const ids = stationIdsFor(svc); if (ids !== BED_IDS) return ids; }
  return BED_IDS;
}

export function stationsFor(s: GameState, svc: ServiceDef | ServiceDef[]): OwnedEquipment[] {
  const ids = Array.isArray(svc) ? stationIdsForAll(svc) : stationIdsFor(svc);
  return s.equipment.filter((e) => ids.includes(e.id));
}

/** Non-station equipment required by the service(s) (steamer, water heater...). */
export function requiredTools(svc: ServiceDef | ServiceDef[]): EquipmentId[] {
  const list = Array.isArray(svc) ? svc : [svc];
  return [...new Set(list.flatMap((x) => x.requiresEquipment.filter((id) => !isStationId(id))))];
}

/** Every owned station (beds, shampoo / foot-bath chairs, VIP room). */
export function allStations(s: GameState): OwnedEquipment[] {
  return s.equipment.filter((e) => isStationId(e.id));
}

export function queueSeats(s: GameState): number {
  let n = C().CONFIG.startSeats;
  for (const e of s.equipment) if (e.usesLeft > 0) n += equipmentDef(e.id)?.effect.queueSeats ?? 0;
  return n;
}

// ───────────── tiers (GAME_DESIGN §12.2) ─────────────

const T = () => C().CONFIG.equipmentTiers;
export const tierOf = (e: OwnedEquipment): 1 | 2 | 3 => (e.tier === 2 || e.tier === 3 ? e.tier : 1);
export const hasTiers = (id: EquipmentId): boolean => { const d = equipmentDef(id); return !!d && !d.noTiers; };
export const tierName = (tier: number): string => T().names[Math.max(0, Math.min(2, tier - 1))];

/** Max uses at the item's tier (durability ×1 / ×1,2 / ×1,4). */
export function maxUsesOf(e: OwnedEquipment): number {
  const d = equipmentDef(e.id);
  if (!d) return 1;
  return Math.round(d.maxUses * T().durability[tierOf(e) - 1]);
}

/** Value of the item at its tier: base price + every upgrade paid. Repair and depreciation are based on it. */
export function tierValue(e: OwnedEquipment): number {
  const d = equipmentDef(e.id);
  if (!d) return 0;
  let v = d.price;
  for (let t = 2; t <= tierOf(e); t++) v += upgradeCostTo(d.upgradePrice ?? d.price, t);
  return v;
}

const upgradeCostTo = (price: number, tier: number) => Math.round((price * T().upgradePct[tier - 1]) / 1000) * 1000;

/** Cost of the next upgrade (undefined: top tier or no tiers). */
export function upgradeCost(e: OwnedEquipment): number | undefined {
  const d = equipmentDef(e.id);
  if (!d || d.noTiers || tierOf(e) >= 3) return undefined;
  return upgradeCostTo(d.upgradePrice ?? d.price, tierOf(e) + 1);
}

/** Price premium / tip bonus / complaint delta / patience bonus of an item at its tier. */
export const tierPricePct = (e: OwnedEquipment | undefined): number => (e ? T().pricePct[tierOf(e) - 1] : 0);
export const tierTipPct = (e: OwnedEquipment | undefined): number => (e ? T().tipPct[tierOf(e) - 1] : 0);
export const tierComplaint = (e: OwnedEquipment | undefined): number => (e ? T().complaint[tierOf(e) - 1] : 0);
export const tierElectricity = (e: OwnedEquipment): number => T().electricity[tierOf(e) - 1];

/** Extra waiting patience (minutes) from upgraded waiting chairs: the best chair counts (seats are shared). */
export function chairPatienceBonus(s: GameState): number {
  let best = 0;
  for (const e of s.equipment) if (e.usesLeft > 0 && (equipmentDef(e.id)?.effect.queueSeats ?? 0) > 0) best = Math.max(best, T().patienceMin[tierOf(e) - 1]);
  return best;
}

/** The owned item of a required tool the service would use (highest tier first). */
export function toolFor(s: GameState, id: EquipmentId): OwnedEquipment | undefined {
  return s.equipment.filter((x) => x.id === id).sort((a, b) => tierOf(b) - tierOf(a) || b.usesLeft - a.usesLeft)[0];
}

export function durabilityPct(e: OwnedEquipment): number {
  const max = maxUsesOf(e);
  return max > 0 ? e.usesLeft / max : 1;
}

/** Use an equipment once: durability −1, depreciation (P&L only), per-use electricity. Mutates. */
export function useEquipment(s: GameState, uid: string): void {
  const e = s.equipment.find((x) => x.uid === uid);
  if (!e) return;
  const def = equipmentDef(e.id);
  e.usesLeft = Math.max(0, e.usesLeft - 1);
  if (def && def.maxUses > 0) s.today.ledger.depreciation += Math.round(tierValue(e) / maxUsesOf(e));
  if (def) s.today.ledger.electricity += Math.round(def.electricityPerUse * tierElectricity(e));
}

/** Sum of effect values over owned, usable equipment (optionally only in a scene). */
export function effectSum(s: GameState, key: "tipBonusPct" | "complaintChanceDelta", filter?: (e: OwnedEquipment, d: EquipmentDef) => boolean): number {
  let sum = 0;
  for (const e of s.equipment) {
    const d = equipmentDef(e.id);
    if (!d || e.usesLeft <= 0) continue;
    if (filter && !filter(e, d)) continue;
    sum += d.effect[key] ?? 0;
  }
  return sum;
}

export function newUid(s: GameState, prefix: string): string {
  let i = s.equipment.length + s.staff.length + 1;
  const used = new Set([...s.equipment.map((e) => e.uid), ...s.staff.map((x) => x.uid)]);
  while (used.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}
