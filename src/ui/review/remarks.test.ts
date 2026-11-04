import { describe, it, expect } from "vitest";
import type { AcupointDef, MuscleDef } from "@/core/types";
import { buildRemark, summaryLine } from "./remarks";

const pt: AcupointDef = {
  id: "BL1", name: "Tình Minh", region: "eye-forehead", chapter: 1, sides: ["left", "right"], location: "Hõm trong khóe mắt trong",
  force: "light", seconds: 3, technique: "Ấn nhẹ", effects: "", sensitive: true, safetyNote: "Không đè nhãn cầu.", views: ["V01"],
};
const tap = { wrongSide: false, cun: 1.2, dist: 0.07, inside: false, direction: "cao hơn" };

describe("anh Khôi remarks", () => {
  it("position miss: thốn + direction + landmark + force/seconds", () => {
    const r = buildRemark({ item: { kind: "point", def: pt, side: "left" }, issues: ["position"], score: 0, pregnant: false, tap });
    expect(r.problems[0]).toBe("Lần chạm đầu lệch khoảng 1 thốn (cao hơn trên hình) so với huyệt.");
    expect(r.landmark).toBe(pt.location);
    expect(r.howTo).toBe("Lực Nhẹ · giữ 3 giây · Ấn nhẹ");
    expect(r.safety).toContain("nhãn cầu");
  });
  it("wrong side names the customer's side", () => {
    const r = buildRemark({ item: { kind: "point", def: pt, side: "left" }, issues: ["position"], score: 0, pregnant: false, tap: { ...tap, wrongSide: true } });
    expect(r.problems[0]).toMatch(/nhầm sang bên phải của khách/);
  });
  it("forbidden zone + over-force on a sensitive point", () => {
    const r = buildRemark({ item: { kind: "point", def: pt, side: "left" }, issues: ["safety", "position", "force-over"], score: 0, pregnant: false, tap: { ...tap, forbidden: "Không ấn vào nhãn cầu." } });
    expect(r.problems[0]).toMatch(/vùng nguy hiểm: Không ấn vào nhãn cầu/);
    expect(r.problems.some((x) => /Quá lực ở huyệt nhạy cảm/.test(x))).toBe(true);
    expect(r.problems.some((x) => /Có lỗi an toàn/.test(x))).toBe(false);
  });
  it("pregnancy: contraindicated performed / caution skipped", () => {
    const li4 = { ...pt, id: "LI4", name: "Hợp Cốc", sensitive: false, pregnancy: "contraindicated" as const };
    const a = buildRemark({ item: { kind: "point", def: li4, side: "left" }, issues: ["contra-done"], score: 100, pregnant: true, tap });
    expect(a.problems).toEqual(["Khách đang mang thai: Hợp Cốc là huyệt CHỐNG CHỈ ĐỊNH. Lẽ ra em phải bấm “Không làm huyệt này”."]);
    const gb21 = { ...pt, name: "Kiên Tỉnh", sensitive: false, pregnancy: "caution" as const };
    const b = buildRemark({ item: { kind: "point", def: gb21, side: "left" }, issues: ["skip-wrong"], score: 0, pregnant: true });
    expect(b.problems[0]).toMatch(/THẬN TRỌNG/);
  });
  it("reversed swipe + stroke direction", () => {
    const m = { id: "masseter", name: "Cơ cắn", strokeDirection: "Từ cung gò má xuống góc hàm", strokesRequired: 3, location: "Góc hàm" } as MuscleDef;
    const r = buildRemark({ item: { kind: "muscle", def: m, side: "left" }, issues: ["swipe"], score: 40, pregnant: false,
      swipe: { angle: 175, reversed: true, onMuscle: true, stroke: { from: [0, 0], to: [1, 1] }, cun: 0.1, direction: "" }, swipeIssue: "direction" });
    expect(r.problems[0]).toBe("Em vuốt NGƯỢC chiều rồi.");
    expect(r.howTo).toBe("Hướng vuốt: Từ cung gò má xuống góc hàm · 3 lần");
  });
  it("swipe off the muscle reports the offset in thốn", () => {
    const m = { id: "sternocleidomastoid", name: "Cơ ức đòn chũm", strokeDirection: "Từ sau tai xuống hõm ức", strokesRequired: 3, location: "Cổ" } as MuscleDef;
    const out = buildRemark({ item: { kind: "muscle", def: m, side: "left" }, issues: ["swipe"], score: 0, pregnant: false,
      swipe: { angle: 10, reversed: false, onMuscle: false, stroke: { from: [0, 0], to: [1, 1] }, cun: 1.1, direction: "lệch sang phải" }, swipeIssue: "outside" });
    expect(out.problems[0]).toBe("Đường vuốt nằm ngoài cơ ức đòn chũm, lệch khoảng 1 thốn (lệch sang phải trên hình) so với giữa thớ cơ.");
    const on = buildRemark({ item: { kind: "muscle", def: m, side: "left" }, issues: ["swipe"], score: 60, pregnant: false,
      swipe: { angle: 40, reversed: false, onMuscle: true, stroke: { from: [0, 0], to: [1, 1] }, cun: 0.6, direction: "" }, swipeIssue: "direction" });
    expect(on.problems).toEqual(["Em vuốt lệch hướng khoảng 40°.", "Đường vuốt lệch khoảng nửa thốn so với giữa thớ cơ."]);
  });
  it("summary line", () => {
    expect(summaryLine(3, 8, 80, 62.4)).toBe("Sai 3 / 8 mục — cần 80 điểm, bạn được 62");
    expect(summaryLine(1, 8, 80, 40, 2)).toBe("Sai 1 / 8 mục — cần 80 điểm, bạn được 40 · 2 lỗi an toàn");
  });
});
