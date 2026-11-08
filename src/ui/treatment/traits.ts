/** Per-customer traits used by the care mini-games (stable per customer id, so a reload shows the same). */
import type { Customer } from "@/core/types";
import { characterById } from "@/ui/art/assets";
import { NEEDS, SKIN_TYPES, type NeedDef, type SkinType } from "@/data/minigames";
import { hash01 } from "./scoring";

const ageOf = (c: Customer): number => (characterById(c.characterId) as { age?: number } | undefined)?.age ?? 30;
export const isPregnant = (c: Customer): boolean => c.special === "pregnant" || c.health?.id === "pregnant";

/** Skin type: teens/young skew acne/oily, older skew dry/sensitive. */
export function skinOf(c: Customer): SkinType {
  const age = ageOf(c);
  const pool = age < 25 ? ["acne", "oily", "combination", "acne", "sensitive"]
    : age < 45 ? ["oily", "combination", "dry", "sensitive", "acne", "combination"]
      : ["dry", "dry", "sensitive", "combination", "oily"];
  const id = pool[Math.floor(hash01(c.id + "|skin") * pool.length) % pool.length];
  return SKIN_TYPES.find((s) => s.id === id)!;
}

export function needOf(c: Customer): NeedDef {
  return NEEDS[Math.floor(hash01(c.id + "|need") * NEEDS.length) % NEEDS.length];
}

/** Gentle (1%) dilution: face services, customers 65+, sensitive skin. */
export function gentleOil(c: Customer, serviceId: string): boolean {
  return /mat/.test(serviceId) || ageOf(c) >= 65 || skinOf(c).id === "sensitive";
}
export { ageOf };
