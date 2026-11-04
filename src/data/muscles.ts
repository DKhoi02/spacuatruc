/**
 * 16 cơ — nguồn: docs/CONTENT_ACUPOINTS.md mục F. id khớp art/views V01/V02/V05/V06.
 * Nguyên tắc vuốt: mặt từ trong ra ngoài, từ dưới lên trên; cổ từ trên xuống về phía xương đòn. Lực vùng mắt và cổ trước luôn nhẹ.
 */
import type { MuscleDef } from "@/core/types";

const LR = ["left", "right"] as MuscleDef["sides"];
const C = ["center"] as MuscleDef["sides"];
const STROKES = 3;

export const MUSCLES_DATA: MuscleDef[] = [
  // ── Chương 3: 12 cơ vùng mặt ──
  {
    id: "frontalis", name: "Cơ trán", latin: "Frontalis (bụng trán của cơ chẩm-trán)", region: "face-muscles", chapter: 3, sides: C,
    location: "Toàn vùng trán", fiberDirection: "Dọc: từ chân tóc xuống lông mày",
    strokeDirection: "Từ lông mày lên chân tóc; chia trán thành dải, đi từ giữa ra hai bên",
    views: ["V01"], strokesRequired: STROKES,
  },
  {
    id: "corrugator-supercilii", name: "Cơ cau mày", latin: "Corrugator supercilii", region: "face-muscles", chapter: 3, sides: LR,
    location: "Đầu trong lông mày, nằm sâu. Gây nếp nhăn dọc giữa hai mày", fiberDirection: "Chéo: từ đầu trong lông mày lên trên, ra ngoài",
    strokeDirection: "Từ đầu trong lông mày ra ngoài, dọc theo lông mày",
    views: ["V01"], strokesRequired: STROKES,
  },
  {
    id: "orbicularis-oculi", name: "Cơ vòng mắt", latin: "Orbicularis oculi", region: "face-muscles", chapter: 3, sides: LR,
    location: "Quanh hốc mắt", fiberDirection: "Vòng tròn quanh mắt",
    strokeDirection: "Theo bờ xương hốc mắt, từ khóe mắt trong ra khóe mắt ngoài (cả bờ trên và bờ dưới), kết thúc ở thái dương. Không vuốt lên mi mắt",
    safetyNote: "Da vùng mắt mỏng, lực rất nhẹ",
    views: ["V01"], strokesRequired: STROKES,
  },
  {
    id: "temporalis", name: "Cơ thái dương", latin: "Temporalis", region: "face-muscles", chapter: 3, sides: LR,
    location: "Vùng thái dương, trên tai", fiberDirection: "Hình quạt, hội tụ xuống dưới cung gò má",
    strokeDirection: "Từ trên xuống theo hình quạt, hướng về phía trước tai",
    views: ["V01", "V02"], strokesRequired: STROKES,
  },
  {
    id: "masseter", name: "Cơ cắn", latin: "Masseter", region: "face-muscles", chapter: 3, sides: LR,
    location: "Từ cung gò má xuống góc hàm. Cơ hay căng khi nghiến răng, stress", fiberDirection: "Gần dọc, hơi chéo xuống và ra sau",
    strokeDirection: "Từ cung gò má xuống góc hàm, theo thớ cơ, để thả lỏng",
    views: ["V01", "V02"], strokesRequired: STROKES,
  },
  {
    id: "buccinator", name: "Cơ mút", latin: "Buccinator", region: "face-muscles", chapter: 3, sides: LR,
    location: "Trong má, nằm sâu", fiberDirection: "Ngang, hướng về khóe miệng",
    strokeDirection: "Từ khóe miệng ngang ra phía tai",
    views: ["V01"], strokesRequired: STROKES,
  },
  {
    id: "zygomaticus-major", name: "Cơ gò má lớn", latin: "Zygomaticus major", region: "face-muscles", chapter: 3, sides: LR,
    location: "Từ xương gò má đến khóe miệng", fiberDirection: "Chéo: từ gò má xuống khóe miệng",
    strokeDirection: "Từ khóe miệng chéo lên xương gò má",
    views: ["V01"], strokesRequired: STROKES,
  },
  {
    id: "zygomaticus-minor", name: "Cơ gò má nhỏ", latin: "Zygomaticus minor", region: "face-muscles", chapter: 3, sides: LR,
    location: "Phía trong cơ gò má lớn, đến môi trên", fiberDirection: "Chéo xuống môi trên",
    strokeDirection: "Từ môi trên chéo lên xương gò má",
    views: ["V01"], strokesRequired: STROKES,
  },
  {
    id: "levator-labii-superioris", name: "Cơ nâng môi trên", latin: "Levator labii superioris", region: "face-muscles", chapter: 3, sides: LR,
    location: "Từ bờ dưới hốc mắt xuống môi trên", fiberDirection: "Dọc",
    strokeDirection: "Từ môi trên lên bờ dưới hốc mắt, cạnh cánh mũi",
    views: ["V01"], strokesRequired: STROKES,
  },
  {
    id: "orbicularis-oris", name: "Cơ vòng miệng", latin: "Orbicularis oris", region: "face-muscles", chapter: 3, sides: C,
    location: "Quanh môi", fiberDirection: "Vòng tròn quanh miệng",
    strokeDirection: "Từ giữa môi ra hai khóe miệng (môi trên và môi dưới)",
    views: ["V01"], strokesRequired: STROKES,
  },
  {
    id: "depressor-anguli-oris", name: "Cơ hạ góc miệng", latin: "Depressor anguli oris", region: "face-muscles", chapter: 3, sides: LR,
    location: "Từ xương hàm dưới lên khóe miệng", fiberDirection: "Từ dưới lên khóe miệng (hình tam giác)",
    strokeDirection: "Từ bờ hàm dưới lên khóe miệng (ngược chiều kéo của cơ, giúp nâng khóe miệng)",
    views: ["V01"], strokesRequired: STROKES,
  },
  {
    id: "mentalis", name: "Cơ cằm", latin: "Mentalis", region: "face-muscles", chapter: 3, sides: LR,
    location: "Vùng cằm", fiberDirection: "Dọc",
    strokeDirection: "Từ giữa cằm ra hai bên, dọc theo bờ hàm",
    views: ["V01"], strokesRequired: STROKES,
  },

  // ── Chương 5: 4 cơ cổ, vai ──
  {
    id: "trapezius", name: "Cơ thang (phần trên)", latin: "Trapezius", region: "neck-shoulder", chapter: 5, sides: LR,
    location: "Gáy và đỉnh vai", fiberDirection: "Từ xương chẩm và cột sống cổ xuống xương đòn, mỏm cùng vai",
    strokeDirection: "Từ chân tóc gáy xuống, rồi từ gáy ra đỉnh vai",
    views: ["V06"], strokesRequired: STROKES,
  },
  {
    id: "levator-scapulae", name: "Cơ nâng vai", latin: "Levator scapulae", region: "neck-shoulder", chapter: 5, sides: LR,
    location: "Bên cổ, dưới cơ thang", fiberDirection: "Từ cột sống cổ C1–C4 xuống góc trên xương bả vai",
    strokeDirection: "Từ bên cổ xuống góc trên xương bả vai",
    views: ["V06"], strokesRequired: STROKES,
  },
  {
    id: "sternocleidomastoid", name: "Cơ ức đòn chũm", latin: "Sternocleidomastoid", region: "neck-shoulder", chapter: 5, sides: LR,
    location: "Hai bên cổ", fiberDirection: "Chéo: từ xương ức, xương đòn lên mỏm chũm sau tai",
    strokeDirection: "Từ sau tai (mỏm chũm) xuống xương đòn, dọc thân cơ, lực nhẹ, không đè bờ trước",
    safetyNote: "Tránh ấn vào động mạch cảnh ở bờ trước cơ",
    views: ["V05"], strokesRequired: STROKES,
  },
  {
    id: "platysma", name: "Cơ bám da cổ", latin: "Platysma", region: "neck-shoulder", chapter: 5, sides: LR,
    location: "Mặt trước cổ, từ ngực lên hàm dưới", fiberDirection: "Từ xương đòn lên bờ hàm dưới",
    strokeDirection: "Từ bờ hàm dưới xuống xương đòn, lực nhẹ",
    safetyNote: "Vùng cổ trước: lực luôn nhẹ",
    views: ["V05"], strokesRequired: STROKES,
  },
];
