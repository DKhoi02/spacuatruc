import type { AcupointDef, ChapterDef, EquipmentDef, GameState, ServiceDef, StaffTierDef, SupplyDef, TreatmentResult, Customer, RandomEventDef } from "../types";
import { setContentForTests, type Content } from "../content";
import * as api from "../api";
import * as D from "@/data";
import { botDay } from "./bot";

const pt = (id: string, chapter: 1 | 2, extra: Partial<AcupointDef> = {}): AcupointDef => ({
  id, name: `Huyệt ${id}`, region: "eye-forehead", chapter, sides: ["left", "right"], location: "", force: "light", seconds: 3,
  technique: "", effects: "", sensitive: false, views: ["V01"], ...extra,
});

export const ACUPOINTS: AcupointDef[] = [
  pt("A1", 1, { sides: ["center"] }), pt("A2", 1), pt("A3", 1), pt("A4", 1),
  pt("B1", 2, { region: "hand", pregnancy: "contraindicated" }), pt("B2", 2, { region: "hand" }),
];

export const SERVICES: ServiceDef[] = [
  { id: "basic", name: "Cơ bản", chapter: 1, unlockChapterDay: 1, basePrice: 100_000, kind: "acupressure", pool: { points: ["A1", "A2", "A3", "A4"] }, itemCount: [2, 3], supplies: { I01: 1, I02: 1 }, requiresEquipment: [], electricityPerUse: 0, durationMin: 30, room: "S02" },
  { id: "care", name: "Da mặt", chapter: 1, unlockChapterDay: 2, basePrice: 120_000, kind: "care", pool: { steps: ["cleanse", "steam"] }, itemCount: [2, 2], supplies: { I01: 2 }, requiresEquipment: ["E03"], electricityPerUse: 3_000, durationMin: 40, room: "S02" },
  { id: "hand", name: "Tay", chapter: 2, unlockChapterDay: 1, basePrice: 200_000, kind: "acupressure", pool: { points: ["A1", "A2", "A3", "A4", "B1", "B2"] }, itemCount: [3, 4], supplies: { I01: 1, I02: 1 }, requiresEquipment: [], electricityPerUse: 0, durationMin: 30, room: "S02" },
];

export const SUPPLIES: SupplyDef[] = [
  { id: "I01", name: "Khăn", packSize: 10, packPrice: 50_000, unlockChapter: 1 },
  { id: "I02", name: "Dầu", packSize: 10, packPrice: 100_000, unlockChapter: 1 },
];

export const EQUIPMENT: EquipmentDef[] = [
  { id: "E01", name: "Giường", price: 1_500_000, maxUses: 300, electricityPerUse: 0, dailyElectricity: 0, effect: { beds: 1 }, art: "E01", unlockChapter: 1, scene: "S02", description: "" },
  { id: "E02", name: "Ghế chờ", price: 400_000, maxUses: 500, electricityPerUse: 0, dailyElectricity: 0, effect: { queueSeats: 1 }, art: "E02", unlockChapter: 1, scene: "S01", description: "" },
  { id: "E03", name: "Máy xông", price: 800_000, maxUses: 200, electricityPerUse: 3_000, dailyElectricity: 0, effect: {}, art: "E03", unlockChapter: 1, scene: "S02", description: "" },
];

export const STAFF_TIERS: StaffTierDef[] = [
  { role: "ktv", tier: 1, label: "Tập sự", baseWage: 100_000, commissionPct: 10, avgStars: 1.5, expToPromote: 3 },
  { role: "ktv", tier: 2, label: "Thạo việc", baseWage: 150_000, commissionPct: 15, avgStars: 2, expToPromote: 60 },
  { role: "ktv", tier: 3, label: "Lành nghề", baseWage: 220_000, commissionPct: 20, avgStars: 2.5, expToPromote: 0 },
  { role: "receptionist", tier: 1, label: "Lễ tân", baseWage: 80_000, commissionPct: 0, avgStars: 0, expToPromote: 30 },
];

export const CHAPTERS: ChapterDef[] = [
  {
    no: 1, title: "Ch1", region: "eye-forehead",
    days: [
      { chapterDay: 1, kind: "learn", newItems: [{ kind: "point", id: "A1" }, { kind: "point", id: "A2" }], customers: [2, 2], introduce: ["billing", "clock", "checkin", "cleaning"], tips: ["Tip ngày 1"] },
      { chapterDay: 2, kind: "learn", newItems: [{ kind: "point", id: "A3" }, { kind: "point", id: "A4" }], customers: [3, 3], introduce: ["queue", "walkout", "complaint", "reputation", "hire-ktv"], tips: [] },
      { chapterDay: 3, kind: "exam", newItems: [], customers: [2, 2], introduce: ["rent"], tips: [] },
    ],
    exam: { reviewCount: 0, passScore: 80, sessions: 1, requirePregnantCase: false },
    reward: { money: 500_000, reputation: 0.2, badge: "b1" },
    unlocks: { services: ["basic", "care"], features: [], supplies: ["I01", "I02"], equipment: ["E01", "E02", "E03"] },
  },
  {
    no: 2, title: "Ch2", region: "hand",
    days: [
      { chapterDay: 1, kind: "learn", newItems: [{ kind: "point", id: "B1" }, { kind: "point", id: "B2" }], customers: [4, 4], introduce: ["pricing", "health-profile", "force-bar"], tips: [] },
      { chapterDay: 2, kind: "exam", newItems: [], customers: [2, 2], introduce: [], tips: [] },
    ],
    exam: { reviewCount: 2, passScore: 80, sessions: 1, requirePregnantCase: true },
    reward: { money: 700_000, reputation: 0.2, badge: "b2" },
    unlocks: { services: ["hand"], features: [], supplies: [], equipment: [] },
  },
];

export const EVENTS: RandomEventDef[] = [];

/** Real rules (clock, patience, reputation…) with a pricier expansion. */
export const CONFIG: Content["CONFIG"] = { ...D.CONFIG, shopLevels: D.CONFIG.shopLevels.map((l) => (l.level === 1 ? { ...l, cost: 5_000_000 } : l)) };

export function useFixture(over: Partial<Content> = {}) {
  setContentForTests({
    ACUPOINTS, MUSCLES: [], REFLEX_ZONES: [], SERVICES, SUPPLIES, EQUIPMENT, STAFF_TIERS, CHAPTERS, EVENTS, CONFIG,
    CUSTOMER_CHARACTER_IDS: ["khach-mai", "khach-hoa", "khach-bich", "khach-tuan", "khach-linh"],
    REGULAR_CHARACTER_IDS: ["quen-thu"], SPECIAL_CHARACTER_IDS: { pregnant: "dacbiet-mang-thai", vip: "dacbiet-vip", office: "dacbiet-van-phong" },
    STAFF_CANDIDATE_IDS: { ktv: ["ktv-lan", "ktv-minh"], receptionist: ["letan-ngoc"], cleaner: [] },
    EXAMINER_CHARACTER_ID: "anh-khoi",
    TEXTS: { complaintReasons: {} as never, walkoutReasons: {} as never, examinerPraise: [], examinerCritique: [], disclaimerless: true },
    ...over,
  });
}

/** Perfect (or custom) result for a customer. */
export function perfectResult(c: Customer, score = 100, extra: Partial<TreatmentResult> = {}): TreatmentResult {
  return { customerId: c.id, items: c.items.map((item) => ({ item, positionScore: score, attempts: 1, safetyErrors: 0 })), ...extra };
}

/** Plays the rest of the open day as the player (check-in, serve with `score`, clean, wait); examiners are sent away. */
export function servePlayer(s: GameState, score = 100): GameState {
  return botDay(s, { treat: (_s, c) => perfectResult(c, score) });
}

/** Customer factory for tests (already arrived & greeted unless overridden). */
export function cust(id: string, extra: Partial<Customer> = {}): Customer {
  return {
    id, characterId: "khach-mai", name: "Chị Mai", serviceId: "basic",
    items: [{ kind: "point", id: "A1", side: "center" }, { kind: "point", id: "A2", side: "left" }],
    regular: false, arriveAt: 540, patience: 45, checkedIn: true, durationMin: 30, ...extra,
  };
}
