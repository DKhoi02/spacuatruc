/** DEV ONLY (?mock): plausible chapter-1 content used while src/data is still empty. */
import type { AcupointDef, ChapterDef, EquipmentDef, ServiceDef, StaffTierDef, SupplyDef, CareStepId } from "@/core/types";
import { CONFIG } from "@/data";

const p = (id: string, name: string, location: string, force: AcupointDef["force"], seconds: number, sides: AcupointDef["sides"], views: AcupointDef["views"], extra: Partial<AcupointDef> = {}): AcupointDef => ({
  id, name, region: "eye-forehead", chapter: 1, sides, location, force, seconds, technique: "Ấn giữ", effects: "Thư giãn vùng mắt, giảm mỏi mắt, đau đầu vùng trán.", sensitive: false, views, ...extra,
});
const LR: AcupointDef["sides"] = ["left", "right"];
export const ACUPOINTS: AcupointDef[] = [
  p("GV29", "Ấn Đường", "Chỗ lõm ở điểm giữa hai đầu trong lông mày", "medium", 5, ["center"], ["V01"]),
  p("EX-HN5", "Thái Dương", "Chỗ lõm khoảng 1 thốn phía sau điểm giữa đầu ngoài lông mày và khóe mắt ngoài", "medium", 5, LR, ["V02", "V01"], { safetyNote: "Ấn lực vừa" }),
  p("BL2", "Toản Trúc", "Chỗ lõm ở đầu trong lông mày", "medium", 4, LR, ["V01"]),
  p("TE23", "Ty Trúc Không", "Chỗ lõm ở đầu ngoài lông mày", "medium", 4, LR, ["V01"]),
  p("EX-HN4", "Ngư Yêu", "Giữa lông mày, thẳng trên đồng tử", "light", 4, LR, ["V01"]),
  p("GB14", "Dương Bạch", "Trên lông mày 1 thốn, thẳng trên đồng tử", "medium", 4, LR, ["V01"]),
  p("GB1", "Đồng Tử Liêu", "Chỗ lõm cách khóe mắt ngoài 0,5 thốn", "light", 3, LR, ["V01"], { safetyNote: "Gần mắt, ấn nhẹ" }),
  p("ST2", "Tứ Bạch", "Thẳng dưới đồng tử, tại lỗ dưới hốc mắt", "light", 3, LR, ["V01"], { safetyNote: "Gần mắt, ấn nhẹ" }),
  p("BL1", "Tình Minh", "Chỗ lõm hơi phía trên khóe mắt trong", "light", 3, LR, ["V01"], { safetyNote: "Sát nhãn cầu: ấn rất nhẹ, không đè vào mắt", sensitive: true }),
  p("ST1", "Thừa Khấp", "Thẳng dưới đồng tử, giữa nhãn cầu và bờ dưới hốc mắt", "light", 3, LR, ["V01"], { safetyNote: "Sát nhãn cầu: ấn rất nhẹ lên bờ xương", sensitive: true }),
];

export const SERVICES: ServiceDef[] = [
  { id: "ch1-basic", name: "Ấn huyệt thư giãn – cơ bản", chapter: 1, unlockChapterDay: 1, basePrice: 100000, kind: "acupressure", pool: { points: ACUPOINTS.map((a) => a.id) }, itemCount: [2, 4], supplies: { I01: 1, I02: 1 }, requiresEquipment: ["E01"], electricityPerUse: 0, durationMin: 30, room: "S02" },
  { id: "ch1-facial", name: "Chăm sóc da mặt cơ bản", chapter: 1, unlockChapterDay: 3, basePrice: 120000, kind: "care", pool: { steps: ["cleanse", "steam", "scrub", "mask"] }, itemCount: [4, 4], supplies: { I01: 2, I04: 1, I05: 1, I06: 1 }, requiresEquipment: ["E01", "E03"], electricityPerUse: 3000, durationMin: 40, room: "S02" },
  { id: "ch1-eye", name: "Ấn huyệt mắt – chuyên sâu", chapter: 1, unlockChapterDay: 5, basePrice: 180000, kind: "acupressure", pool: { points: ACUPOINTS.map((a) => a.id) }, itemCount: [5, 8], supplies: { I01: 1, I02: 1 }, requiresEquipment: ["E01"], electricityPerUse: 0, durationMin: 30, room: "S02" },
];

export const SUPPLIES: SupplyDef[] = [
  { id: "I01", name: "Khăn sạch", packSize: 10, packPrice: 50000, unlockChapter: 1 },
  { id: "I02", name: "Dầu massage", packSize: 10, packPrice: 100000, unlockChapter: 1 },
  { id: "I04", name: "Sữa rửa mặt", packSize: 10, packPrice: 80000, unlockChapter: 1 },
  { id: "I05", name: "Tẩy tế bào chết", packSize: 10, packPrice: 120000, unlockChapter: 1 },
  { id: "I06", name: "Mặt nạ giấy", packSize: 10, packPrice: 200000, unlockChapter: 1 },
];

export const EQUIPMENT: EquipmentDef[] = [
  { id: "E01", name: "Giường spa cơ bản", price: 1500000, maxUses: 300, electricityPerUse: 0, dailyElectricity: 0, effect: { beds: 1 }, art: "E01", unlockChapter: 1, scene: "S02", description: "Giường thứ 2 cần KTV mới dùng song song được" },
  { id: "E03", name: "Máy xông mặt", price: 800000, maxUses: 200, electricityPerUse: 3000, dailyElectricity: 0, effect: {}, art: "E03", unlockChapter: 1, unlockChapterDay: 3, scene: "S02", description: "Bắt buộc cho dịch vụ chăm sóc da" },
  { id: "chair-extra", name: "Ghế chờ thêm", price: 400000, maxUses: 500, electricityPerUse: 0, dailyElectricity: 0, effect: { queueSeats: 1 }, art: "E02", unlockChapter: 1, scene: "S01", description: "+1 chỗ hàng chờ" },
  { id: "E02", name: "Ghế chờ", price: 400000, maxUses: 500, electricityPerUse: 0, dailyElectricity: 0, effect: { queueSeats: 1 }, art: "E02", unlockChapter: 1, scene: "S01", description: "Ghế chờ có sẵn" },
  { id: "E05", name: "Đèn & tinh dầu thơm phòng", price: 300000, maxUses: 9999, electricityPerUse: 0, dailyElectricity: 5000, effect: { tipBonusPct: 5 }, art: "E05", unlockChapter: 1, unlockChapterDay: 6, scene: "S02", description: "Tip +5%. Tốn thêm điện 5.000đ/ngày" },
];

export const STAFF_TIERS: StaffTierDef[] = [
  { role: "ktv", tier: 1, label: "Tập sự", baseWage: 100000, commissionPct: 10, avgStars: 1.5, expToPromote: 30 },
  { role: "ktv", tier: 2, label: "Thạo việc", baseWage: 150000, commissionPct: 15, avgStars: 2, expToPromote: 60 },
  { role: "ktv", tier: 3, label: "Lành nghề", baseWage: 220000, commissionPct: 20, avgStars: 2.5, expToPromote: 9999 },
];

const d = (chapterDay: number, kind: "learn" | "review" | "exam", ids: string[], customers: [number, number], introduce: ChapterDef["days"][number]["introduce"], tips: string[]) =>
  ({ chapterDay, kind, newItems: ids.map((id) => ({ kind: "point" as const, id })), customers, introduce, tips });
export const CHAPTERS: ChapterDef[] = [{
  no: 1, title: "Vùng mắt và trán", region: "eye-forehead",
  days: [
    d(1, "learn", ["GV29", "EX-HN5"], [2, 2], ["billing"], ["Chạm thẻ khách để mời vào giường.", "Sau mỗi ca nhớ bấm “Thu tiền”."]),
    d(2, "learn", ["BL2", "TE23"], [3, 3], ["supplies", "queue"], ["Dầu massage sắp hết – vào Cửa hàng để nhập thêm."]),
    d(3, "learn", ["EX-HN4", "GB14"], [3, 4], ["buy-equipment", "electricity", "depreciation"], ["Dịch vụ chăm sóc da mặt cần máy xông mặt."]),
    d(4, "learn", ["GB1", "ST2"], [4, 4], ["walkout", "complaint", "reputation"], ["Hàng chờ chỉ có 2 ghế."]),
    d(5, "learn", ["BL1", "ST1"], [4, 5], ["hire-ktv", "durability"], ["Không ấn vào nhãn cầu!", "Bảng tuyển dụng KTV đã mở."]),
    d(6, "review", [], [5, 5], ["upgrades"], ["Ngày mai trả tiền thuê."]),
    d(7, "exam", [], [4, 5], [], ["Anh Khôi đến kiểm tra tay nghề."]),
  ],
  exam: { reviewCount: 0, passScore: 80, sessions: 1, requirePregnantCase: false },
  reward: { money: 500000, reputation: 0.2, badge: "badge-ch1" },
  unlocks: { services: [], features: [], supplies: [], equipment: [] },
}];

export const CARE_STEPS: Record<CareStepId, { name: string; instruction: string }> = {
  cleanse: { name: "Rửa mặt", instruction: "" }, steam: { name: "Xông hơi", instruction: "" }, scrub: { name: "Tẩy tế bào chết", instruction: "" },
  mask: { name: "Đắp mặt nạ", instruction: "" }, wet: { name: "Làm ướt", instruction: "" }, shampoo: { name: "Gội", instruction: "" },
  rinse: { name: "Xả", instruction: "" }, dry: { name: "Sấy", instruction: "" }, soak: { name: "Ngâm chân", instruction: "" }, "place-stones": { name: "Đặt đá", instruction: "" },
};

export const MOCK_CONFIG: typeof CONFIG = {
  ...CONFIG, startMoney: 2000000, startReputation: 3, rentPerWeek: 700000,
  baseDailyElectricity: 20000, postJobFee: 50000, adsCostPerDay: 100000,
};
