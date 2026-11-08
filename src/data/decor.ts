/** Decorations (Cửa hàng → Trang trí): bought once, placed freely in the lobby / treatment room. Art: art/decor/<id>.svg. */
export type DecorKind = "floor" | "table" | "wall" | "rug";
export interface DecorDef {
  id: string; name: string; price: number;
  /** Ambience points (1–3) the item adds to its area (a 2nd copy of the same item adds 1). */
  beauty: 1 | 2 | 3;
  kind: DecorKind;
  /** Drawn width in scene units (scene frames are 1000 wide); height follows the art's viewBox. */
  w: number;
  /** Drawn height in scene units (art viewBox proportion). */
  h: number;
}
export const DECOR: DecorDef[] = [
  { id: "D01", name: "Chậu trầu bà", price: 180_000, beauty: 1, kind: "floor", w: 110, h: 150 },
  { id: "D02", name: "Cây lưỡi hổ", price: 220_000, beauty: 1, kind: "floor", w: 90, h: 190 },
  { id: "D03", name: "Cây kim tiền", price: 350_000, beauty: 2, kind: "floor", w: 120, h: 200 },
  { id: "D04", name: "Lan hồ điệp", price: 300_000, beauty: 2, kind: "table", w: 80, h: 140 },
  { id: "D05", name: "Bình hoa sen", price: 250_000, beauty: 1, kind: "table", w: 80, h: 170 },
  { id: "D06", name: "Tranh hoa sen", price: 450_000, beauty: 2, kind: "wall", w: 170, h: 120 },
  { id: "D07", name: "Tranh núi sương", price: 450_000, beauty: 2, kind: "wall", w: 180, h: 120 },
  { id: "D08", name: "Đèn lồng giấy", price: 200_000, beauty: 1, kind: "wall", w: 90, h: 150 },
  { id: "D09", name: "Đèn cây vải", price: 600_000, beauty: 2, kind: "floor", w: 90, h: 260 },
  { id: "D10", name: "Khay nến thơm", price: 150_000, beauty: 1, kind: "table", w: 120, h: 70 },
  { id: "D11", name: "Thác nước mini", price: 700_000, beauty: 3, kind: "table", w: 100, h: 110 },
  { id: "D12", name: "Bể cá nhỏ", price: 1_200_000, beauty: 3, kind: "floor", w: 150, h: 170 },
  { id: "D13", name: "Đồng hồ gỗ", price: 250_000, beauty: 1, kind: "wall", w: 90, h: 90 },
  { id: "D14", name: "Thảm tròn", price: 500_000, beauty: 2, kind: "rug", w: 260, h: 80 },
  { id: "D15", name: "Gương tròn mây", price: 400_000, beauty: 2, kind: "wall", w: 110, h: 110 },
  { id: "D16", name: "Mành tre", price: 300_000, beauty: 1, kind: "wall", w: 150, h: 160 },
];
/** Ambience caps and effects (GAME_DESIGN §13). */
export const DECOR_CONFIG = {
  maxScore: 12,
  /** Lobby: + waiting patience (game minutes) per ambience point. */
  lobbyPatiencePerPoint: 1.5,
  /** Treatment room 1: + tip (% of price) per ambience point. */
  roomTipPctPerPoint: 0.6,
  /** Items per area. */
  maxPerArea: 14,
};
