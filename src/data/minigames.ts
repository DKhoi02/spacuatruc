/**
 * Content for the care mini-games (docs/CONTENT_MINIGAMES.md — needs the owner's review like CONTENT_ACUPOINTS):
 *  - Đắp mặt nạ: read the customer's skin type → choose a mask → sheet (tear + align) or powder (mix + brush).
 *  - Pha dầu massage: read the customer's need → choose an essential oil → drop the right number of drops.
 * Scores are 0–100 per choice; the step's item score mixes choice and execution.
 */

export type SkinTypeId = "dry" | "oily" | "combination" | "sensitive" | "acne";
export interface SkinType { id: SkinTypeId; name: string; signs: string }
export const SKIN_TYPES: SkinType[] = [
  { id: "dry", name: "Da khô", signs: "Da căng, bong vảy nhẹ ở má, ít dầu, sờ thấy thô ráp." },
  { id: "oily", name: "Da dầu", signs: "Bóng nhờn khắp mặt, lỗ chân lông to, dễ bít tắc." },
  { id: "combination", name: "Da hỗn hợp", signs: "Vùng chữ T (trán, mũi, cằm) bóng dầu, hai má thường hoặc hơi khô." },
  { id: "sensitive", name: "Da nhạy cảm", signs: "Dễ đỏ, châm chích khi đổi mỹ phẩm, có mao mạch li ti ở má." },
  { id: "acne", name: "Da mụn", signs: "Có mụn viêm đỏ và mụn ẩn rải rác, da hơi dầu." },
];

export type MaskId = "ha-sheet" | "aloe-sheet" | "clay" | "alginate";
export interface MaskDef {
  id: MaskId; name: string; form: "sheet" | "powder"; short: string;
  /** Powder masks: water per scoop of powder that gives the right paste, and the acceptable band. */
  mix?: { ideal: number; min: number; max: number; texture: string };
  /** Alginate sets fast: seconds to finish brushing after mixing before it starts to set. */
  setsIn?: number;
}
export const MASKS: MaskDef[] = [
  { id: "ha-sheet", name: "Mặt nạ giấy cấp ẩm (HA)", form: "sheet", short: "Cấp nước, làm mềm da khô, da thiếu ẩm." },
  { id: "aloe-sheet", name: "Mặt nạ giấy lô hội – rau má", form: "sheet", short: "Làm dịu, giảm đỏ cho da nhạy cảm, da mụn viêm." },
  { id: "clay", name: "Mặt nạ bột đất sét (kaolin)", form: "powder", short: "Hút dầu thừa, làm sạch lỗ chân lông cho da dầu, da mụn.",
    mix: { ideal: 1, min: 1, max: 1, texture: "sệt như sữa chua đặc" } },
  { id: "alginate", name: "Mặt nạ bột dẻo (tảo alginate)", form: "powder", short: "Cấp ẩm, làm dịu, hợp hầu hết loại da; đông nhanh nên phải đắp ngay.",
    mix: { ideal: 3, min: 3, max: 3, texture: "sệt mịn, không vón cục" }, setsIn: 25 },
];

/** How well each mask suits each skin type (100 best · 70–85 fine · ≤40 wrong choice). */
export const MASK_FIT: Record<SkinTypeId, Record<MaskId, number>> = {
  dry: { "ha-sheet": 100, alginate: 85, "aloe-sheet": 70, clay: 30 },
  oily: { clay: 100, alginate: 70, "aloe-sheet": 70, "ha-sheet": 50 },
  combination: { alginate: 100, clay: 70, "ha-sheet": 70, "aloe-sheet": 70 },
  sensitive: { "aloe-sheet": 100, alginate: 85, "ha-sheet": 70, clay: 30 },
  acne: { "aloe-sheet": 100, clay: 85, alginate: 70, "ha-sheet": 50 },
};
/** Why a low-fit choice is wrong (shown by anh Khôi's tip). */
export const MASK_WHY: Partial<Record<SkinTypeId, Partial<Record<MaskId, string>>>> = {
  dry: { clay: "Đất sét hút dầu, da khô sẽ càng căng rát. Da khô cần cấp ẩm (HA)." },
  sensitive: { clay: "Đất sét làm khô và dễ gây đỏ da nhạy cảm. Chọn loại làm dịu (lô hội – rau má)." },
  oily: { "ha-sheet": "Mặt nạ cấp ẩm không sai, nhưng da dầu cần hút dầu thừa (đất sét) hơn." },
  acne: { "ha-sheet": "Da mụn viêm cần làm dịu và kiểm soát dầu (lô hội – rau má hoặc đất sét)." },
};

export type NeedId = "sleep" | "sore" | "cold" | "tired" | "stress";
export interface NeedDef { id: NeedId; label: string; complaint: string }
export const NEEDS: NeedDef[] = [
  { id: "sleep", label: "Khó ngủ", complaint: "Dạo này em khó ngủ, nằm mãi mới thiếp đi." },
  { id: "sore", label: "Đau mỏi cơ", complaint: "Vai lưng em mỏi nhừ, cứng đơ cả người." },
  { id: "cold", label: "Nghẹt mũi, cảm lạnh", complaint: "Em đang hơi cảm, nghẹt mũi khó chịu." },
  { id: "tired", label: "Uể oải, thiếu năng lượng", complaint: "Em thấy uể oải, làm gì cũng không có sức." },
  { id: "stress", label: "Căng thẳng, lo âu", complaint: "Công việc căng quá, đầu óc lúc nào cũng căng." },
];

export type OilId = "lavender" | "peppermint" | "eucalyptus" | "ginger" | "orange" | "lemongrass";
export interface OilDef { id: OilId; name: string; color: string; short: string; /** Not for faces (strong / irritating). */ noFace?: boolean }
export const OILS: OilDef[] = [
  { id: "lavender", name: "Oải hương", color: "#a99bd6", short: "Thư giãn, dễ ngủ, dịu thần kinh." },
  { id: "peppermint", name: "Bạc hà", color: "#7fc4a6", short: "Mát lạnh, thông mũi, tỉnh táo. Mạnh — tránh vùng mắt.", noFace: true },
  { id: "eucalyptus", name: "Khuynh diệp", color: "#8fc0c9", short: "Thông mũi, dễ thở khi cảm lạnh.", noFace: true },
  { id: "ginger", name: "Gừng", color: "#e0a45a", short: "Làm ấm, giảm đau mỏi cơ.", noFace: true },
  { id: "orange", name: "Cam ngọt", color: "#f2a65a", short: "Tươi vui, nâng tinh thần, giảm căng thẳng." },
  { id: "lemongrass", name: "Sả chanh", color: "#c9d46a", short: "Sảng khoái, giảm mỏi cơ, đuổi muỗi. Dễ kích ứng da nhạy cảm.", noFace: true },
];
export const OIL_FIT: Record<NeedId, Partial<Record<OilId, number>>> = {
  sleep: { lavender: 100, orange: 70 },
  sore: { ginger: 100, lemongrass: 85, peppermint: 70, eucalyptus: 70 },
  cold: { eucalyptus: 100, peppermint: 85, ginger: 70 },
  tired: { orange: 100, peppermint: 85, lemongrass: 85 },
  stress: { lavender: 100, orange: 100 },
};
/** Wrong-oil score when not listed in OIL_FIT. */
export const OIL_WRONG = 30;

/**
 * Dilution in a 30 ml bowl of carrier oil (1 drop ≈ 0.05 ml): body 2% ≈ 12 drops; face, elderly or sensitive skin
 * 1% ≈ 6 drops; pregnant customers: carrier oil only (0 drops — the spa's safe rule).
 */
export const DILUTION = {
  bowlMl: 30,
  body: { min: 10, max: 12, label: "Cơ thể (2%): 10–12 giọt / 30 ml" },
  gentle: { min: 5, max: 6, label: "Mặt, người cao tuổi, da nhạy cảm (1%): 5–6 giọt / 30 ml" },
  pregnant: { min: 0, max: 0, label: "Thai phụ: chỉ dùng dầu nền, không nhỏ tinh dầu" },
  /** Drops at or above this many × the max are an overdose → safety error (skin irritation). */
  overdoseFactor: 2,
};
