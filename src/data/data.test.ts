import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ACUPOINTS, MUSCLES, REFLEX_ZONES, SERVICES, SUPPLIES, EQUIPMENT, STAFF_TIERS, CHAPTERS, EVENTS, CARE_STEPS, CONFIG,
  CUSTOMER_CHARACTER_IDS, REGULAR_CHARACTER_IDS, SPECIAL_CHARACTER_IDS, STAFF_CANDIDATE_IDS, EXAMINER_CHARACTER_ID,
} from "./index";
import type { FeatureId } from "@/core/types";

const ROOT = resolve(__dirname, "../..");
const readJson = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
type Entry = { id: string; side?: string; variant?: string | null; onlyFoot?: string | null; name?: string };
const VIEW_IDS = ["V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10", "V11", "V12"] as const;
const views: Record<string, { points: Entry[]; muscles: Entry[]; zones?: Entry[]; mirrorable?: boolean }> =
  Object.fromEntries(VIEW_IDS.map((v) => [v, readJson(`art/views/${v}.json`)]));

const viewsWith = (kind: "points" | "muscles", id: string) =>
  VIEW_IDS.filter((v) => (views[v][kind] ?? []).some((e) => e.id === id));

const unique = <T>(xs: T[]) => new Set(xs).size === xs.length;

describe("content counts", () => {
  it("48 points, 16 muscles, 15 zones, unique ids", () => {
    expect(ACUPOINTS).toHaveLength(48);
    expect(MUSCLES).toHaveLength(16);
    expect(REFLEX_ZONES).toHaveLength(15);
    expect(unique(ACUPOINTS.map((p) => p.id))).toBe(true);
    expect(unique(MUSCLES.map((m) => m.id))).toBe(true);
    expect(unique(REFLEX_ZONES.map((z) => z.id))).toBe(true);
  });
  it("points per chapter match docs", () => {
    const count = (ch: number) => ACUPOINTS.filter((p) => p.chapter === ch).length;
    expect([1, 2, 4, 5, 6, 7, 8].map(count)).toEqual([10, 12, 7, 2, 4, 8, 5]);
    expect(MUSCLES.filter((m) => m.chapter === 3)).toHaveLength(12);
    expect(MUSCLES.filter((m) => m.chapter === 5)).toHaveLength(4);
  });
});

describe("art consistency", () => {
  it("every point's views list exactly the art views containing it", () => {
    for (const p of ACUPOINTS) {
      expect(new Set(p.views), p.id).toEqual(new Set(viewsWith("points", p.id)));
      expect(p.views.length, p.id).toBeGreaterThan(0);
    }
  });
  it("point sides/variants match art", () => {
    for (const p of ACUPOINTS) {
      const entries = p.views.flatMap((v) => views[v].points.filter((e) => e.id === p.id));
      const artSides = new Set(entries.map((e) => e.side));
      // mirrorable single-side views (V02, V07–V12) only draw one side; the other is the mirror.
      const anyMirror = p.views.some((v) => views[v].mirrorable);
      if (anyMirror && artSides.size === 1 && !artSides.has("center")) expect([...p.sides].sort(), p.id).toEqual(["left", "right"]);
      else for (const s of p.sides) expect(artSides.has(s), `${p.id} ${s}`).toBe(true);
      const variants = new Set(entries.map((e) => e.variant ?? undefined));
      if (p.variant) expect(variants.has(p.variant), p.id).toBe(true);
      else expect([...variants].filter(Boolean), p.id).toEqual([]);
    }
  });
  it("every muscle's views list exactly the art views containing it", () => {
    for (const m of MUSCLES) {
      expect(new Set(m.views), m.id).toEqual(new Set(viewsWith("muscles", m.id)));
      expect(m.strokesRequired).toBe(3);
    }
  });
  it("zones match V12", () => {
    const art = views.V12.zones ?? [];
    expect(new Set(REFLEX_ZONES.map((z) => z.id))).toEqual(new Set(art.map((z) => z.id)));
    for (const z of REFLEX_ZONES) {
      const a = art.find((x) => x.id === z.id)!;
      expect(z.onlyFoot, z.id).toBe(a.onlyFoot ?? null);
      expect(z.name, z.id).toBe(a.name);
    }
  });
  it("sensitive and pregnancy flags", () => {
    const sens = ACUPOINTS.filter((p) => p.sensitive).map((p) => p.id).sort();
    expect(sens).toEqual(["BL1", "GB1", "ST1", "ST2", "ST5"]);
    const preg = Object.fromEntries(ACUPOINTS.filter((p) => p.pregnancy).map((p) => [p.id, p.pregnancy]));
    expect(preg).toEqual({ LI4: "contraindicated", SP6: "contraindicated", GB21: "caution" });
  });
});

describe("services, shop", () => {
  const pointIds = new Set(ACUPOINTS.map((p) => p.id));
  const muscleIds = new Set(MUSCLES.map((m) => m.id));
  const zoneIds = new Set(REFLEX_ZONES.map((z) => z.id));
  const supplyIds = new Set(SUPPLIES.map((s) => s.id));
  const equipIds = new Set(EQUIPMENT.map((e) => e.id));

  it("service pools reference existing content, supplies & equipment", () => {
    expect(unique(SERVICES.map((s) => s.id))).toBe(true);
    for (const s of SERVICES) {
      for (const id of s.pool.points ?? []) expect(pointIds.has(id), `${s.id} ${id}`).toBe(true);
      for (const id of s.pool.muscles ?? []) expect(muscleIds.has(id), `${s.id} ${id}`).toBe(true);
      for (const id of s.pool.zones ?? []) expect(zoneIds.has(id), `${s.id} ${id}`).toBe(true);
      for (const id of s.pool.steps ?? []) expect(CARE_STEPS[id], `${s.id} ${id}`).toBeTruthy();
      for (const id of Object.keys(s.supplies)) expect(supplyIds.has(id as never), `${s.id} ${id}`).toBe(true);
      for (const id of s.requiresEquipment) expect(equipIds.has(id), `${s.id} ${id}`).toBe(true);
      expect(s.itemCount[0]).toBeLessThanOrEqual(s.itemCount[1]);
      // pool items must be learned no later than the service's chapter
      for (const id of s.pool.points ?? []) expect(ACUPOINTS.find((p) => p.id === id)!.chapter).toBeLessThanOrEqual(s.chapter);
      for (const id of s.pool.muscles ?? []) expect(MUSCLES.find((m) => m.id === id)!.chapter).toBeLessThanOrEqual(s.chapter);
    }
  });
  it("equipment art files and scene slots exist", () => {
    for (const e of EQUIPMENT) {
      expect(existsSync(resolve(ROOT, `art/equipment/${e.art}.svg`)), e.id).toBe(true);
      const slots = readJson(`art/shop/${e.scene}.slots.json`).slots as { accepts: string[] }[];
      if (e.id !== "vip-room") expect(slots.some((s) => s.accepts.includes(e.id)), e.id).toBe(true);
    }
    // GAME_DESIGN §12.2: the old "nệm êm" kit (E04) is now the bed's tier-2 upgrade; only the VIP room has no tiers
    expect(EQUIPMENT.map((e) => e.id)).not.toContain("E04");
    expect(EQUIPMENT.map((e) => e.id)).not.toContain("E01-upgraded");
    expect(EQUIPMENT.filter((e) => e.noTiers).map((e) => e.id)).toEqual(["vip-room"]);
    expect(existsSync(resolve(ROOT, "art/equipment/E01-upgraded.svg"))).toBe(true); // drawn for beds of tier ≥2
    for (const s of SUPPLIES) expect(existsSync(resolve(ROOT, `art/items/${s.id}.svg`)), s.id).toBe(true);
  });
  it("scene art per shop level (GAME_DESIGN §12.1) has the slots the shop level needs", () => {
    const ids = (scene: string) => (readJson(`art/shop/${scene}.slots.json`).slots as { id: string }[]).map((x) => x.id);
    const lobbies = ["S01", "S01-expanded", "S01-L2", "S01-L3"];
    lobbies.forEach((scene, L) => {
      expect(existsSync(resolve(ROOT, `art/shop/${scene}.svg`)), scene).toBe(true);
      const want = Array.from({ length: CONFIG.shopLevels[L].chairSlots }, (_, i) => `chair-${i + 1}`);
      expect(ids(scene), scene).toEqual(expect.arrayContaining(want));
      expect(readFileSync(resolve(ROOT, `art/shop/${scene}.svg`), "utf8"), scene).toContain('id="shop-name"');
    });
    const room1 = ["bed-1", "bed-2", "bed-3", "bed-4", "steamer", "aroma", "shelf-tool"];
    for (const scene of ["S02", "S02-L1", "S02-L2", "S02-L3"]) expect(ids(scene), scene).toEqual(expect.arrayContaining(room1));
    // the room-1 variants keep S02's slot boxes so equipment sits identically at every level
    const box = (scene: string) => JSON.stringify(readJson(`art/shop/${scene}.slots.json`).slots.map((x: Record<string, unknown>) => [x.id, x.x, x.y, x.width, x.height]));
    for (const scene of ["S02-L1", "S02-L2", "S02-L3"]) expect(box(scene), scene).toEqual(box("S02"));
    for (const scene of ["S06", "S06-L3"]) expect(ids(scene), scene).toEqual(expect.arrayContaining(["bed-5", "bed-6", "bed-7", "bed-8"]));
    // wash / foot areas: the level variants keep the base scene's slots and boxes, and hold every slot core assigns
    for (const [base, variants, want] of [
      ["S04", ["S04-L2", "S04-L3"], ["shampoo-chair-1", "shampoo-chair-2", "water-heater"]],
      ["S05", ["S05-L2", "S05-L3"], ["footbath-chair-1", "footbath-chair-2", "footbath-chair-3", "aroma"]],
    ] as const) {
      expect(ids(base), base).toEqual(expect.arrayContaining([...want]));
      for (const scene of variants) {
        expect(existsSync(resolve(ROOT, `art/shop/${scene}.svg`)), scene).toBe(true);
        expect(box(scene), scene).toEqual(box(base));
      }
    }
  });
  it("staff tiers complete", () => {
    for (const role of ["ktv", "receptionist", "cleaner"]) expect(STAFF_TIERS.filter((t) => t.role === role)).toHaveLength(3);
  });
  it("service durations and prices follow GAME_DESIGN §11.2 (+ balance pass 04/11/2026)", () => {
    const table: Record<string, [number, number]> = {
      "goi-dau-thuong": [25, 80_000], "an-huyet-co-ban": [30, 100_000], "massage-tay": [30, 100_000], "cham-soc-da-mat": [40, 130_000],
      "an-huyet-mat-chuyen-sau": [45, 180_000], "gua-sha-mat": [45, 180_000], "goi-dau-duong-sinh": [45, 170_000], "xa-co-mat": [50, 200_000],
      "massage-co-vai-gay": [50, 200_000], "phan-xa-ban-chan": [50, 220_000], "an-huyet-mat-toan-dien": [60, 240_000], "chuom-da-nong": [60, 250_000],
      "bam-huyet-chan": [60, 250_000], "massage-body": [75, 300_000],
    };
    expect(SERVICES.map((s) => s.id).sort()).toEqual(Object.keys(table).sort());
    for (const s of SERVICES) expect([s.durationMin, s.basePrice], s.id).toEqual(table[s.id]);
    // ~3.300–4.400đ per minute; skilled services (acupressure/muscle/reflex beyond basics) pay more per minute
    for (const s of SERVICES) expect(s.basePrice / s.durationMin, s.id).toBeGreaterThanOrEqual(3_200);
    for (const s of SERVICES) expect(s.basePrice / s.durationMin, s.id).toBeLessThanOrEqual(4_400);
  });
});

describe("chapters", () => {
  it("day clock, check-in and cleaning start on chapter 1 day 1; all three hires open on chapter 1 day 5", () => {
    const d = (no: number) => CHAPTERS[0].days.find((x) => x.chapterDay === no)!;
    for (const f of ["clock", "checkin", "cleaning"] as FeatureId[]) expect(d(1).introduce).toContain(f);
    for (const f of ["hire-ktv", "hire-receptionist", "hire-cleaner"] as FeatureId[]) expect(d(5).introduce).toContain(f);
  });
  it("8 chapters, days ordered, exam last, review before exam", () => {
    expect(CHAPTERS.map((c) => c.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const c of CHAPTERS) {
      c.days.forEach((d, i) => expect(d.chapterDay).toBe(i + 1));
      expect(c.days.at(-1)!.kind).toBe("exam");
      expect(c.days.at(-2)!.kind).toBe("review");
      expect(existsSync(resolve(ROOT, `art/ui/${c.reward.badge}.svg`))).toBe(true);
    }
  });
  it("every point/muscle/zone introduced exactly once, in its own chapter", () => {
    const seen = new Map<string, number>();
    for (const c of CHAPTERS) for (const d of c.days) for (const it of d.newItems) {
      const key = `${it.kind}:${it.id}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      const def = it.kind === "point" ? ACUPOINTS.find((p) => p.id === it.id)
        : it.kind === "muscle" ? MUSCLES.find((m) => m.id === it.id) : REFLEX_ZONES.find((z) => z.id === it.id);
      expect(def, key).toBeTruthy();
      if (def && "chapter" in def) expect(def.chapter, key).toBe(c.no);
    }
    for (const p of ACUPOINTS) expect(seen.get(`point:${p.id}`), p.id).toBe(1);
    for (const m of MUSCLES) expect(seen.get(`muscle:${m.id}`), m.id).toBe(1);
    for (const z of REFLEX_ZONES) expect(seen.get(`zone:${z.id}`), z.id).toBe(1);
  });
  it("unlocks reference real ids; services unlocked by their own chapter; features introduced once", () => {
    const svcIds = new Set(SERVICES.map((s) => s.id));
    for (const s of SERVICES) {
      const ch = CHAPTERS.find((c) => c.no === s.chapter)!;
      expect(ch.unlocks.services, s.id).toContain(s.id);
      expect(s.unlockChapterDay).toBeLessThanOrEqual(ch.days.length);
    }
    for (const c of CHAPTERS) {
      for (const id of c.unlocks.services) expect(svcIds.has(id), id).toBe(true);
      for (const id of c.unlocks.equipment) expect(EQUIPMENT.find((e) => e.id === id)?.unlockChapter, id).toBe(c.no);
      for (const id of c.unlocks.supplies) expect(SUPPLIES.find((s) => s.id === id)?.unlockChapter, id).toBe(c.no);
      const introduced = c.days.flatMap((d) => d.introduce);
      expect(new Set(c.unlocks.features)).toEqual(new Set(introduced));
    }
    const all: FeatureId[] = CHAPTERS.flatMap((c) => c.days.flatMap((d) => d.introduce));
    expect(unique(all)).toBe(true);
    for (const e of EQUIPMENT) expect(CHAPTERS[e.unlockChapter - 1].unlocks.equipment, e.id).toContain(e.id);
    for (const s of SUPPLIES) expect(CHAPTERS[s.unlockChapter - 1].unlocks.supplies, s.id).toContain(s.id);
  });
  it("events valid", () => {
    expect(unique(EVENTS.map((e) => e.id))).toBe(true);
  });
});

describe("characters", () => {
  const chars = readJson("art/characters/characters.json").characters as { id: string; group: string }[];
  const byId = new Map(chars.map((c) => [c.id, c.group]));
  it("ids exist with the right group", () => {
    for (const id of CUSTOMER_CHARACTER_IDS) expect(byId.get(id), id).toBe("khach");
    for (const id of REGULAR_CHARACTER_IDS) expect(byId.get(id), id).toBe("khach-quen");
    for (const id of Object.values(SPECIAL_CHARACTER_IDS)) expect(byId.get(id), id).toBe("khach-dac-biet");
    for (const id of STAFF_CANDIDATE_IDS.ktv) expect(byId.get(id), id).toBe("ktv");
    for (const id of STAFF_CANDIDATE_IDS.receptionist) expect(byId.get(id), id).toBe("le-tan");
    for (const id of STAFF_CANDIDATE_IDS.cleaner) expect(byId.get(id), id).toBe("tap-vu");
    expect(byId.get(EXAMINER_CHARACTER_ID)).toBe("lead");
    // every customer-group character is used
    for (const c of chars) if (c.group === "khach") expect(CUSTOMER_CHARACTER_IDS).toContain(c.id);
  });
});
