/** Builds anh Khôi's short Vietnamese remark for one reviewed exam item (pure; data in, text out). */
import type { AcupointDef, MuscleDef, ReflexZoneDef, Side } from "@/core/types";
import type { ReviewIssue } from "@/core/api";
import { cunText, type SwipeVerdict, type TapVerdict } from "./analyze";

const FORCE = { light: "Nhẹ", medium: "Vừa", strong: "Mạnh" } as const;
const SIDE: Partial<Record<Side, string>> = { left: "bên trái", right: "bên phải", front: "phía trước", back: "phía sau" };

export type ReviewDef =
  | { kind: "point"; def: AcupointDef; side: Side }
  | { kind: "muscle"; def: MuscleDef; side: Side }
  | { kind: "zone"; def: ReflexZoneDef & { location?: string }; foot: "left" | "right" };

export interface Remark {
  /** What went wrong, most important first (anh Khôi speaking to "em"). */
  problems: string[];
  /** Landmark / stroke direction to remember. */
  landmark?: string;
  /** Force · seconds · technique (points) or strokes (muscles). */
  howTo?: string;
  /** Safety note to repeat. */
  safety?: string;
}

export function buildRemark(input: {
  item: ReviewDef; issues: ReviewIssue[]; score: number; pregnant: boolean;
  tap?: TapVerdict | null; swipe?: SwipeVerdict | null; swipeIssue?: "outside" | "direction" | "short";
}): Remark {
  const { item, issues, tap, swipe, pregnant } = input;
  const p: string[] = [];
  const has = (i: ReviewIssue) => issues.includes(i);
  const name = item.def.name;

  if (has("contra-done") && item.kind === "point") {
    p.push(`Khách đang mang thai: ${name} là huyệt CHỐNG CHỈ ĐỊNH. Lẽ ra em phải bấm “Không làm huyệt này”.`);
  }
  if (has("skip-wrong")) {
    p.push(item.kind === "point" && pregnant && item.def.pregnancy === "caution"
      ? `${name} chỉ cần THẬN TRỌNG (ấn nhẹ hơn 1 bậc), không phải bỏ qua.`
      : `Em bỏ qua ${name}, nhưng mục này vẫn phải làm.`);
  }
  if (tap && !has("contra-done") && !has("skip-wrong")) {
    const away = tap.cun != null ? cunText(tap.cun) : null;
    const dir = tap.direction ? ` (${tap.direction} trên hình)` : "";
    if (tap.forbidden) p.push(`Lần chạm đầu rơi vào vùng nguy hiểm: ${tap.forbidden}`);
    if (tap.wrongSide && item.kind === "point") {
      const other = item.side === "left" ? "right" : "left";
      p.push(`Em chạm nhầm sang ${SIDE[other]} của khách. Phiếu ghi ${SIDE[item.side] ?? ""} của khách – trái/phải tính theo người khách, không theo màn hình.`);
    } else if (has("position") && !tap.inside) {
      p.push(away ? `Lần chạm đầu lệch ${away}${dir} so với ${item.kind === "zone" ? "vùng" : "huyệt"}.` : `Lần chạm đầu lệch khỏi ${item.kind === "zone" ? "vùng" : "huyệt"}${dir}.`);
    } else if (has("position-near")) {
      p.push(`Gần đúng rồi nhưng chưa vào giữa huyệt${away && tap.cun! >= 0.4 ? ` (lệch ${away})` : ""}. Tìm đúng mốc để chạm trúng tâm.`);
    }
  } else if (!tap && (has("position") || has("position-near")) && !has("contra-done")) {
    p.push(has("position") ? `Lần chạm đầu chưa đúng ${item.kind === "zone" ? "vùng" : "huyệt"}.` : "Gần đúng rồi nhưng chưa vào giữa huyệt.");
  }
  if (has("swipe") && item.kind === "muscle") {
    const why = input.swipeIssue;
    // how far the swipe ran from the muscle's centre line (in thốn when the view has a scale)
    const off = swipe?.cun != null && swipe.cun >= 0.4 ? `lệch ${cunText(swipe.cun)}${swipe.direction ? ` (${swipe.direction} trên hình)` : ""} so với giữa thớ cơ` : "";
    if (why === "outside" || (swipe && !swipe.onMuscle)) p.push(`Đường vuốt nằm ngoài ${name.toLowerCase()}${off ? `, ${off}` : ""}.`);
    else {
      if (swipe?.reversed) p.push("Em vuốt NGƯỢC chiều rồi.");
      else if (why === "direction" && swipe) p.push(`Em vuốt lệch hướng khoảng ${swipe.angle}°.`);
      else if (why === "short") p.push("Đường vuốt ngắn quá, vuốt hết chiều dài thớ cơ.");
      else p.push("Vuốt chưa thật chuẩn hướng và độ dài.");
      if (off) p.push(`Đường vuốt ${off}.`);
    }
  }
  if (item.kind === "point" && !has("contra-done")) {
    const sens = item.def.sensitive || (pregnant && item.def.pregnancy === "caution");
    if (has("force-over")) p.push(sens ? `Quá lực ở huyệt nhạy cảm${pregnant && item.def.pregnancy === "caution" ? " (thai phụ phải nhẹ hơn 1 bậc)" : ""}!` : "Ấn mạnh quá, khách bị đau.");
    else if (has("force-under")) p.push(`Kim lực chưa giữ được ở vùng ${FORCE[item.def.force]}.`);
  }
  if (has("safety") && !p.some((x) => /nguy hiểm|nhạy cảm|CHỐNG/.test(x))) p.push("Có lỗi an toàn ở mục này.");
  if (!p.length) p.push(input.score < 70 ? "Mục này chưa đạt." : "Gần đạt, cần chắc tay hơn.");

  const out: Remark = { problems: p };
  if (item.kind === "point") {
    out.landmark = item.def.location;
    const force = pregnant && item.def.pregnancy === "caution"
      ? `${FORCE[item.def.force]} → thai phụ: nhẹ hơn 1 bậc` : FORCE[item.def.force];
    out.howTo = `Lực ${force} · giữ ${item.def.seconds} giây${item.def.technique ? ` · ${item.def.technique}` : ""}`;
    const preg = pregnant && item.def.pregnancy === "contraindicated" && !/thai/i.test(item.def.safetyNote ?? "") ? "Chống chỉ định với thai phụ." : "";
    const sn = [item.def.safetyNote, preg].filter(Boolean).join(" ");
    if (sn) out.safety = sn;
  } else if (item.kind === "muscle") {
    out.landmark = item.def.location;
    out.howTo = `Hướng vuốt: ${item.def.strokeDirection} · ${item.def.strokesRequired} lần`;
    if (item.def.safetyNote) out.safety = item.def.safetyNote;
  } else {
    out.landmark = item.def.location || item.def.bodyArea;
    out.howTo = `Bàn chân ${item.foot === "left" ? "trái" : "phải"} · tương ứng ${item.def.bodyArea}`;
  }
  return out;
}

/** "Sai X / Y mục — cần 80 điểm, bạn được Z" */
export function summaryLine(wrong: number, total: number, pass: number, score: number, safety = 0): string {
  return `Sai ${wrong} / ${total} mục — cần ${pass} điểm, bạn được ${Math.round(score)}${safety > 0 ? ` · ${safety} lỗi an toàn` : ""}`;
}
