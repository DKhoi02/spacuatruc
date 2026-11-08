/**
 * ART LOADER CONTRACT — owned by the lead. Lazy-loads raw SVG strings / JSON from /art.
 * Use these instead of importing art files directly.
 */
import type { ViewId } from "@/core/types";

const viewSvgs = import.meta.glob("/art/views/*.svg", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const viewJsons = import.meta.glob("/art/views/*.json", { import: "default" }) as Record<string, () => Promise<ViewData>>;
const charSvgs = import.meta.glob("/art/characters/out/*.svg", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const shopSvgs = import.meta.glob("/art/shop/*.svg", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const shopSlots = import.meta.glob("/art/shop/*.slots.json", { import: "default" }) as Record<string, () => Promise<SceneSlots>>;
const equipSvgs = import.meta.glob("/art/equipment/*.svg", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const decorSvgs = import.meta.glob("/art/decor/*.svg", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const itemSvgs = import.meta.glob("/art/items/*.svg", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const uiSvgs = import.meta.glob("/art/ui/*.svg", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const appSvgs = import.meta.glob("/art/app/*.svg", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
import charactersManifest from "@art/characters/characters.json";

const cache = new Map<string, Promise<unknown>>();
function load<T>(map: Record<string, () => Promise<T>>, path: string): Promise<T> {
  const fn = map[path];
  if (!fn) return Promise.reject(new Error(`Missing art: ${path}`));
  if (!cache.has(path)) cache.set(path, fn());
  return cache.get(path) as Promise<T>;
}

export interface ViewPoint { id: string; name: string; side: string; x: number; y: number; r: number; variant?: string | null; note?: string }
export interface ViewMuscle { id: string; name: string; side: string; svgPath?: string; polygon: [number, number][]; strokes: { from: [number, number]; to: [number, number] }[]; maxAngleDeg: number; minLengthRatio: number }
export interface ViewForbidden { id: string; shape: "ellipse" | "circle" | "polygon"; x?: number; y?: number; r?: number; rx?: number; ry?: number; points?: [number, number][]; message: string; side?: string }
export interface ViewZone { id: string; name: string; bodyArea?: string; onlyFoot?: "left" | "right" | null; svgPath?: string; polygon: [number, number][]; polygons?: [number, number][][] }
export interface ViewData {
  view: ViewId; title: string; svg: string; frame: { width: number; height: number };
  variants?: Record<string, string[]>; defaultVariants?: Record<string, string>;
  mirrorable?: boolean; drawnSide?: string; screenLeftIs?: "customer-left" | "customer-right";
  points: ViewPoint[]; muscles: ViewMuscle[]; forbidden: ViewForbidden[]; zones?: ViewZone[];
  vertebrae?: { id: string; x: number; y: number }[];
  /** Per-customer warped face (treatment/faces.ts): maps warped normalized view coords back to the canonical art. */
  unwarp?: (p: [number, number]) => [number, number];
  faceKey?: string;
  [k: string]: unknown;
}
export interface SceneSlot { id: string; group: string; layer: string; x: number; y: number; width: number; height: number; anchor?: string; fit: "native" | "contain"; kind: string; accepts: string[]; default?: string | null; note?: string }
export interface SceneSlots { scene: string; title: string; svg: string; frame: { width: number; height: number }; slots: SceneSlot[]; anchors?: { id: string; x: number; y: number; note?: string }[]; text?: { id: string; default: string }[]; [k: string]: unknown }

export const viewSvg = (v: ViewId) => load(viewSvgs, `/art/views/${v}.svg`);
export const viewData = (v: ViewId) => load(viewJsons, `/art/views/${v}.json`);
export const overlaySvg = (v: "V13" | "V14" | "V15") => load(viewSvgs, `/art/views/${v}.svg`);
/** expression: e.g. "neutral" | "happy" | "relaxed" | "annoyed" | "pain" | "tired" | "praise" | "critique". Falls back to neutral. */
export async function characterSvg(characterId: string, expression = "neutral"): Promise<string> {
  const p = `/art/characters/out/${characterId}-${expression}.svg`;
  return charSvgs[p] ? load(charSvgs, p) : load(charSvgs, `/art/characters/out/${characterId}-neutral.svg`);
}
export const sceneSvg = (scene: string) => load(shopSvgs, `/art/shop/${scene}.svg`);
export const sceneSlots = (scene: string) => load(shopSlots, `/art/shop/${scene}.slots.json`);
export const equipmentSvg = (id: string) => load(equipSvgs, `/art/equipment/${id}.svg`);
/** True when art/equipment/<name>.svg exists (checked against the build-time glob, no fetch). */
export const hasEquipmentArt = (name: string): boolean => `/art/equipment/${name}.svg` in equipSvgs;
/**
 * Equipment art for a tier (GAME_DESIGN §12.2): `<id>-t<tier>.svg` when drawn (same viewBox as the tier-1 file),
 * else the next lower tier's art; a bed (E01) of tier ≥2 falls back to the cushioned bed `E01-upgraded`; then tier 1.
 */
export function equipmentArt(id: string, tier = 1): string {
  for (let t = Math.min(3, Math.floor(tier)); t >= 2; t--) {
    if (hasEquipmentArt(`${id}-t${t}`)) return `${id}-t${t}`;
    if (id === "E01" && t === 2 && hasEquipmentArt("E01-upgraded")) return "E01-upgraded";
  }
  return id;
}
export const itemSvg = (id: string) => load(itemSvgs, `/art/items/${id}.svg`);
export const decorSvg = (id: string) => load(decorSvgs, `/art/decor/${id}.svg`);
export const uiSvg = (name: string) => load(uiSvgs, `/art/ui/${name}.svg`);
export const appSvg = (name: string) => load(appSvgs, `/art/app/${name}.svg`);

export interface CharacterInfo { id: string; name: string; group?: string; role?: string; [k: string]: unknown }
export const characters = charactersManifest as unknown as { characters: CharacterInfo[]; [k: string]: unknown };
export function characterById(id: string): CharacterInfo | undefined { return characters.characters.find((c) => c.id === id); }
