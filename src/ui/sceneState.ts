/** Maps GameState → scene placements/actors. */
import type { GameState, OwnedEquipment, SupplyId } from "@/core/types";
import { equipmentArt, type SceneSlots } from "@/ui/art/assets";
import type { SceneActor, SceneDecor, ScenePlacement } from "./components/Scene";
import { api } from "./api";
import { content, equipmentDef } from "./content";

export function durabilityState(e: OwnedEquipment): "ok" | "warn" | "broken" {
  const d = equipmentDef(e.id);
  if (!d) return "ok";
  if (e.usesLeft <= 0) return "broken";
  return e.usesLeft / api.maxUsesOf(e) < (content.CONFIG.lowDurabilityPct ?? 0.2) ? "warn" : "ok";
}

/** Art of an owned item at its tier: `<art>-t2/-t3` when drawn, a tier ≥2 bed falls back to the cushioned bed (GAME_DESIGN §12.2). */
export function artOf(e: OwnedEquipment): string {
  return equipmentArt(baseArtOf(e), e.tier ?? 1);
}
const baseArtOf = (e: OwnedEquipment): string => equipmentDef(e.id)?.art ?? e.id;

/** Treatment room (1 or 2) an S02 item is in: beds by slot (bed-5..8 → room 2), other room items in room 1. */
export const roomOf = (e: OwnedEquipment): 1 | 2 => api.roomOfSlot(e.slot);

const clampLevel = (level: number | undefined) => Math.max(0, Math.min(3, Math.floor(level ?? 0)));
/** Lobby art per shop level (GAME_DESIGN §12.1): L0 S01 · L1 S01-expanded · L2 S01-L2 · L3 S01-L3. */
export const lobbyScene = (level: number | undefined): string => ["S01", "S01-expanded", "S01-L2", "S01-L3"][clampLevel(level)];
/** Treatment room art per shop level: room 1 S02 / S02-L1 / S02-L2 / S02-L3; room 2 (levels 2–3) S06 / S06-L3. */
export function roomScene(level: number | undefined, room: 1 | 2 = 1): string {
  const L = clampLevel(level);
  if (room === 2) return L >= 3 ? "S06-L3" : "S06";
  return ["S02", "S02-L1", "S02-L2", "S02-L3"][L];
}
/** Wash area (Khu gội đầu) per shop level: L0–1 S04 · L2 S04-L2 · L3 S04-L3 (same slots). */
export const washScene = (level: number | undefined): string => ["S04", "S04", "S04-L2", "S04-L3"][clampLevel(level)];
/** Foot area (Khu ngâm chân) per shop level: L0–1 S05 · L2 S05-L2 · L3 S05-L3 (same slots). */
export const footScene = (level: number | undefined): string => ["S05", "S05", "S05-L2", "S05-L3"][clampLevel(level)];

/** Rooms shown as tabs in the shop / station views. */
export type Area = "room1" | "room2" | "wash" | "foot";
export const areaLabel: Record<Area, string> = { room1: "Phòng 1", room2: "Phòng 2", wash: "Khu gội đầu", foot: "Khu ngâm chân" };
const hasArea = (s: GameState, equip: string, room: string) =>
  s.equipment.some((e) => e.id === equip) || s.unlocked.services.some((id) => content.SERVICES.find((x) => x.id === id)?.room === room);
/** Tabs available: Phòng 1 always, Phòng 2 from shop level 2, the wash / foot areas once the shop owns their chairs or their services are unlocked. */
/** Areas shown as tabs. `stationsOnly` (Home station list): hide room 2 until it has a bed (bed-5..8). */
export function areasOf(s: GameState, opts: { stationsOnly?: boolean } = {}): Area[] {
  const out: Area[] = ["room1"];
  const room2HasBed = s.equipment.some((e) => /^bed-[5-8]$/.test(e.slot ?? ""));
  if ((s.shopLevel ?? 0) >= 2 && (!opts.stationsOnly || room2HasBed)) out.push("room2");
  if (hasArea(s, "E06", "S04")) out.push("wash");
  if (hasArea(s, "E10", "S05")) out.push("foot");
  return out;
}
export function areaScene(area: Area, level: number | undefined): string {
  return area === "wash" ? washScene(level) : area === "foot" ? footScene(level) : roomScene(level, area === "room2" ? 2 : 1);
}
/** Equipment-definition scene a scene variant belongs to (S01-L2 → S01, S02-L3 / S06 → S02, S04-L3 → S04). */
const sceneFamily = (scene: string): string => scene.startsWith("S01") ? "S01" : /^S0[26](-|$)/.test(scene) ? "S02" : scene.replace(/-.*$/, "");
/** Items of another scene also drawn in a scene that has a slot for them (the aroma lamp scents the foot area too). */
const SHARED: Record<string, string[]> = { S05: ["E05"] };

/** Supplies shown on a scene's shelf slots, in slot order (GAME_DESIGN: shelves show stock). Room 2 (S06*) has painted shelves. */
const SHELF_SUPPLIES: Record<string, SupplyId[]> = {
  S02: ["I01", "I02", "I03", "I04", "I05", "I06"],
  S04: ["I07", "I08", "I01"],
  S05: ["I01", "I02", "I03"],
};
/** Amount one service uses at most (over unlocked services), min 1. */
function perService(s: GameState, id: SupplyId): number {
  let n = 0;
  for (const sid of s.unlocked.services) n = Math.max(n, content.SERVICES.find((x) => x.id === sid)?.supplies[id] ?? 0);
  return Math.max(1, n);
}
/** Shelf look of a supply: 0 → empty spot, ≤2 services' worth → 1 item + low badge, ≤6 → 2 items, more → full (3). */
export function shelfStock(s: GameState, id: SupplyId): { stock: 0 | 1 | 2 | 3; low: boolean } {
  const have = s.inventory[id] ?? 0;
  if (have <= 0) return { stock: 0, low: false };
  const per = perService(s, id);
  if (have <= per * 2) return { stock: 1, low: true };
  return { stock: have <= per * 6 ? 2 : 3, low: false };
}
export function shelfPlacements(s: GameState, slots: SceneSlots, scene: string, room: 1 | 2 = sceneRoom(scene)): ScenePlacement[] {
  const fam = sceneFamily(scene);
  if (fam === "S02" && room === 2) return [];
  const list = (SHELF_SUPPLIES[fam] ?? []).filter((id) => s.unlocked.supplies.includes(id));
  const shelves = slots.slots.filter((x) => x.kind === "supply");
  const out: ScenePlacement[] = [];
  list.forEach((id, i) => {
    const sl = shelves[i];
    if (!sl) return;
    const { stock, low } = shelfStock(s, id);
    if (stock > 0) out.push({ slot: sl.id, art: id, item: true, stock, low });
  });
  return out;
}
const sceneRoom = (scene: string): 1 | 2 => scene.startsWith("S06") ? 2 : 1;

/**
 * Equipment placed in a scene: explicit `slot`, else first free slot accepting its art. Room-2 scenes (S06*) have their
 * own bed-5..8 slots; a room-1 scene shown for `room` 2 (no bed-5 slot) draws beds bed-5..8 in bed-1..4.
 */
export function placementsFor(s: GameState, slots: SceneSlots | null, scene: string, room: 1 | 2 = sceneRoom(scene)): ScenePlacement[] {
  const out: ScenePlacement[] = [];
  if (!slots) return out;
  const used = new Set<string>();
  const family = sceneFamily(scene);
  const remap = room === 2 && !slots.slots.some((x) => x.id === "bed-5");
  const shared = SHARED[family] ?? [];
  const inScene = s.equipment.filter((e) => {
    const d = equipmentDef(e.id);
    if (d && shared.includes(e.id)) return true;
    return d && d.scene === family && (family !== "S02" || roomOf(e) === room);
  }).map((e) => {
    const m = remap && /^bed-(\d+)$/.exec(e.slot ?? "");
    return m ? { ...e, slot: `bed-${Number(m[1]) - 4}` } : e;
  });
  const placed = new Set<string>();
  // Starting waiting chairs are not owned items (CONFIG.startSeats): draw them in the default chair slots.
  if (family === "S01") {
    const n = content.CONFIG.startSeats ?? 2;
    for (const sl of slots.slots.filter((x) => x.default === "E02").slice(0, n)) {
      used.add(sl.id);
      out.push({ slot: sl.id, art: "E02", state: "ok" });
    }
  }
  for (const e of inScene) {
    if (e.slot && !used.has(e.slot) && slots.slots.some((x) => x.id === e.slot && (x.accepts.includes(baseArtOf(e)) || x.accepts.includes(e.id)))) {
      used.add(e.slot);
      placed.add(e.uid);
      out.push({ slot: e.slot, art: artOf(e), state: durabilityState(e), tier: e.tier ?? 1 });
    }
  }
  for (const e of inScene) {
    if (placed.has(e.uid)) continue;
    // items with an explicit slot that this scene doesn't have are not drawn
    if (e.slot && /^(bed|chair)-/.test(e.slot)) continue;
    const base = baseArtOf(e);
    const free = slots.slots.find((x) => !used.has(x.id) && (x.accepts.includes(base) || x.accepts.includes(e.id)));
    if (!free) continue;
    used.add(free.id);
    out.push({ slot: free.id, art: artOf(e), state: durabilityState(e), tier: e.tier ?? 1 });
  }
  return [...out, ...shelfPlacements(s, slots, scene, room)];
}

export function lobbyActors(s: GameState, placements: ScenePlacement[]): SceneActor[] {
  const actors: SceneActor[] = [];
  const chairs = placements.filter((p) => /^chair-/.test(p.slot)).map((p) => p.slot).sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  s.today.queue.forEach((c, i) => {
    if (s.today.inService.some((x) => x.customerId === c.id)) return;
    if (i < chairs.length) actors.push({ characterId: c.characterId, expr: c.patience <= 10 ? "annoyed" : "neutral", at: { slot: chairs[i] }, size: 150 });
  });
  const rec = s.staff.find((x) => x.role === "receptionist" && !x.sickToday);
  if (rec) actors.push({ characterId: rec.characterId, at: { anchor: "receptionist" }, size: 210 });
  return actors;
}

export function freeSlotFor(s: GameState, slots: SceneSlots | null, art: string, id: string): string | undefined {
  if (!slots) return undefined;
  const taken = new Set(placementsFor(s, slots, slots.scene).map((p) => p.slot));
  return slots.slots.find((x) => !taken.has(x.id) && (x.accepts.includes(art) || x.accepts.includes(id)))?.id;
}

/** Decorations placed in an area (lobby = Sảnh, room1 = Phòng 1). */
export function decorFor(s: GameState, area: "lobby" | "room1"): SceneDecor[] {
  return (s.decor?.placed ?? []).filter((p) => p.area === area).map((p) => ({ uid: p.uid, id: p.id, x: p.x, y: p.y, ...(p.flip ? { flip: true } : {}) }));
}
