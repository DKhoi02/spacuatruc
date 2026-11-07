/**
 * SHARED CONTRACT — all game content, logic and UI use these types.
 * All game content (src/data) and all game logic (src/core) and UI (src/ui) use these types.
 * Money is in VND (integer đồng). Days are global game days starting at 1.
 */

// ───────────────────────── Content ─────────────────────────

export type ViewId =
  | "V01" | "V02" | "V03" | "V04" | "V05" | "V06"
  | "V07" | "V08" | "V09" | "V10" | "V11" | "V12";

/** Customer's anatomical side (NOT screen side). front/back only for Tứ Thần Thông (EX-HN1). */
export type Side = "left" | "right" | "center" | "front" | "back";

export type Force = "light" | "medium" | "strong";

export type RegionId = "eye-forehead" | "face-lower" | "face-muscles" | "head" | "neck-shoulder" | "hand" | "back" | "leg-foot";

export type ChapterNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface AcupointDef {
  /** WHO code, e.g. "GV29", "EX-HN5". Matches `id` in art/views/*.json points. */
  id: string;
  name: string;            // "Ấn Đường"
  altName?: string;        // "Nhân Trung"
  region: RegionId;
  chapter: ChapterNo;
  /** Sides this point exists on: ["center"], ["left","right"], or EX-HN1: ["front","back","left","right"]. */
  sides: Side[];
  location: string;        // vị trí (mốc giải phẫu) — from CONTENT_ACUPOINTS
  force: Force;
  seconds: number;         // hold seconds per press
  technique: string;       // "Ấn giữ", "Day tròn nhẹ"...
  effects: string;         // tác dụng (tham khảo)
  safetyNote?: string;     // lưu ý an toàn
  /** Over-force on this point is a SAFETY ERROR (near eye / artery). */
  sensitive: boolean;
  pregnancy?: "contraindicated" | "caution";
  /** Views containing this point, primary (preferred) first. */
  views: ViewId[];
  /** Point needs a view variant (e.g. ST7 "mouth-closed", SI19 "mouth-open"). Mirrors art json `variant`. */
  variant?: string;
}

export interface MuscleDef {
  /** Matches `id` in art/views/*.json muscles, e.g. "frontalis", "masseter", "sternocleidomastoid". */
  id: string;
  name: string;            // "Cơ trán"
  latin: string;
  region: RegionId;
  chapter: ChapterNo;
  sides: Side[];           // ["center"] or ["left","right"]
  location: string;
  fiberDirection: string;
  strokeDirection: string; // hướng vuốt
  safetyNote?: string;
  views: ViewId[];
  strokesRequired: number; // swipes needed per muscle per task (e.g. 3)
}

export interface ReflexZoneDef {
  id: string;              // matches art/views/V12.json zones id
  name: string;
  bodyArea: string;
  onlyFoot: "left" | "right" | null;
}

export type CareStepId =
  | "cleanse" | "steam" | "scrub" | "mask"            // chăm sóc da mặt
  | "wet" | "shampoo" | "rinse" | "dry"               // gội đầu
  | "soak"                                            // ngâm chân
  | "place-stones";                                   // đá nóng (drag stones onto back points)

export type TaskItem =
  | { kind: "point"; id: string; side: Side }
  | { kind: "muscle"; id: string; side: Side }
  | { kind: "zone"; id: string; foot: "left" | "right" }
  | { kind: "step"; id: CareStepId };

/** Stable key for mastery maps: "P:GV29", "M:masseter", "Z:kidneys". Sides share one mastery record. */
export type ItemKey = string;

export type ServiceKind = "acupressure" | "muscle" | "mixed" | "care" | "wash" | "stone" | "reflex";

export type SupplyId = "I01" | "I02" | "I03" | "I04" | "I05" | "I06" | "I07" | "I08";

export type EquipmentId =
  | "E01" | "E01-upgraded" | "E02" | "E03" | "E04" | "E05" | "E06" | "E07" | "E08" | "E09" | "E10"
  | "chair-extra" | "vip-room";

export type ServiceId = string;

export interface ServiceDef {
  id: ServiceId;
  name: string;
  chapter: ChapterNo;
  /** Day index inside its chapter when it unlocks (1-based). */
  unlockChapterDay: number;
  basePrice: number;
  kind: ServiceKind;
  /** Which content may appear on the ticket. Ticket generator only uses LEARNED items. */
  pool: { points?: string[]; muscles?: string[]; zones?: string[]; steps?: CareStepId[] };
  itemCount: [number, number];
  supplies: Partial<Record<SupplyId, number>>;
  requiresEquipment: EquipmentId[];
  electricityPerUse: number;
  /** Game minutes the player needs for one session (GAME_DESIGN §11.2). KTV: × tier factor. */
  durationMin: number;
  /** Room/scene the service happens in. */
  room: "S02" | "S03" | "S04" | "S05";
  vipOnly?: boolean;
}

export interface SupplyDef {
  id: SupplyId;
  name: string;
  packSize: number;
  packPrice: number;
  unlockChapter: ChapterNo;
}

export interface EquipmentDef {
  id: EquipmentId;
  name: string;
  price: number;
  maxUses: number;            // durability in uses
  electricityPerUse: number;
  dailyElectricity: number;
  /** Effects while owned & not broken. */
  effect: { tipBonusPct?: number; complaintChanceDelta?: number; queueSeats?: number; beds?: number };
  /** Art file under art/equipment (without .svg). */
  art: string;
  unlockChapter: ChapterNo;
  unlockChapterDay?: number;
  upgradeOf?: EquipmentId;
  /** No Thường/Tốt/Cao cấp tiers (GAME_DESIGN §12.2), e.g. the VIP room. */
  noTiers?: boolean;
  /** Base for tier upgrade costs (default `price`): items used by many / few customers are priced by what an upgrade earns. */
  upgradePrice?: number;
  /** Shop scene + slot kinds it can be placed in (see art/shop/*.slots.json). */
  scene: "S01" | "S02" | "S03" | "S04" | "S05";
  description: string;
}

export type StaffRole = "ktv" | "receptionist" | "cleaner";
export type StaffTier = 1 | 2 | 3;

export interface StaffTierDef { role: StaffRole; tier: StaffTier; label: string; baseWage: number; commissionPct: number; avgStars: number; expToPromote: number }

export type FeatureId =
  | "billing" | "supplies" | "queue" | "buy-equipment" | "electricity" | "depreciation"
  | "walkout" | "complaint" | "reputation" | "rent" | "hire-ktv" | "durability" | "upgrades"
  | "force-bar" | "patience" | "pricing" | "hire-receptionist" | "hire-cleaner"
  | "supply-tiers" | "vip-room" | "members" | "events" | "expansion" | "ads" | "group-booking"
  | "health-profile" | "combo" | "shifts" | "hygiene" | "spine-count" | "free-mode"
  | "clock" | "checkin" | "cleaning";

export interface ChapterDayDef {
  chapterDay: number;
  kind: "learn" | "review" | "exam";
  /** New items introduced this day (mastery level 0 → intro card). */
  newItems: { kind: "point" | "muscle" | "zone"; id: string }[];
  customers: [number, number];
  /** Features first introduced this day (tutorial popups). */
  introduce: FeatureId[];
  /** Short Vietnamese tutorial lines for this day (shown in morning). */
  tips: string[];
}

export interface ExamDef {
  /** Items: all chapter items + `reviewCount` random from earlier chapters. */
  reviewCount: number;
  passScore: number;       // 80 (ch1–7), 85 (ch8 final)
  sessions: number;        // 1, or 3 for the final exam
  requirePregnantCase: boolean;
}

export interface ChapterDef {
  no: ChapterNo;
  title: string;           // "Vùng mắt và trán"
  region: RegionId;
  days: ChapterDayDef[];   // learn days + review + exam (exam is last)
  exam: ExamDef;
  reward: { money: number; reputation: number; badge: string /* art/ui file */ };
  unlocks: { services: ServiceId[]; features: FeatureId[]; supplies: SupplyId[]; equipment: EquipmentId[] };
}

export interface HealthCondition {
  id: "pregnant";
  label: string;            // "Đang mang thai 4 tháng"
}

export interface RandomEventDef {
  id: string;
  title: string;
  description: string;
  effect: "power-outage" | "late-delivery" | "group-booking" | "staff-sick" | "hygiene-check";
  minChapter: ChapterNo;
}

// ───────────────────────── Runtime state ─────────────────────────

export interface MasteryRecord {
  level: 0 | 1 | 2 | 3 | 4;
  streak: number;           // consecutive correct at current level
  attempts: number;
  correct: number;
  lastSeenDay: number;
  /** Spaced repetition (free mode): next due game day and interval index into [1,3,7,14,30]. */
  dueDay: number;
  intervalIdx: number;
}

export interface Customer {
  id: string;
  characterId: string;      // art/characters/characters.json id
  name: string;
  serviceId: ServiceId;
  items: TaskItem[];
  health?: HealthCondition;
  regular: boolean;
  special?: "vip" | "office" | "pregnant" | "examiner";
  /** Combo the customer ordered (snapshot at arrival). `serviceId` is then the combo's first service. */
  combo?: ComboDef;
  /** Game minute of the day (minutes since midnight, 540 = 9:00) the customer arrives. */
  arriveAt: number;
  /** Remaining waiting patience in game minutes (drains ×1.5 until checked in). */
  patience: number;
  /** Greeted at reception (đón khách). Must be true before being served. */
  checkedIn?: boolean;
  /** Session length in game minutes when the player serves (combo: 90% of the sum). */
  durationMin: number;
}

export interface ComboDef { id: string; name: string; services: ServiceId[]; price: number }

export interface OwnedEquipment {
  uid: string;
  id: EquipmentId;
  usesLeft: number;
  /** Shop scene slot id it's placed in, e.g. "bed-1". */
  slot?: string;
  /** Station used since its last cleaning: must be cleaned (player 10 min, or the cleaner) before the next customer. */
  dirty?: boolean;
  /** Equipment tier 1 Thường · 2 Tốt · 3 Cao cấp (GAME_DESIGN §12.2). Missing = 1. */
  tier?: 1 | 2 | 3;
}

export interface Staff {
  uid: string;
  characterId: string;
  name: string;
  role: StaffRole;
  tier: StaffTier;
  wage: number;             // current base wage/day (may be raised)
  commissionPct: number;
  satisfaction: number;     // 0–100
  exp: number;              // completed services
  servicesToday: number;
  promotionRequested: boolean;
  quitNoticeDaysLeft?: number; // set when they announced quitting
  unpaidDays: number;
  hiredDay: number;
  sickToday?: boolean;
}

export interface Candidate { characterId: string; name: string; role: StaffRole; tier: StaffTier; wage: number; commissionPct: number }

export interface Complaint { id: string; customerId: string; customerName: string; reason: string; refundIfApologize: number }

export interface ServiceRecord {
  customerId: string;
  customerName: string;
  serviceId: ServiceId;
  /** Combo name when the customer ordered a combo. */
  comboName?: string;
  performer: "player" | string; // staff uid
  stars: 1 | 2 | 3;
  score: number;
  price: number;
  tip: number;
  discount: number;
  safetyErrors: number;
}

export interface DayLedger {
  revenuePlayer: number;
  revenueStaff: number;
  tips: number;
  rewards: number;          // chapter-exam and daily-challenge rewards (part of revenue/profit)
  supplies: number;
  electricity: number;
  repairs: number;
  refunds: number;
  rent: number;
  wagesBase: number;
  wagesCommission: number;
  severance: number;
  bonuses: number;
  depreciation: number;
  purchases: number;        // equipment/supply purchases (cash out, not P&L expense except supplies used)
  other: number;
}

export interface DaySummary {
  day: number;
  chapter: ChapterNo;
  chapterDay: number;
  served: number;
  servedByStaff: number;
  walkouts: number;
  complaints: number;
  reputationDelta: number;
  ledger: DayLedger;
  profit: number;           // revenue (incl. rewards) − (supplies used + electricity + repairs + refunds + rent + wages + severance + bonuses) − depreciation
  moneyEnd: number;
  itemsPracticed: { key: ItemKey; correct: number; total: number }[];
  toReview: ItemKey[];
  notes: string[];          // e.g. "Tiền thuê đến hạn sau 3 ngày"
}

export type DayPhase = "prep" | "open" | "summary";

/** A service in progress: bed busy from startAt until endsAt (game minutes). */
export interface InService { customerId: string; performer: "player" | string; bedSlot: string; startAt: number; endsAt: number }
/** The cleaner tidying a station. */
export interface CleaningJob { stationUid: string; staffUid: string; startAt: number; endsAt: number }

export interface DayState {
  phase: DayPhase;
  /** Game clock, minutes since midnight (opens 540 = 9:00). Advances only by actions (GAME_DESIGN §11.1). */
  clock: number;
  servicesCompleted: number;
  arrivals: Customer[];       // not yet arrived (sorted by arriveAt)
  queue: Customer[];          // waiting (seats limited)
  inService: InService[];
  cleaning: CleaningJob[];
  records: ServiceRecord[];
  walkouts: string[];
  complaints: Complaint[];    // unresolved
  ledger: DayLedger;
  reputationStart: number;
  event?: { id: string; title: string; description: string };
  examActive?: boolean;
  /** Core bookkeeping (practice log, notes, in-service customers...). UI may ignore. */
  meta?: Record<string, unknown>;
}

export interface GameState {
  schemaVersion: number;
  createdAt: string;
  shopName: string;
  seed: number;
  day: number;                // global game day, starts 1
  chapter: ChapterNo;
  chapterDay: number;         // day index inside current chapter (continues past exam day)
  chaptersPassed: ChapterNo[];
  freeMode: boolean;          // unlocked after chapter 8 exam
  money: number;
  reputation: number;         // 0–5
  rent: { amount: number; nextDueDay: number; missedPayments: number };
  inventory: Record<SupplyId, number>;
  equipment: OwnedEquipment[];
  staff: Staff[];
  candidates: Candidate[];
  candidatesRefreshDay: number;
  priceMultiplier: Record<ServiceId, number>; // 0.8–1.2
  combos: ComboDef[];
  mastery: Record<ItemKey, MasteryRecord>;
  unlocked: { services: ServiceId[]; features: FeatureId[]; supplies: SupplyId[]; equipment: EquipmentId[] };
  seenTips: string[];
  /** Shop level 0–3 (GAME_DESIGN §12.1): 0 tiệm nhỏ, 1 mở rộng, 2 phòng trị liệu thứ 2, 3 tiệm cao cấp. */
  shopLevel: number;
  adsDaysLeft: number;
  regulars: string[];         // characterIds of khách quen
  challenge: { lastDay: number; streak: number };
  today: DayState;
  history: DaySummary[];      // keep last 30
  /** zoomAssist: treatment auto-zooms toward the target (help option, default off = player finds the point at 1×). */
  settings: { sound: boolean; music: boolean; zoomAssist?: boolean };
  /** Latest chapter exam (any outcome), kept so anh Khôi's review can be reopened later (optional, additive). */
  lastExamReview?: LastExamReview;
}

/** Compact record of the latest exam: enough to rebuild `examReview` + practice (item results, not art). */
export interface LastExamReview {
  chapter: ChapterNo;
  day: number;
  passed: boolean;
  score: number;
  /** One per exam session, aligned with `customers`. */
  results: TreatmentResult[];
  customers: Customer[];
}

// ───────────────────────── Treatment (UI ⇄ core) ─────────────────────────

export interface ItemResult {
  item: TaskItem;
  /** 0–100. Position: 100 perfect (≤ r/3), 70 good (≤ r), 0 miss (then player was shown + re-tapped). */
  positionScore: number;
  /** 0–100 or undefined in chapter 1 (no force bar). Fraction of hold time inside correct force zone. */
  forceScore?: number;
  /** Swipe items: 0–100 combining right muscle / direction / length. */
  swipeScore?: number;
  attempts: number;           // taps/swipes until success
  safetyErrors: number;       // tapped forbidden zone, over-force on sensitive point, did contraindicated item
  /** Health-profile handling: player chose "skip" for this item. */
  skipped?: boolean;
  /**
   * Point / zone items: where the FIRST tap landed (before the correct spot was shown). Normalized 0–1 in the
   * view's art frame (1000×1400) in VIEW coords, i.e. already un-mirrored; `mirrored` = the view was drawn flipped.
   */
  firstTap?: TapRecord;
  /** Muscle items: the first faulty swipe (or the first swipe when none failed), view coords like `firstTap`. */
  firstSwipe?: SwipeRecord;
  /** Force-bar points: the player went over the required zone ("over") or stayed mostly under it ("under"). */
  forceIssue?: "over" | "under";
}

export interface TapRecord { view: ViewId; x: number; y: number; mirrored?: boolean }
export interface SwipeRecord {
  view: ViewId; from: { x: number; y: number }; to: { x: number; y: number }; mirrored?: boolean;
  /** Why the swipe failed (absent = it was accepted). */
  issue?: "outside" | "direction" | "short";
}

export interface Bill {
  serviceName: string; basePrice: number; starMultiplier: number; price: number; tip: number; discount: number; total: number; stars: 1 | 2 | 3; score: number;
  /** Price premium from upgraded equipment (bed/station + main tool), fraction (0.26 = +26%). */
  equipPremiumPct?: number;
  /** Price premium from the shop level, fraction. */
  shopPremiumPct?: number;
}

export interface TreatmentResult {
  customerId: string;
  items: ItemResult[];
  /** 0–1 remaining in-service patience (chapter ≥2), undefined in chapter 1. */
  patienceLeft?: number;
}

export interface TreatmentConfig {
  customer: Customer;
  service: ServiceDef;
  chapter: ChapterNo;
  useForceBar: boolean;
  usePatience: boolean;
  /** Hint level per item key 0–4 (exam forces 3). */
  hintLevel: (key: ItemKey) => 0 | 1 | 2 | 3 | 4;
  examMode: boolean;
  /** "Luyện lại" practice session (wording only: summary/exit dialog). */
  practice?: boolean;
  /** Help option (Cài đặt): auto-zoom toward the target and center manual zoom near it. Off = zoom only around the view center. */
  zoomAssist?: boolean;
}
