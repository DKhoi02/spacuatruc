/** Decorations: buy, place freely in the lobby / treatment room 1, ambience score → waiting patience & tips. */
import type { DecorArea, DecorPlacement, DecorState, GameState } from "./types";
import { DECOR, DECOR_CONFIG, type DecorDef } from "@/data/decor";
import { clone, vErr } from "./util";

export const decorDef = (id: string): DecorDef | undefined => DECOR.find((d) => d.id === id);
export const decorOf = (s: GameState): DecorState => s.decor ?? { owned: {}, placed: [] };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Copies of an item not placed anywhere (in storage). */
export function decorInStorage(s: GameState, id: string): number {
  const d = decorOf(s);
  return (d.owned[id] ?? 0) - d.placed.filter((p) => p.id === id).length;
}

export function buyDecor(s0: GameState, id: string): GameState {
  const def = decorDef(id);
  if (!def) throw vErr("Không có món trang trí này.");
  if (s0.money < def.price) throw vErr("Không đủ tiền.");
  const s = clone(s0);
  const d = (s.decor = s.decor ?? { owned: {}, placed: [] });
  s.money -= def.price;
  s.today.ledger.other += def.price;
  d.owned[id] = (d.owned[id] ?? 0) + 1;
  return s;
}

function nextUid(d: DecorState): string {
  let i = d.placed.length + 1;
  const used = new Set(d.placed.map((p) => p.uid));
  while (used.has(`dc${i}`)) i++;
  return `dc${i}`;
}

/** Place a stored copy of `id` (from storage) in an area. Returns the new state and the placement uid. */
export function placeDecor(s0: GameState, id: string, area: DecorArea, x: number, y: number): { state: GameState; uid: string } {
  if (!decorDef(id)) throw vErr("Không có món trang trí này.");
  if (decorInStorage(s0, id) <= 0) throw vErr("Món này đã bày hết, mua thêm để bày tiếp.");
  if (decorOf(s0).placed.filter((p) => p.area === area).length >= DECOR_CONFIG.maxPerArea) throw vErr(`Mỗi khu bày tối đa ${DECOR_CONFIG.maxPerArea} món.`);
  const s = clone(s0);
  const d = (s.decor = s.decor ?? { owned: {}, placed: [] });
  const uid = nextUid(d);
  d.placed.push({ uid, id, area, x: clamp01(x), y: clamp01(y) });
  return { state: s, uid };
}

export function moveDecor(s0: GameState, uid: string, x: number, y: number): GameState {
  const s = clone(s0);
  const p = decorOf(s).placed.find((q) => q.uid === uid);
  if (!p) throw vErr("Không tìm thấy món này.");
  p.x = clamp01(x); p.y = clamp01(y);
  return s;
}

export function flipDecor(s0: GameState, uid: string): GameState {
  const s = clone(s0);
  const p = decorOf(s).placed.find((q) => q.uid === uid);
  if (!p) throw vErr("Không tìm thấy món này.");
  p.flip = !p.flip;
  return s;
}

/** Put a placed item back into storage. */
export function storeDecor(s0: GameState, uid: string): GameState {
  const s = clone(s0);
  if (!s.decor) return s;
  s.decor.placed = s.decor.placed.filter((p) => p.uid !== uid);
  return s;
}

/** Ambience of an area: Σ beauty of distinct items + 1 per extra copy, capped (DECOR_CONFIG.maxScore). */
export function ambience(s: GameState, area: DecorArea): number {
  const seen = new Set<string>();
  let n = 0;
  for (const p of decorOf(s).placed) {
    if (p.area !== area) continue;
    const def = decorDef(p.id);
    if (!def) continue;
    n += seen.has(p.id) ? 1 : def.beauty;
    seen.add(p.id);
  }
  return Math.min(DECOR_CONFIG.maxScore, n);
}

/** Extra waiting patience (game minutes) from the lobby's ambience. */
export const decorPatienceBonus = (s: GameState): number => Math.round(ambience(s, "lobby") * DECOR_CONFIG.lobbyPatiencePerPoint);
/** Extra tip (fraction of price) for services in treatment room 1 (S02 / S03). */
export const decorTipPct = (s: GameState, room: string): number =>
  room === "S02" || room === "S03" ? (ambience(s, "room1") * DECOR_CONFIG.roomTipPctPerPoint) / 100 : 0;

export type { DecorPlacement };
