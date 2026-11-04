/** DEV ONLY (?mock): a plausible mid-chapter-1 GameState fixture. */
import type { Side, Customer, DayLedger, DaySummary, GameState, MasteryRecord, TaskItem } from "@/core/types";

export const emptyLedger = (): DayLedger => ({
  revenuePlayer: 0, revenueStaff: 0, tips: 0, rewards: 0, supplies: 0, electricity: 0, repairs: 0, refunds: 0, rent: 0,
  wagesBase: 0, wagesCommission: 0, severance: 0, bonuses: 0, depreciation: 0, purchases: 0, other: 0,
});

const m = (level: MasteryRecord["level"], correct: number, attempts: number): MasteryRecord => ({ level, streak: 1, attempts, correct, lastSeenDay: 4, dueDay: 5, intervalIdx: 0 });

let cid = 0;
export function mockCustomer(characterId: string, name: string, serviceId: string, items: TaskItem[], extra: Partial<Customer> = {}): Customer {
  return { id: `c${++cid}`, characterId, name, serviceId, items, regular: false, arriveAt: 540, patience: 45, durationMin: 30, ...extra };
}
const pt = (id: string, side: Side = "center"): TaskItem => ({ kind: "point", id, side });

export function mockArrivals(): Customer[] {
  return [
    mockCustomer("khach-mai", "Chị Mai", "ch1-basic", [pt("GV29"), pt("EX-HN5", "left"), pt("EX-HN5", "right"), pt("BL2", "left")]),
    mockCustomer("quen-thu", "Cô Thu", "ch1-eye", [pt("ST2", "left"), pt("ST2", "right"), pt("GB1", "left"), pt("BL1", "right"), pt("ST1", "left")], { regular: true }),
    mockCustomer("khach-tuan", "Anh Tuấn", "ch1-facial", [{ kind: "step", id: "cleanse" }, { kind: "step", id: "steam" }, { kind: "step", id: "scrub" }, { kind: "step", id: "mask" }], { arriveAt: 600 }),
    mockCustomer("khach-ba-tam", "Bà Tám", "ch1-basic", [pt("GV29"), pt("TE23", "left"), pt("TE23", "right")], { arriveAt: 660, patience: 20 }),
  ];
}

export const mockSummary: DaySummary = {
  day: 4, chapter: 1, chapterDay: 4, served: 4, servedByStaff: 0, walkouts: 1, complaints: 1, reputationDelta: -0.05,
  ledger: { ...emptyLedger(), revenuePlayer: 420000, tips: 30000, supplies: 60000, electricity: 26000, refunds: 30000, depreciation: 24000 },
  profit: 310000, moneyEnd: 1850000,
  itemsPracticed: [{ key: "P:GB1", correct: 4, total: 4 }, { key: "P:ST2", correct: 2, total: 4 }, { key: "P:GV29", correct: 3, total: 3 }],
  toReview: ["P:ST2", "P:BL2"], notes: ["Tiền thuê đến hạn sau 3 ngày"],
};

export function mockGameState(shopName = "Tiệm Hoa Sen"): GameState {
  return {
    schemaVersion: 1, createdAt: "2026-11-01T08:00:00.000Z", shopName, seed: 42,
    day: 5, chapter: 1, chapterDay: 5, chaptersPassed: [], freeMode: false,
    money: 1850000, reputation: 3.15,
    rent: { amount: 700000, nextDueDay: 7, missedPayments: 0 },
    inventory: { I01: 14, I02: 3, I03: 0, I04: 6, I05: 6, I06: 2, I07: 0, I08: 0 },
    equipment: [
      { uid: "eq1", id: "E01", usesLeft: 236, slot: "bed-1" },
      { uid: "eq3", id: "E02", usesLeft: 90, slot: "chair-3" },
      { uid: "eq4", id: "E03", usesLeft: 30, slot: "steamer" },
    ],
    staff: [{
      uid: "st1", characterId: "ktv-lan", name: "Lan", role: "ktv", tier: 1, wage: 100000, commissionPct: 10, satisfaction: 72,
      exp: 18, servicesToday: 0, promotionRequested: false, unpaidDays: 0, hiredDay: 5,
    }],
    candidates: [
      { characterId: "ktv-minh", name: "Minh", role: "ktv", tier: 1, wage: 100000, commissionPct: 10 },
      { characterId: "ktv-thao", name: "Thảo", role: "ktv", tier: 2, wage: 150000, commissionPct: 15 },
    ],
    candidatesRefreshDay: 8,
    priceMultiplier: {}, combos: [],
    mastery: {
      "P:GV29": m(3, 9, 10), "P:EX-HN5": m(3, 8, 9), "P:BL2": m(2, 5, 7), "P:TE23": m(2, 5, 6),
      "P:EX-HN4": m(1, 3, 4), "P:GB14": m(1, 2, 4), "P:GB1": m(1, 4, 4), "P:ST2": m(0, 2, 4),
    },
    unlocked: {
      services: ["ch1-basic", "ch1-facial", "ch1-eye"],
      features: ["billing", "supplies", "queue", "buy-equipment", "electricity", "depreciation", "walkout", "complaint", "reputation", "rent", "hire-ktv", "durability"],
      supplies: ["I01", "I02", "I04", "I05", "I06"],
      equipment: ["E01", "E03", "chair-extra"],
    },
    seenTips: ["billing", "supplies", "queue", "buy-equipment", "electricity", "depreciation", "walkout", "complaint", "reputation", "rent"],
    shopLevel: 0, adsDaysLeft: 0, regulars: ["quen-thu"], challenge: { lastDay: 0, streak: 0 },
    today: {
      phase: "prep", clock: 540, servicesCompleted: 0, arrivals: [], queue: [], inService: [], cleaning: [], records: [], walkouts: [], complaints: [],
      ledger: emptyLedger(), reputationStart: 3.15,
    },
    history: [mockSummary],
    settings: { sound: true, music: false },
  };
}
