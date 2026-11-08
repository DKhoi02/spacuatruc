/**
 * CONTENT — all game data, re-exported from the files under src/data/.
 */
import type {
  AcupointDef, MuscleDef, ReflexZoneDef, ServiceDef, SupplyDef, EquipmentDef,
  StaffTierDef, ChapterDef, RandomEventDef, CareStepId, StaffRole,
} from "@/core/types";
import { ACUPOINTS_DATA } from "./acupoints";
import { MUSCLES_DATA } from "./muscles";
import { REFLEX_ZONES_DATA } from "./zones";
import { SERVICES_DATA } from "./services";
import { SUPPLIES_DATA, EQUIPMENT_DATA, STAFF_TIERS_DATA } from "./shop";
import { CHAPTERS_DATA } from "./chapters";

export const ACUPOINTS: AcupointDef[] = ACUPOINTS_DATA;
export const MUSCLES: MuscleDef[] = MUSCLES_DATA;
export const REFLEX_ZONES: ReflexZoneDef[] = REFLEX_ZONES_DATA;
export const SERVICES: ServiceDef[] = SERVICES_DATA;
export const SUPPLIES: SupplyDef[] = SUPPLIES_DATA;
export const EQUIPMENT: EquipmentDef[] = EQUIPMENT_DATA;
export const STAFF_TIERS: StaffTierDef[] = STAFF_TIERS_DATA;
export const CHAPTERS: ChapterDef[] = CHAPTERS_DATA;

/** docs/CHAPTERS.md Chương 4 (sự kiện ngẫu nhiên ~1 lần/tuần), Chương 5 (khách đoàn văn phòng), Chương 7 (kiểm tra vệ sinh). */
export const EVENTS: RandomEventDef[] = [
  {
    id: "power-outage", title: "Mất điện nửa ngày",
    description: "Khu phố cúp điện buổi sáng. Máy xông, bình nước nóng, máy hâm đá, ghế ngâm chân không dùng được hôm nay.",
    effect: "power-outage", minChapter: 4,
  },
  {
    id: "late-delivery", title: "Hàng giao trễ",
    description: "Nhà cung cấp báo giao hàng trễ: hôm nay không nhập được vật tư. Dùng tạm đồ còn trong kho nhé!",
    effect: "late-delivery", minChapter: 4,
  },
  {
    id: "group-booking", title: "Khách đoàn đặt trước",
    description: "Một nhóm bạn đã gọi đặt lịch hôm nay. Khách đến đông hơn, chuẩn bị đủ vật tư và giường.",
    effect: "group-booking", minChapter: 4,
  },
  {
    id: "staff-sick", title: "Nhân viên ốm",
    description: "Một nhân viên báo ốm, nghỉ hôm nay. Tiệm sẽ thiếu người, sắp xếp khách cho khéo.",
    effect: "staff-sick", minChapter: 4,
  },
  {
    id: "office-group", title: "Đoàn văn phòng",
    description: "Một công ty gần đây đặt Massage cổ vai gáy cho nhân viên. Khách đông hơn, chủ yếu gọi cổ vai gáy.",
    effect: "group-booking", minChapter: 5,
  },
  {
    id: "hygiene-check", title: "Kiểm tra vệ sinh",
    description: "Đoàn kiểm tra vệ sinh ghé tiệm hôm nay. Có Tạp vụ và đồ dùng còn bền thì được thưởng uy tín, ngược lại bị phạt tiền.",
    effect: "hygiene-check", minChapter: 7,
  },
];

export const CARE_STEPS: Record<CareStepId, { name: string; instruction: string }> = {
  cleanse: { name: "Rửa mặt", instruction: "Thoa sữa rửa mặt, xoa tròn nhẹ khắp mặt rồi lau sạch bằng khăn ấm." },
  steam: { name: "Xông mặt", instruction: "Bật máy xông, hướng hơi nước vào mặt khách vài phút cho lỗ chân lông giãn nở." },
  scrub: { name: "Tẩy tế bào chết", instruction: "Thoa tẩy tế bào chết, xoa tròn thật nhẹ, tránh vùng mắt, rồi lau sạch." },
  mask: { name: "Đắp mặt nạ", instruction: "Đắp mặt nạ giấy phẳng lên mặt, vuốt nhẹ cho kín, để khách thư giãn." },
  wet: { name: "Làm ướt tóc", instruction: "Thử nước vừa ấm rồi xả ướt đều tóc từ chân tóc đến ngọn." },
  shampoo: { name: "Dầu gội", instruction: "Thoa dầu gội, gãi nhẹ bằng đầu ngón tay khắp da đầu, không dùng móng." },
  rinse: { name: "Xả sạch", instruction: "Xả sạch bọt, thoa dầu xả lên thân tóc rồi xả lại thật sạch." },
  dry: { name: "Lau khô", instruction: "Quấn khăn thấm nhẹ cho khô tóc, sấy ấm nếu khách muốn." },
  soak: { name: "Ngâm chân", instruction: "Cho khách ngâm chân trong nước ấm vài phút để thư giãn trước khi bấm." },
  "place-stones": { name: "Đặt đá nóng", instruction: "Kéo từng viên đá đã hâm ấm đặt đúng lên vị trí huyệt trên lưng." },
  "blend-oil": { name: "Pha dầu massage", instruction: "Hỏi nhu cầu của khách, chọn tinh dầu phù hợp rồi nhỏ vào chén dầu nền theo đúng tỉ lệ pha loãng." },
};

export interface ShopLevelDef { level: number; name: string; unlockChapter: number; cost: number; rent: number; maxBeds: number; chairSlots: number; freeChairs: number; customers: [number, number]; pricePct: number }

/** Economy & rule constants (values from docs/GAME_DESIGN.md §5,§7 and docs/CHAPTER_1.md §4). */
export const CONFIG = {
  startMoney: 2_000_000,
  startReputation: 3,
  rentPerWeek: 700_000,
  /**
   * GAME_DESIGN §12.1 — shop levels (index = level). `rent` per week, `maxBeds` bed slots (room 1: bed-1..4,
   * room 2: bed-5..8), `chairSlots` waiting-chair slots (chair-1..N), `freeChairs` given when the level is bought,
   * `customers` extra customers per day [lo, hi] (total at that level), `pricePct` premium on every service price.
   * Balance pass 04/11/2026: rent of levels 2/3 raised 1,8/2,6tr → 2,2/3,4tr. Measured payback (A/B, average player):
   * level 2 ≈ 16–28 days, level 3 ≈ 46 days; a normal player now ends the game with ≈ 32tr instead of ≈ 55tr.
   */
  shopLevels: [
    { level: 0, name: "Tiệm nhỏ", unlockChapter: 1, cost: 0, rent: 700_000, maxBeds: 2, chairSlots: 4, freeChairs: 0, customers: [0, 0], pricePct: 0 },
    { level: 1, name: "Mở rộng mặt bằng", unlockChapter: 5, cost: 5_500_000, rent: 1_200_000, maxBeds: 4, chairSlots: 6, freeChairs: 2, customers: [1, 2], pricePct: 0 },
    { level: 2, name: "Phòng trị liệu thứ 2", unlockChapter: 6, cost: 12_000_000, rent: 2_200_000, maxBeds: 6, chairSlots: 8, freeChairs: 2, customers: [2, 3], pricePct: 0.05 },
    { level: 3, name: "Tiệm cao cấp", unlockChapter: 8, cost: 25_000_000, rent: 3_400_000, maxBeds: 8, chairSlots: 10, freeChairs: 2, customers: [3, 5], pricePct: 0.1 },
  ] as ShopLevelDef[],
  /**
   * GAME_DESIGN §12.2 — equipment tiers 1–3 (index = tier − 1). `upgradePct`: cost of reaching that tier × base price.
   * Tier value = base + upgrades paid; repair = repairPctOfPrice × tier value. `pricePct`/`tipPct` apply to services
   * using the item (station + main tool), `complaint` lowers the complaint chance on that station,
   * `durability`/`electricity` multiply max uses / power use, `patienceMin` (waiting chairs) adds waiting patience.
   * Balance pass 04/11/2026 (proposal 60%/120%, +8%/+18%, tip +5/+10%): tier 2 costs 80% so it no longer pays back in
   * ~1 week; tier 3 +15%. Per-item `upgradePrice` (src/data/shop.ts) evens out tools. Busy-shop payback ≈ 3–7 weeks.
   */
  equipmentTiers: {
    names: ["Thường", "Tốt", "Cao cấp"],
    upgradePct: [0, 0.8, 1.2],
    pricePct: [0, 0.06, 0.15],
    tipPct: [0, 0.04, 0.08],
    complaint: [0, -0.05, -0.1],
    durability: [1, 1.2, 1.4],
    electricity: [1, 1.1, 1.2],
    patienceMin: [0, 3, 6],
  },
  rentPeriodDays: 7,
  baseDailyElectricity: 20_000,
  startSeats: 2,
  startInventory: { I01: 10, I02: 10 } as Partial<Record<string, number>>,
  starMultiplier: { 1: 0.6, 2: 0.8, 3: 1.0 } as Record<1 | 2 | 3, number>,
  starThresholds: { three: 90, two: 70 },
  safetyErrorPenalty: 30,
  /**
   * GAME_DESIGN §11.6 (reduced penalties). Below `recoveryTarget` the reputation recovers every evening by
   * max(dailyRecovery, recoveryRate × gap) — halved on a day with complaints — so a struggling shop drifts back
   * towards ~2,5–3★ instead of collapsing (balance pass 04/11/2026).
   */
  reputation: { threeStar: 0.03, oneStar: -0.02, walkout: -0.02, complaintApology: -0.04, complaintRefund: -0.02, safetyError: -0.06, examPass: 0.2, dailyRecovery: 0.02, recoveryRate: 0.08, recoveryWithComplaints: 0.5, recoveryTarget: 3 },
  refundPct: 0.3,
  severanceDays: 3,
  quitSatisfaction: 20,
  quitNoticeDays: 2,
  candidatesRefreshDays: 3,
  postJobFee: 50_000,
  repairPctOfPrice: 0.3,
  lowDurabilityPct: 0.2,
  priceRange: [0.8, 1.2] as [number, number],
  /** Day clock in minutes since midnight (GAME_DESIGN §11.1). */
  clock: { open: 540, close: 1140, lastArrival: 1050, checkInMin: 5, cleanMin: 10, examMin: 60 },
  /** Waiting patience in game minutes (§11.3). Unchecked customers drain faster; a receptionist adds minutes. */
  patience: { baseMin: 90, uncheckedRate: 1.5, receptionistBonusMin: 20, longWaitPct: 0.25 },
  /** KTV session length = service duration × factor by tier (§11.4). */
  ktvTimeFactor: { 1: 1.2, 2: 1.0, 3: 0.9 } as Record<1 | 2 | 3, number>,
  /** Combos (§11.5): price range vs list sum, how often customers order them, ticket/duration scaling. */
  combo: { minPricePct: 0.7, maxPricePct: 1.0, baseChance: 0.03, chancePerDiscount: 0.8, maxChance: 0.5, durationPct: 0.9, itemsPct: 0.6 },
  adsCostPerDay: 120_000,
  srsIntervals: [1, 3, 7, 14, 30],
  masteryUpStreak: 3,
  positionThresholds: { perfectFrac: 1 / 3, goodFrac: 1 },
  positionScores: { perfect: 100, good: 70, miss: 0 },
  forceWeight: 0.4,
  masteredToleranceScale: 0.7,
};

/** Shown customer/staff names & character ids come from art/characters/characters.json (groups). */
export const CUSTOMER_CHARACTER_IDS: string[] = [
  "khach-mai", "khach-hoa", "khach-bich", "khach-tuan", "khach-linh", "khach-phuong",
  "khach-chu-bay", "khach-hang", "khach-dung", "khach-yen", "khach-ba-tam", "khach-nhung",
  "khach-ong-lam", "khach-anh-hai", "khach-co-loan", "khach-nam", "khach-chi-thanh", "khach-chu-hoa",
];
export const REGULAR_CHARACTER_IDS: string[] = ["quen-thu", "quen-huong", "quen-phat", "quen-diem"];
export const SPECIAL_CHARACTER_IDS: { pregnant: string; vip: string; office: string } = {
  pregnant: "dacbiet-mang-thai", vip: "dacbiet-vip", office: "dacbiet-van-phong",
};
export const STAFF_CANDIDATE_IDS: Record<StaffRole, string[]> = {
  ktv: ["ktv-lan", "ktv-minh", "ktv-thao", "ktv-hung", "ktv-lien", "ktv-vy"],
  receptionist: ["letan-ngoc", "letan-tram"],
  cleaner: ["tapvu-co-sau", "tapvu-chu-tu"],
};
export const EXAMINER_CHARACTER_ID = "anh-khoi";

/** Vietnamese UI strings for complaints etc. */
export const TEXTS = {
  complaintReasons: {
    "safety-eye": [
      "Ui, chị ấn vào mắt em!",
      "Ấn vào mắt em đau quá!",
      "Sao lại đè lên mắt em vậy, xốn quá!",
    ],
    "safety-artery": [
      "Chỗ cổ chị ấn mạnh quá, em thấy choáng.",
      "Ấn vào chỗ mạch đập làm em khó chịu quá.",
      "Bên cổ em đau nhói, chị ấn nhẹ thôi chứ!",
    ],
    "safety-contra": [
      "Em đang mang bầu mà, sao chị vẫn ấn huyệt đó?",
      "Hồ sơ em ghi rõ rồi, huyệt này em không được ấn!",
      "Chị không xem hồ sơ của em à? Em lo quá.",
    ],
    "one-star": [
      "Ấn chẳng đúng chỗ nào cả, phí tiền quá.",
      "Làm qua loa quá, em không thấy đỡ gì.",
      "Lần sau em chắc không quay lại đâu.",
    ],
    "low-durability": [
      "Giường cũ quá, nằm kêu cót két khó chịu.",
      "Đồ trong tiệm xuống cấp quá rồi chị ơi.",
      "Nằm cấn lưng quá, chị thay giường mới đi.",
    ],
    "long-wait": [
      "Em chờ lâu quá trời luôn!",
      "Ngồi đợi mãi mới tới lượt, mỏi cả người.",
      "Tiệm đông quá mà không ai hỏi han gì em.",
    ],
    "over-force": [
      "Chị ấn mạnh quá, đau em!",
      "Nhẹ tay thôi chị, chỗ đó đau lắm.",
      "Ấn mạnh vậy mai em bầm mất.",
    ],
  } as Record<"safety-eye" | "safety-artery" | "safety-contra" | "one-star" | "low-durability" | "long-wait" | "over-force", string[]>,
  walkoutReasons: {
    patience: "Chờ lâu quá, khách bỏ về.",
    "queue-full": "Hết ghế chờ, khách bỏ về.",
    "no-supplies": "Hết vật tư cho dịch vụ khách muốn, khách bỏ về.",
    "no-bed": "Không còn giường dùng được, khách bỏ về.",
  } as Record<"patience" | "queue-full" | "no-supplies" | "no-bed", string>,
  examinerPraise: [
    "Tay nghề tiến bộ rõ, anh rất hài lòng!",
    "Vị trí chuẩn, lực vừa đủ. Làm tốt lắm!",
    "Em nhớ huyệt chắc lắm rồi, cứ giữ phong độ này nhé.",
    "An toàn tuyệt đối, đúng chất kỹ thuật viên chuyên nghiệp.",
    "Qua bài này rồi, chúc mừng em!",
  ],
  examinerCritique: [
    "Vài huyệt còn lệch, em xem lại mốc giải phẫu trong sổ tay nhé.",
    "Huyệt quanh mắt nằm trên bờ xương hốc mắt, không ấn vào nhãn cầu.",
    "Lực chưa ổn: huyệt sát mắt, sát mạch phải ấn nhẹ.",
    "Nhớ xem hồ sơ khách trước khi làm, có huyệt phải bỏ qua.",
    "Không sao, mai em làm lại. Ôn kỹ những mục anh đánh dấu nhé.",
  ],
  disclaimerless: true,
};
