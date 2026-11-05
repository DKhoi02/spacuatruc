/**
 * Content lookups for the treatment minigame. Prefers the real data from "@/data"; falls back to a compact
 * local table + the view JSON (names/notes) so the minigame works standalone while the data agent fills content.
 */
import type { AcupointDef, CareStepId, Force, MuscleDef, ReflexZoneDef, Side, TaskItem, ViewId } from "@/core/types";
import { ACUPOINTS, MUSCLES, REFLEX_ZONES, CARE_STEPS } from "@/data";
import type { ViewData, ViewPoint, ViewMuscle, ViewZone } from "@/ui/art/assets";

// id: [force, seconds, sensitive, pregnancy?, technique?]
type PointRow = [Force, number, boolean, ("contraindicated" | "caution")?, string?];
const POINTS_FALLBACK: Record<string, PointRow> = {
  GV29: ["medium", 4, false], BL2: ["medium", 4, false], "EX-HN4": ["light", 3, false], TE23: ["light", 3, false],
  "EX-HN5": ["medium", 4, false, undefined, "Day tròn nhẹ"], GB14: ["medium", 4, false],
  BL1: ["light", 3, true, undefined, "Ấn nhẹ lên thành xương, hướng ra sau"], GB1: ["light", 3, true],
  ST1: ["light", 3, true, undefined, "Ấn nhẹ lên bờ xương hốc mắt"], ST2: ["light", 3, true], ST3: ["medium", 4, false],
  SI18: ["medium", 4, false], "EX-HN8": ["light", 3, false], LI20: ["light", 3, false], GV26: ["medium", 3, false],
  ST4: ["light", 3, false], CV24: ["light", 3, false], ST5: ["light", 3, true, undefined, "Ấn nhẹ, tránh đè động mạch"],
  ST6: ["medium", 4, false], ST7: ["medium", 4, false], SI19: ["light", 3, false], TE17: ["light", 3, false],
  GV24: ["medium", 4, false], ST8: ["medium", 4, false], GV20: ["medium", 5, false], "EX-HN1": ["medium", 3, false],
  GV16: ["medium", 4, false], GB20: ["medium", 5, false], BL10: ["medium", 4, false], GV14: ["medium", 4, false],
  GB21: ["medium", 5, false, "caution", "Ấn hướng xuống, không ấn sâu"],
  BL11: ["strong", 5, false], BL12: ["strong", 5, false], BL13: ["strong", 5, false], BL17: ["strong", 5, false],
  BL18: ["strong", 5, false], BL20: ["strong", 5, false], BL23: ["strong", 5, false], GV4: ["medium", 4, false],
  LI4: ["strong", 5, false, "contraindicated"], PC8: ["medium", 4, false], PC6: ["medium", 4, false], HT7: ["light", 3, false],
  KI1: ["strong", 5, false], LR3: ["medium", 4, false], KI3: ["medium", 4, false], SP6: ["medium", 4, false, "contraindicated"],
  ST36: ["strong", 5, false],
};
const SAFETY_FALLBACK: Record<string, string> = {
  BL1: "Sát nhãn cầu: ấn rất nhẹ, không đè vào mắt.",
  ST1: "Sát nhãn cầu: ấn rất nhẹ lên bờ xương, không đè vào mắt.",
  GB1: "Gần mắt, ấn nhẹ.", ST2: "Gần mắt, ấn nhẹ.",
  ST5: "Tránh ấn mạnh vào động mạch.", "EX-HN5": "Ấn lực vừa.", TE17: "Ấn nhẹ.",
  GB21: "Thận trọng với phụ nữ mang thai, ấn hướng xuống, không ấn sâu.",
  LI4: "Chống chỉ định với phụ nữ mang thai.", SP6: "Chống chỉ định với phụ nữ mang thai.",
};
const STROKE_FALLBACK: Record<string, string> = {
  frontalis: "Từ lông mày lên chân tóc, đi từ giữa ra hai bên",
  "corrugator-supercilii": "Từ đầu trong lông mày ra ngoài, dọc theo lông mày",
  "orbicularis-oculi": "Theo bờ xương hốc mắt, từ khóe mắt trong ra khóe mắt ngoài",
  temporalis: "Từ trên xuống theo hình quạt, về phía trước tai",
  masseter: "Từ cung gò má xuống góc hàm",
  "zygomaticus-major": "Từ khóe miệng chéo lên xương gò má",
  "zygomaticus-minor": "Từ môi trên chéo lên xương gò má",
  "levator-labii-superioris": "Từ môi trên lên bờ dưới hốc mắt, cạnh cánh mũi",
  "orbicularis-oris": "Từ giữa môi ra hai khóe miệng",
  buccinator: "Từ khóe miệng ngang ra phía tai",
  "depressor-anguli-oris": "Từ bờ hàm dưới lên khóe miệng",
  mentalis: "Từ giữa cằm ra hai bên, dọc theo bờ hàm",
  platysma: "Từ bờ hàm dưới xuống xương đòn, lực nhẹ",
  sternocleidomastoid: "Từ sau tai (mỏm chũm) xuống xương đòn, không đè bờ trước",
  trapezius: "Từ chân tóc gáy xuống, rồi từ gáy ra đỉnh vai",
  "levator-scapulae": "Từ bên cổ xuống góc trên xương bả vai",
};
const CARE_FALLBACK: Record<CareStepId, { name: string; instruction: string }> = {
  cleanse: { name: "Rửa mặt", instruction: "Vuốt nhẹ khắp mặt để tạo bọt rửa mặt" },
  steam: { name: "Xông hơi", instruction: "Giữ ngón để bật máy xông" },
  scrub: { name: "Tẩy tế bào chết", instruction: "Xoa đều lên mặt" },
  mask: { name: "Đắp mặt nạ", instruction: "Vuốt để dán mặt nạ lên mặt" },
  wet: { name: "Làm ướt tóc", instruction: "Vuốt trên tóc để làm ướt" },
  shampoo: { name: "Gội dầu gội", instruction: "Xoa để tạo bọt dầu gội" },
  rinse: { name: "Xả nước", instruction: "Vuốt để xả sạch bọt" },
  dry: { name: "Lau khô", instruction: "Giữ ngón để lau và sấy khô tóc" },
  soak: { name: "Ngâm chân", instruction: "Giữ ngón để ngâm chân nước ấm" },
  "place-stones": { name: "Đặt đá nóng", instruction: "Kéo đá vào đúng vị trí trên lưng" },
};

export const FORCE_LABEL: Record<Force, string> = { light: "Nhẹ", medium: "Vừa", strong: "Mạnh" };

export function sideLabel(side: Side | "left" | "right"): string {
  switch (side) {
    case "left": return "bên trái";
    case "right": return "bên phải";
    case "front": return "điểm trước";
    case "back": return "điểm sau";
    default: return "";
  }
}

export interface PointInfo {
  id: string; name: string; altName?: string; location: string; force: Force; seconds: number; technique: string; effects?: string;
  safetyNote?: string; sensitive: boolean; pregnancy?: "contraindicated" | "caution"; views: ViewId[]; variant?: string;
  def?: AcupointDef;
}

export function pointInfo(id: string, all: ViewData[]): PointInfo {
  const def = ACUPOINTS.find((p) => p.id === id);
  const vp: ViewPoint | undefined = all.flatMap((v) => v.points).find((p) => p.id === id);
  if (def) {
    return { id, name: def.name, altName: def.altName, location: def.location, force: def.force, seconds: def.seconds,
      technique: def.technique, effects: def.effects, safetyNote: def.safetyNote, sensitive: def.sensitive, pregnancy: def.pregnancy,
      views: def.views, variant: def.variant, def };
  }
  const row = POINTS_FALLBACK[id] ?? ["medium", 4, false];
  return {
    id, name: vp?.name ?? id, location: vp?.note ?? "", force: row[0], seconds: row[1], technique: row[4] ?? "Ấn giữ",
    safetyNote: SAFETY_FALLBACK[id], sensitive: row[2], pregnancy: row[3],
    views: all.filter((v) => v.points.some((p) => p.id === id)).map((v) => v.view),
  };
}

export interface MuscleInfo { id: string; name: string; latin?: string; location: string; strokeDirection: string; safetyNote?: string; strokesRequired: number; views: ViewId[]; def?: MuscleDef }

export function muscleInfo(id: string, all: ViewData[]): MuscleInfo {
  const def = MUSCLES.find((m) => m.id === id);
  const vm = all.flatMap((v) => v.muscles).find((m) => m.id === id) as (ViewMuscle & { latin?: string }) | undefined;
  if (def) return { id, name: def.name, latin: def.latin, location: def.location, strokeDirection: def.strokeDirection, safetyNote: def.safetyNote, strokesRequired: def.strokesRequired || 3, views: def.views, def };
  return {
    id, name: vm?.name ?? id, latin: vm?.latin, location: "", strokeDirection: STROKE_FALLBACK[id] ?? "Vuốt theo thớ cơ",
    safetyNote: id === "sternocleidomastoid" ? "Tránh ấn vào động mạch cảnh ở bờ trước cơ." : undefined,
    strokesRequired: 3, views: all.filter((v) => v.muscles.some((m) => m.id === id)).map((v) => v.view),
  };
}

export interface ZoneInfo { id: string; name: string; bodyArea: string; location: string; onlyFoot: "left" | "right" | null; def?: ReflexZoneDef }

export function zoneInfo(id: string, all: ViewData[]): ZoneInfo {
  const def = REFLEX_ZONES.find((z) => z.id === id);
  const vz: ViewZone | undefined = all.flatMap((v) => v.zones ?? []).find((z) => z.id === id);
  const bodyArea = def?.bodyArea ?? vz?.bodyArea ?? id;
  // ReflexZoneDef.name / view json `name` describe the LOCATION on the sole; bodyArea is what the player must find.
  return { id, name: bodyArea, bodyArea, location: def?.name ?? vz?.name ?? "", onlyFoot: def?.onlyFoot ?? vz?.onlyFoot ?? null, def };
}

export function careInfo(id: CareStepId): { name: string; instruction: string } {
  const d = (CARE_STEPS as Partial<typeof CARE_STEPS>)[id];
  return d && d.name ? d : CARE_FALLBACK[id];
}

/** Short ticket label for an item, e.g. "Toản Trúc · trái". */
export function itemLabel(item: TaskItem, all: ViewData[]): { name: string; sub: string } {
  switch (item.kind) {
    case "point": {
      const s = item.side === "center" ? "" : sideLabel(item.side).replace("bên ", "");
      return { name: pointInfo(item.id, all).name, sub: s };
    }
    case "muscle":
      return { name: muscleInfo(item.id, all).name, sub: item.side === "center" ? "" : sideLabel(item.side).replace("bên ", "") };
    case "zone":
      return { name: zoneInfo(item.id, all).name, sub: item.foot === "left" ? "chân trái" : "chân phải" };
    case "step":
      return { name: careInfo(item.id).name, sub: "" };
  }
}

export function itemKeyOf(item: TaskItem): string {
  switch (item.kind) {
    case "point": return "P:" + item.id;
    case "muscle": return "M:" + item.id;
    case "zone": return "Z:" + item.id;
    case "step": return "S:" + item.id;
  }
}
