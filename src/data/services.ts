/**
 * Dịch vụ — nguồn: docs/CHAPTER_1.md §3 và docs/CHAPTERS.md (bảng "Dịch vụ" mỗi chương).
 *
 * Quy ước:
 * - `pool` là toàn bộ nội dung có thể lên phiếu; bộ tạo phiếu chỉ lấy mục ĐÃ HỌC.
 * - `itemCount` đếm mục huyệt/cơ/vùng phản xạ. Với dịch vụ có `pool.steps` + huyệt (gội dưỡng sinh, chườm đá,
 *   bấm huyệt chân, phản xạ bàn chân) thì các bước (`steps`) luôn có trên phiếu, KHÔNG tính vào itemCount.
 *   Với dịch vụ chỉ có bước (chăm sóc da, gội thường) thì itemCount = số bước.
 * - `durationMin` = số phút trò chơi một ca (GAME_DESIGN §11.2); KTV × hệ số bậc.
 * - `basePrice`: §11.2, chỉnh ở đợt cân bằng 04/11/2026 để mọi dịch vụ ≥ 3.200đ/phút (gội thường 60k→80k,
 *   da mặt 120k→130k, gội dưỡng sinh 150k→170k, mặt toàn diện 220k→240k); dịch vụ cần kỹ năng cao ~4.000–4.400đ/phút.
 * - `electricityPerUse` = tiền điện mỗi ca của máy cần dùng (bằng `electricityPerUse` của thiết bị; chỉ tính 1 lần).
 */
import type { ServiceDef } from "@/core/types";
import { pointIdsOfChapter } from "./acupoints";

const CH1 = pointIdsOfChapter(1);
const CH2 = pointIdsOfChapter(2);
const CH4 = pointIdsOfChapter(4);
const CH6 = pointIdsOfChapter(6);
const CH7 = pointIdsOfChapter(7);
const CH8 = pointIdsOfChapter(8);

const FACE_MUSCLES = [
  "frontalis", "corrugator-supercilii", "orbicularis-oculi", "temporalis", "masseter", "buccinator",
  "zygomaticus-major", "zygomaticus-minor", "levator-labii-superioris", "orbicularis-oris", "depressor-anguli-oris", "mentalis",
];

const ALL_ZONES = [
  "head-brain", "sinuses", "eyes", "ears", "neck-thyroid", "chest-lungs", "stomach-pancreas", "liver-gallbladder",
  "spleen", "intestines", "kidneys", "pelvis-sciatic", "spine", "shoulder", "knee-hip",
];

export const SERVICES_DATA: ServiceDef[] = [
  // ── Chương 1 ──
  {
    id: "an-huyet-co-ban", name: "Ấn huyệt thư giãn – cơ bản", chapter: 1, unlockChapterDay: 1, basePrice: 100_000,
    kind: "acupressure", pool: { points: CH1 }, itemCount: [2, 4],
    supplies: { I01: 1, I02: 2 }, requiresEquipment: [], electricityPerUse: 0, durationMin: 30, room: "S02",
  },
  {
    id: "cham-soc-da-mat", name: "Chăm sóc da mặt cơ bản", chapter: 1, unlockChapterDay: 3, basePrice: 130_000,
    kind: "care", pool: { steps: ["cleanse", "steam", "scrub", "mask"] }, itemCount: [4, 4],
    supplies: { I01: 2, I04: 1, I05: 1, I06: 1 }, requiresEquipment: ["E03"], electricityPerUse: 3_000, durationMin: 40, room: "S02",
  },
  {
    id: "an-huyet-mat-chuyen-sau", name: "Ấn huyệt mắt – chuyên sâu", chapter: 1, unlockChapterDay: 5, basePrice: 180_000,
    kind: "acupressure", pool: { points: CH1 }, itemCount: [5, 8],
    supplies: { I01: 2, I02: 3 }, requiresEquipment: [], electricityPerUse: 0, durationMin: 45, room: "S02",
  },

  // ── Chương 2 ──
  {
    id: "goi-dau-thuong", name: "Gội đầu thường", chapter: 2, unlockChapterDay: 1, basePrice: 80_000,
    kind: "wash", pool: { steps: ["wet", "shampoo", "rinse", "dry"] }, itemCount: [4, 4],
    supplies: { I01: 1, I07: 1, I08: 1 }, requiresEquipment: ["E06"], electricityPerUse: 0, durationMin: 25, room: "S04",
  },
  {
    id: "an-huyet-mat-toan-dien", name: "Ấn huyệt mặt toàn diện", chapter: 2, unlockChapterDay: 4, basePrice: 240_000,
    kind: "acupressure", pool: { points: [...CH1, ...CH2] }, itemCount: [6, 10],
    supplies: { I01: 2, I02: 4 }, requiresEquipment: [], electricityPerUse: 0, durationMin: 60, room: "S02",
  },

  // ── Chương 3 ──
  {
    id: "xa-co-mat", name: "Xả cơ mặt", chapter: 3, unlockChapterDay: 1, basePrice: 200_000,
    kind: "muscle", pool: { muscles: FACE_MUSCLES }, itemCount: [3, 6],
    supplies: { I01: 2, I02: 4 }, requiresEquipment: [], electricityPerUse: 0, durationMin: 50, room: "S02",
  },
  {
    id: "gua-sha-mat", name: "Gua sha mặt", chapter: 3, unlockChapterDay: 4, basePrice: 180_000,
    kind: "muscle", pool: { muscles: FACE_MUSCLES }, itemCount: [3, 6],
    supplies: { I01: 2, I02: 3 }, requiresEquipment: ["E07"], electricityPerUse: 0, durationMin: 45, room: "S02",
  },

  // ── Chương 4 ──
  {
    id: "goi-dau-duong-sinh", name: "Gội đầu dưỡng sinh", chapter: 4, unlockChapterDay: 2, basePrice: 170_000,
    kind: "wash", pool: { steps: ["wet", "shampoo", "rinse", "dry"], points: CH4 }, itemCount: [3, 5],
    supplies: { I01: 2, I07: 2, I08: 1 }, requiresEquipment: ["E06", "E08"], electricityPerUse: 8_000, durationMin: 45, room: "S04",
  },

  // ── Chương 5 ──
  {
    id: "massage-co-vai-gay", name: "Massage cổ vai gáy", chapter: 5, unlockChapterDay: 1, basePrice: 200_000,
    kind: "mixed",
    pool: {
      points: ["GB20", "BL10", "GV16", "GV14", "GB21"],
      muscles: ["trapezius", "levator-scapulae", "sternocleidomastoid", "platysma"],
    },
    itemCount: [4, 7],
    supplies: { I01: 2, I02: 4 }, requiresEquipment: [], electricityPerUse: 0, durationMin: 50, room: "S02",
  },

  // ── Chương 6 ──
  {
    id: "massage-tay", name: "Massage tay", chapter: 6, unlockChapterDay: 1, basePrice: 100_000,
    kind: "acupressure", pool: { points: CH6 }, itemCount: [2, 4],
    supplies: { I01: 1, I02: 2 }, requiresEquipment: [], electricityPerUse: 0, durationMin: 30, room: "S02",
  },

  // ── Chương 7 ──
  {
    id: "massage-body", name: "Massage body", chapter: 7, unlockChapterDay: 1, basePrice: 300_000,
    kind: "mixed", pool: { points: CH7, muscles: ["trapezius"] }, itemCount: [4, 8],
    supplies: { I01: 3, I02: 6 }, requiresEquipment: [], electricityPerUse: 0, durationMin: 75, room: "S02",
  },
  {
    id: "chuom-da-nong", name: "Chườm đá nóng", chapter: 7, unlockChapterDay: 3, basePrice: 250_000,
    kind: "stone", pool: { steps: ["place-stones"], points: CH7 }, itemCount: [3, 6],
    supplies: { I01: 3, I02: 4 }, requiresEquipment: ["E09"], electricityPerUse: 6_000, durationMin: 60, room: "S02",
  },

  // ── Chương 8 ──
  {
    id: "bam-huyet-chan", name: "Bấm huyệt chân", chapter: 8, unlockChapterDay: 1, basePrice: 250_000,
    kind: "acupressure", pool: { steps: ["soak"], points: CH8 }, itemCount: [2, 5],
    supplies: { I01: 3, I02: 4 }, requiresEquipment: ["E10"], electricityPerUse: 3_000, durationMin: 60, room: "S05",
  },
  {
    id: "phan-xa-ban-chan", name: "Massage phản xạ bàn chân", chapter: 8, unlockChapterDay: 4, basePrice: 220_000,
    kind: "reflex", pool: { steps: ["soak"], zones: ALL_ZONES }, itemCount: [3, 6],
    supplies: { I01: 3, I02: 4 }, requiresEquipment: ["E10"], electricityPerUse: 3_000, durationMin: 50, room: "S05",
  },
];
