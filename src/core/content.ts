/** Content access layer. Reads live values from `@/data`; tests can inject fixtures with `setContentForTests`. */
import * as D from "@/data";
import charactersJson from "@art/characters/characters.json";
import type { AcupointDef, MuscleDef, ServiceDef, EquipmentDef, SupplyDef, ChapterDef, StaffTierDef, ChapterNo, StaffRole, StaffTier, ReflexZoneDef, RandomEventDef } from "./types";

export interface Content {
  ACUPOINTS: AcupointDef[];
  MUSCLES: MuscleDef[];
  REFLEX_ZONES: ReflexZoneDef[];
  SERVICES: ServiceDef[];
  SUPPLIES: SupplyDef[];
  EQUIPMENT: EquipmentDef[];
  STAFF_TIERS: StaffTierDef[];
  CHAPTERS: ChapterDef[];
  EVENTS: RandomEventDef[];
  CONFIG: typeof D.CONFIG;
  CUSTOMER_CHARACTER_IDS: string[];
  REGULAR_CHARACTER_IDS: string[];
  SPECIAL_CHARACTER_IDS: typeof D.SPECIAL_CHARACTER_IDS;
  STAFF_CANDIDATE_IDS: typeof D.STAFF_CANDIDATE_IDS;
  EXAMINER_CHARACTER_ID: string;
  TEXTS: typeof D.TEXTS;
}

let override: Partial<Content> | null = null;

/** Test-only: replace (part of) the content. Pass null to restore real data. */
export function setContentForTests(c: Partial<Content> | null): void { override = c; }

export function C(): Content {
  const base: Content = {
    ACUPOINTS: D.ACUPOINTS, MUSCLES: D.MUSCLES, REFLEX_ZONES: D.REFLEX_ZONES, SERVICES: D.SERVICES,
    SUPPLIES: D.SUPPLIES, EQUIPMENT: D.EQUIPMENT, STAFF_TIERS: D.STAFF_TIERS, CHAPTERS: D.CHAPTERS, EVENTS: D.EVENTS,
    CONFIG: D.CONFIG, CUSTOMER_CHARACTER_IDS: D.CUSTOMER_CHARACTER_IDS, REGULAR_CHARACTER_IDS: D.REGULAR_CHARACTER_IDS,
    SPECIAL_CHARACTER_IDS: D.SPECIAL_CHARACTER_IDS, STAFF_CANDIDATE_IDS: D.STAFF_CANDIDATE_IDS,
    EXAMINER_CHARACTER_ID: D.EXAMINER_CHARACTER_ID, TEXTS: D.TEXTS,
  };
  return override ? { ...base, ...override } : base;
}

// ── Lookups ──
export const acupoint = (id: string) => C().ACUPOINTS.find((p) => p.id === id);
export const muscle = (id: string) => C().MUSCLES.find((m) => m.id === id);
export const zone = (id: string) => C().REFLEX_ZONES.find((z) => z.id === id);
export const supplyDef = (id: string) => C().SUPPLIES.find((x) => x.id === id);
export const equipmentDef = (id: string) => C().EQUIPMENT.find((e) => e.id === id);
export function serviceDef(id: string): ServiceDef | undefined { return C().SERVICES.find((x) => x.id === id); }
export function chapterDef(no: ChapterNo | number): ChapterDef | undefined { return C().CHAPTERS.find((c) => c.no === no); }
export function tierDef(role: StaffRole, tier: StaffTier | number): StaffTierDef | undefined {
  return C().STAFF_TIERS.find((t) => t.role === role && t.tier === tier);
}

const names: Record<string, string> = {};
for (const ch of (charactersJson as { characters: { id: string; name: string }[] }).characters) names[ch.id] = ch.name;
export function characterName(id: string): string { return names[id] ?? "Khách"; }
