/**
 * UI-side facade over src/data. Real content by default; the dev mock layer may fill it when the
 * data agent's arrays are still empty.
 */
import * as data from "@/data";
import type { AcupointDef, ChapterDef, ChapterNo, ChapterDayDef, EquipmentDef, MuscleDef, ReflexZoneDef, ServiceDef, StaffRole, StaffTier, SupplyDef, ItemKey, CareStepId } from "@/core/types";

type Content = {
  ACUPOINTS: AcupointDef[]; MUSCLES: MuscleDef[]; REFLEX_ZONES: ReflexZoneDef[]; SERVICES: ServiceDef[];
  SUPPLIES: SupplyDef[]; EQUIPMENT: EquipmentDef[]; STAFF_TIERS: typeof data.STAFF_TIERS; CHAPTERS: ChapterDef[];
  CARE_STEPS: typeof data.CARE_STEPS; CONFIG: typeof data.CONFIG; TEXTS: typeof data.TEXTS;
};

export const content: Content = {
  ACUPOINTS: data.ACUPOINTS, MUSCLES: data.MUSCLES, REFLEX_ZONES: data.REFLEX_ZONES, SERVICES: data.SERVICES,
  SUPPLIES: data.SUPPLIES, EQUIPMENT: data.EQUIPMENT, STAFF_TIERS: data.STAFF_TIERS, CHAPTERS: data.CHAPTERS,
  CARE_STEPS: data.CARE_STEPS, CONFIG: data.CONFIG, TEXTS: data.TEXTS,
};

export function installMockContent(c: Partial<Content>) {
  // Mock mode always uses the mock content so it stays consistent with the mock fixture.
  for (const [k, v] of Object.entries(c) as [keyof Content, never][]) content[k] = v;
}

export const serviceDef = (id: string): ServiceDef | undefined => content.SERVICES.find((s) => s.id === id);
export const serviceName = (id: string) => serviceDef(id)?.name ?? id;
export const supplyDef = (id: string): SupplyDef | undefined => content.SUPPLIES.find((s) => s.id === id);
export const equipmentDef = (id: string): EquipmentDef | undefined => content.EQUIPMENT.find((e) => e.id === id);
export const chapterDef = (no: ChapterNo): ChapterDef | undefined => content.CHAPTERS.find((c) => c.no === no);
export function chapterDayDef(no: ChapterNo, chapterDay: number): ChapterDayDef | undefined {
  const ch = chapterDef(no);
  if (!ch) return undefined;
  return ch.days.find((d) => d.chapterDay === chapterDay);
}
export function tierDef(role: StaffRole, tier: StaffTier) {
  return content.STAFF_TIERS.find((t) => t.role === role && t.tier === tier);
}

export type LearnItem =
  | { kind: "point"; def: AcupointDef }
  | { kind: "muscle"; def: MuscleDef }
  | { kind: "zone"; def: ReflexZoneDef };

/** "P:GV29" → content definition. */
export function itemByKey(key: ItemKey): LearnItem | undefined {
  const [p, id] = [key.slice(0, 1), key.slice(2)];
  if (p === "P") { const d = content.ACUPOINTS.find((a) => a.id === id); return d && { kind: "point", def: d }; }
  if (p === "M") { const d = content.MUSCLES.find((a) => a.id === id); return d && { kind: "muscle", def: d }; }
  if (p === "Z") { const d = content.REFLEX_ZONES.find((a) => a.id === id); return d && { kind: "zone", def: d }; }
  return undefined;
}
export function itemNameByKey(key: ItemKey): string {
  return itemByKey(key)?.def.name ?? key.slice(2);
}
export function stepName(id: CareStepId) {
  return content.CARE_STEPS?.[id]?.name ?? id;
}
