/**
 * Vật tư, đồ dùng, bậc nhân viên.
 * Nguồn: docs/CHAPTER_1.md §4, docs/CHAPTERS.md (quản lý mới mỗi chương), docs/GAME_DESIGN.md §7.3–7.5, docs/ART_ASSETS.md §4–5.
 * Giá trị không có trong tài liệu (đề xuất, cân bằng khi chơi thử): I03, I07, I08; E04/E05 độ bền; E06–E10, vip-room
 * (trừ giá ghế gội 1.200k); lương lễ tân, tạp vụ; expToPromote.
 * Khấu hao mỗi lần dùng = price ÷ maxUses (E01 5.000đ, E03 4.000đ, E02 800đ — khớp CHAPTER_1.md).
 */
import type { EquipmentDef, StaffTierDef, SupplyDef } from "@/core/types";

export const SUPPLIES_DATA: SupplyDef[] = [
  { id: "I01", name: "Khăn sạch (đã gồm giặt)", packSize: 10, packPrice: 50_000, unlockChapter: 1 },
  { id: "I02", name: "Dầu massage thường", packSize: 10, packPrice: 100_000, unlockChapter: 1 },
  { id: "I03", name: "Dầu massage cao cấp", packSize: 10, packPrice: 180_000, unlockChapter: 3 },
  { id: "I04", name: "Sữa rửa mặt", packSize: 10, packPrice: 80_000, unlockChapter: 1 },
  { id: "I05", name: "Tẩy tế bào chết", packSize: 10, packPrice: 120_000, unlockChapter: 1 },
  { id: "I06", name: "Mặt nạ giấy", packSize: 10, packPrice: 200_000, unlockChapter: 1 },
  { id: "I07", name: "Dầu gội", packSize: 10, packPrice: 80_000, unlockChapter: 2 },
  { id: "I08", name: "Dầu xả", packSize: 10, packPrice: 80_000, unlockChapter: 2 },
];

/**
 * Ghi chú cho core:
 * - E02 là "Ghế chờ" (có sẵn 2 cái từ đầu, mua thêm +1 chỗ). Không dùng id "chair-extra" (slot cảnh chỉ nhận E02).
 * - `upgradePrice`: giá gốc để tính tiền nâng cấp (mặc định = price). Chỉnh theo mô phỏng 04/11/2026 để mỗi lần nâng cấp
 *   hoàn vốn khoảng 3–7 tuần ở tiệm đông khách: đồ rẻ mà khách dùng nhiều (gua sha, ghế ngâm chân) nâng cấp đắt hơn giá mua,
 *   máy ít khách dùng (máy xông, bình nước nóng, đá nóng) nâng cấp rẻ hơn.
 * - GAME_DESIGN §12.2: mọi đồ (trừ Phòng VIP) có 3 cấp Thường → Tốt → Cao cấp (OwnedEquipment.tier, CONFIG.equipmentTiers).
 *   "Nệm giường êm" (E04) cũ nay là nâng cấp giường lên cấp Tốt; giường cấp ≥2 vẽ bằng art E01-upgraded.
 * - vip-room: nâng cấp 1 giường thành phòng riêng (cảnh S03). Không có cấp: bản thân nó đã là phòng cao cấp
 *   (khách VIP trả ×1,5, tip +15%), nên không nâng thêm.
 */
export const EQUIPMENT_DATA: EquipmentDef[] = [
  {
    id: "E01", name: "Giường spa cơ bản", price: 1_500_000, maxUses: 300, electricityPerUse: 0, dailyElectricity: 0,
    effect: { beds: 1 }, art: "E01", unlockChapter: 1, unlockChapterDay: 3, scene: "S02",
    description: "Thêm 1 giường. Giường thứ 2 cần KTV mới dùng song song được.",
  },
  {
    id: "E02", name: "Ghế chờ", price: 400_000, maxUses: 500, electricityPerUse: 0, dailyElectricity: 0,
    effect: { queueSeats: 1 }, art: "E02", unlockChapter: 1, unlockChapterDay: 3, scene: "S01",
    description: "+1 chỗ ngồi ở hàng chờ, ít khách bỏ về hơn.",
  },
  {
    id: "E03", name: "Máy xông mặt", price: 800_000, maxUses: 200, electricityPerUse: 3_000, dailyElectricity: 0,
    effect: {}, art: "E03", unlockChapter: 1, unlockChapterDay: 3, scene: "S02", upgradePrice: 500_000,
    description: "Bắt buộc cho dịch vụ chăm sóc da mặt. Điện 3.000đ mỗi lần dùng.",
  },
  {
    id: "E05", name: "Đèn & tinh dầu thơm phòng", price: 300_000, maxUses: 1_000, electricityPerUse: 0, dailyElectricity: 5_000,
    effect: { tipBonusPct: 5 }, art: "E05", unlockChapter: 1, unlockChapterDay: 6, scene: "S02",
    description: "Phòng thơm, ánh sáng dịu: tip +5%. Tốn thêm điện 5.000đ mỗi ngày.",
  },
  {
    id: "E06", name: "Ghế gội đầu", price: 1_200_000, maxUses: 400, electricityPerUse: 0, dailyElectricity: 0,
    effect: {}, art: "E06", unlockChapter: 2, unlockChapterDay: 1, scene: "S04", upgradePrice: 900_000,
    description: "Bắt buộc cho dịch vụ gội đầu.",
  },
  {
    id: "E07", name: "Bộ đá gua sha", price: 250_000, maxUses: 150, electricityPerUse: 0, dailyElectricity: 0,
    effect: {}, art: "E07", unlockChapter: 3, unlockChapterDay: 4, scene: "S02", upgradePrice: 800_000,
    description: "Bắt buộc cho dịch vụ Gua sha mặt. Đá có thể mẻ sau nhiều lần dùng.",
  },
  {
    id: "vip-room", name: "Phòng VIP", price: 4_500_000, maxUses: 500, electricityPerUse: 0, dailyElectricity: 10_000,
    effect: { tipBonusPct: 15, complaintChanceDelta: -0.05 }, art: "E01-upgraded", unlockChapter: 3, unlockChapterDay: 3,
    scene: "S03", noTiers: true,
    description: "Nâng cấp 1 giường thành phòng riêng. Khách VIP chỉ vào phòng VIP và trả cao hơn. Điện 10.000đ/ngày.",
  },
  {
    id: "E08", name: "Bình nước nóng", price: 1_500_000, maxUses: 400, electricityPerUse: 8_000, dailyElectricity: 0,
    effect: {}, art: "E08", unlockChapter: 4, unlockChapterDay: 2, scene: "S04", upgradePrice: 700_000,
    description: "Bắt buộc cho gội đầu dưỡng sinh. Tốn điện lớn: 8.000đ mỗi lần dùng.",
  },
  {
    id: "E09", name: "Đá nóng + máy hâm đá", price: 1_800_000, maxUses: 300, electricityPerUse: 6_000, dailyElectricity: 0,
    effect: {}, art: "E09", unlockChapter: 7, unlockChapterDay: 3, scene: "S03", upgradePrice: 1_000_000,
    description: "Bắt buộc cho dịch vụ chườm đá nóng. Điện 6.000đ mỗi lần hâm đá.",
  },
  {
    id: "E10", name: "Ghế ngâm chân", price: 1_000_000, maxUses: 300, electricityPerUse: 3_000, dailyElectricity: 0,
    effect: {}, art: "E10", unlockChapter: 8, unlockChapterDay: 1, scene: "S05", upgradePrice: 2_500_000,
    description: "Bắt buộc cho bấm huyệt chân và phản xạ bàn chân. Điện 3.000đ mỗi lần làm nóng nước.",
  },
];

/** Lễ tân / tạp vụ: lương hạ ở đợt cân bằng 04/11/2026 (lễ tân 80/110/140k → 70/90/110k, tạp vụ 60/80/100k → 50/65/80k):
 *  chỉ đáng thuê khi người chơi không kịp làm hết khách (thời gian người chơi là điểm nghẽn). */
export const STAFF_TIERS_DATA: StaffTierDef[] = [
  { role: "ktv", tier: 1, label: "Tập sự", baseWage: 100_000, commissionPct: 10, avgStars: 1.5, expToPromote: 30 },
  { role: "ktv", tier: 2, label: "Thạo việc", baseWage: 150_000, commissionPct: 15, avgStars: 2, expToPromote: 60 },
  { role: "ktv", tier: 3, label: "Lành nghề", baseWage: 220_000, commissionPct: 20, avgStars: 2.5, expToPromote: 0 },
  { role: "receptionist", tier: 1, label: "Lễ tân mới", baseWage: 70_000, commissionPct: 0, avgStars: 0, expToPromote: 30 },
  { role: "receptionist", tier: 2, label: "Lễ tân thạo việc", baseWage: 90_000, commissionPct: 0, avgStars: 0, expToPromote: 60 },
  { role: "receptionist", tier: 3, label: "Lễ tân chuyên nghiệp", baseWage: 110_000, commissionPct: 0, avgStars: 0, expToPromote: 0 },
  { role: "cleaner", tier: 1, label: "Tạp vụ mới", baseWage: 50_000, commissionPct: 0, avgStars: 0, expToPromote: 30 },
  { role: "cleaner", tier: 2, label: "Tạp vụ thạo việc", baseWage: 65_000, commissionPct: 0, avgStars: 0, expToPromote: 60 },
  { role: "cleaner", tier: 3, label: "Tạp vụ chăm chỉ", baseWage: 80_000, commissionPct: 0, avgStars: 0, expToPromote: 0 },
];
