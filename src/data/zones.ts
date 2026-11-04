/**
 * 15 vùng phản xạ bàn chân — nguồn: docs/CONTENT_ACUPOINTS.md mục H (tham khảo đào tạo, không thuộc chuẩn WHO).
 * id/name/onlyFoot khớp art/views/V12.json. Bàn chân phải ↔ nửa phải cơ thể, bàn chân trái ↔ nửa trái.
 */
import type { ReflexZoneDef } from "@/core/types";

export const REFLEX_ZONES_DATA: ReflexZoneDef[] = [
  { id: "head-brain", name: "Búp ngón cái", bodyArea: "Đầu, não", onlyFoot: null },
  { id: "sinuses", name: "Mặt dưới các ngón chân còn lại", bodyArea: "Xoang", onlyFoot: null },
  { id: "eyes", name: "Chân các ngón 2–3", bodyArea: "Mắt", onlyFoot: null },
  { id: "ears", name: "Chân các ngón 4–5", bodyArea: "Tai", onlyFoot: null },
  { id: "neck-thyroid", name: "Chân ngón cái (cổ ngón cái)", bodyArea: "Cổ, tuyến giáp", onlyFoot: null },
  { id: "chest-lungs", name: "Ụ bàn chân (dưới chân các ngón)", bodyArea: "Ngực, phổi", onlyFoot: null },
  { id: "stomach-pancreas", name: "Giữa vòm bàn chân, phía trên", bodyArea: "Dạ dày, tụy", onlyFoot: "left" },
  { id: "liver-gallbladder", name: "Giữa vòm bàn chân, phía ngoài", bodyArea: "Gan, túi mật", onlyFoot: "right" },
  { id: "spleen", name: "Giữa vòm bàn chân, phía ngoài", bodyArea: "Lách", onlyFoot: "left" },
  { id: "intestines", name: "Giữa vòm bàn chân, phía dưới", bodyArea: "Ruột", onlyFoot: null },
  { id: "kidneys", name: "Giữa vòm, gần mép trong", bodyArea: "Thận", onlyFoot: null },
  { id: "pelvis-sciatic", name: "Gót chân", bodyArea: "Vùng chậu, thần kinh tọa", onlyFoot: null },
  { id: "spine", name: "Mép trong bàn chân (cung trong, từ ngón cái đến gót)", bodyArea: "Cột sống", onlyFoot: null },
  { id: "shoulder", name: "Mép ngoài bàn chân, phía trên", bodyArea: "Vai", onlyFoot: null },
  { id: "knee-hip", name: "Mép ngoài bàn chân, phía dưới", bodyArea: "Đầu gối, hông", onlyFoot: null },
];
