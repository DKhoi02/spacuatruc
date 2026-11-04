/**
 * DEV ONLY — standalone test page for <TreatmentSession>. Open /treatment-dev.html.
 * URL params (all optional): preset, hint (0–4), force (0/1), patience (0/1), pregnant (0/1), exam (0/1), ch (1–8),
 * items ("P:BL2:left,M:masseter:right,Z:kidneys:left,S:cleanse"), char (character id), start=1 (mount immediately).
 */
import "@/styles/global.css";
import { render } from "preact";
import { useState } from "preact/hooks";
import type { ChapterNo, Customer, ServiceDef, TaskItem, TreatmentConfig, TreatmentResult, Side, CareStepId } from "@/core/types";
import { TreatmentSession } from "./index";

interface Preset { label: string; ch: ChapterNo; hint: number; force: boolean; patience: boolean; pregnant?: boolean; exam?: boolean; char: string; service: string; items: string }

const PRESETS: Record<string, Preset> = {
  ch1: { label: "Ch1 · huyệt mặt (thẻ giới thiệu)", ch: 1, hint: 0, force: false, patience: false, char: "khach-mai", service: "Ấn huyệt thư giãn cơ bản", items: "P:GV29:center,P:BL2:left,P:BL2:right,P:EX-HN5:left" },
  force: { label: "Ch2 · thanh lực + nghiêng", ch: 2, hint: 1, force: true, patience: true, char: "khach-hoa", service: "Ấn huyệt mặt toàn diện", items: "P:ST7:right,P:SI19:left,P:BL1:left,P:ST6:right" },
  muscle: { label: "Ch3 · vuốt cơ mặt", ch: 3, hint: 0, force: false, patience: true, char: "khach-bich", service: "Xả cơ mặt", items: "M:frontalis:center,M:masseter:right,M:temporalis:left,M:zygomaticus-major:left" },
  head: { label: "Ch4 · đỉnh đầu + gáy", ch: 4, hint: 2, force: true, patience: true, char: "khach-tuan", service: "Gội đầu dưỡng sinh", items: "S:wet,P:GV20:center,P:EX-HN1:front,P:GB20:right,S:shampoo,S:rinse,S:dry" },
  neck: { label: "Ch5 · cổ vai", ch: 5, hint: 1, force: true, patience: true, char: "dacbiet-van-phong", service: "Massage cổ vai gáy", items: "M:sternocleidomastoid:left,P:GV14:center,M:trapezius:right,P:GB21:left" },
  back: { label: "Ch7 · lưng", ch: 7, hint: 2, force: true, patience: true, char: "khach-linh", service: "Massage body", items: "P:BL23:left,P:GV4:center,P:BL17:right,M:levator-scapulae:left" },
  hand: { label: "Ch6 · tay (lật hình)", ch: 6, hint: 1, force: true, patience: true, char: "khach-phuong", service: "Massage tay", items: "P:LI4:left,P:LI4:right,P:PC6:left,P:HT7:right" },
  foot: { label: "Ch8 · bàn chân + phản xạ", ch: 8, hint: 1, force: true, patience: true, char: "khach-hang", service: "Bấm huyệt chân", items: "Z:kidneys:left,Z:stomach-pancreas:left,Z:liver-gallbladder:right,P:KI1:left,P:SP6:right,P:ST36:left" },
  care: { label: "Chăm sóc da mặt", ch: 1, hint: 3, force: false, patience: false, char: "khach-yen", service: "Chăm sóc da mặt cơ bản", items: "S:cleanse,S:steam,S:scrub,S:mask" },
  stones: { label: "Chườm đá nóng", ch: 7, hint: 3, force: false, patience: true, char: "quen-thu", service: "Chườm đá nóng", items: "S:place-stones,S:soak" },
  pregnant: { label: "Thai phụ · chống chỉ định", ch: 6, hint: 2, force: true, patience: true, pregnant: true, char: "dacbiet-mang-thai", service: "Massage tay", items: "P:GB21:left,P:LI4:right,P:PC6:left,P:SP6:left" },
  exam: { label: "Bài kiểm tra (gợi ý 3)", ch: 1, hint: 3, force: false, patience: false, exam: true, char: "anh-khoi", service: "Kiểm tra chương 1", items: "P:GV29:center,P:BL2:right,P:TE23:left,P:GB14:right" },
};

function parseItems(s: string): TaskItem[] {
  return s.split(",").map((t) => t.trim()).filter(Boolean).map((t): TaskItem => {
    const [k, id, side] = t.split(":");
    if (k === "M") return { kind: "muscle", id, side: (side || "center") as Side };
    if (k === "Z") return { kind: "zone", id, foot: (side || "right") as "left" | "right" };
    if (k === "S") return { kind: "step", id: id as CareStepId };
    return { kind: "point", id, side: (side || "center") as Side };
  });
}

function buildConfig(o: { ch: number; hint: number; force: boolean; patience: boolean; pregnant: boolean; exam: boolean; char: string; service: string; items: string }): TreatmentConfig {
  const items = parseItems(o.items);
  const customer: Customer = {
    id: "dev-" + Date.now(), characterId: o.char, name: o.pregnant ? "Chị Thảo (thai phụ)" : nameOf(o.char), serviceId: "dev",
    items, regular: false, arriveAt: 540, patience: 45, checkedIn: true, durationMin: 30,
    ...(o.pregnant ? { health: { id: "pregnant" as const, label: "Đang mang thai 4 tháng" }, special: "pregnant" as const } : {}),
  };
  const service: ServiceDef = {
    id: "dev", name: o.service, chapter: o.ch as ChapterNo, unlockChapterDay: 1, basePrice: 100000, kind: "mixed", pool: {},
    itemCount: [items.length, items.length], supplies: {}, requiresEquipment: [], electricityPerUse: 0, durationMin: 30, room: "S02",
  };
  return {
    customer, service, chapter: o.ch as ChapterNo, useForceBar: o.force, usePatience: o.patience,
    hintLevel: () => Math.max(0, Math.min(4, o.hint)) as 0 | 1 | 2 | 3 | 4, examMode: o.exam,
  };
}

function nameOf(char: string) {
  const n = char.replace(/^(khach|quen|dacbiet)-/, "").replace(/-/g, " ");
  return "Khách " + n.charAt(0).toUpperCase() + n.slice(1);
}

const qs = new URLSearchParams(location.search);
const initPreset = PRESETS[qs.get("preset") ?? "ch1"] ?? PRESETS.ch1;
const bool = (k: string, d: boolean) => (qs.has(k) ? qs.get(k) === "1" : d);

function Dev() {
  const [opts, setOpts] = useState({
    preset: qs.get("preset") ?? "ch1",
    ch: Number(qs.get("ch") ?? initPreset.ch),
    hint: Number(qs.get("hint") ?? initPreset.hint),
    force: bool("force", initPreset.force),
    patience: bool("patience", initPreset.patience),
    pregnant: bool("pregnant", !!initPreset.pregnant),
    exam: bool("exam", !!initPreset.exam),
    char: qs.get("char") ?? initPreset.char,
    service: initPreset.service,
    items: qs.get("items") ?? initPreset.items,
  });
  const [cfg, setCfg] = useState<TreatmentConfig | null>(() => (qs.get("start") === "1" ? buildConfig(opts) : null));
  const [result, setResult] = useState<TreatmentResult | "aborted" | null>(null);

  const pick = (key: string) => {
    const p = PRESETS[key];
    setOpts({ preset: key, ch: p.ch, hint: p.hint, force: p.force, patience: p.patience, pregnant: !!p.pregnant, exam: !!p.exam, char: p.char, service: p.service, items: p.items });
  };

  if (cfg) {
    return <TreatmentSession config={cfg} onFinish={(r) => { setResult(r); setCfg(null); }} onAbort={() => { setResult("aborted"); setCfg(null); }} />;
  }
  const row = { display: "flex", gap: 8, alignItems: "center", margin: "8px 0", fontSize: 15 } as const;
  const inp = { font: "inherit", padding: "8px 10px", borderRadius: 10, border: "2px solid #c49a70", background: "#fffaf3" } as const;
  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto", color: "#3d2c25" }}>
      <h2 style={{ margin: "4px 0 10px" }}>Treatment dev</h2>
      <div style={row}>
        <select style={{ ...inp, flex: 1 }} value={opts.preset} onChange={(e) => pick((e.target as HTMLSelectElement).value)}>
          {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
        </select>
      </div>
      <div style={row}>
        Chương <input style={{ ...inp, width: 60 }} type="number" min={1} max={8} value={opts.ch} onInput={(e) => setOpts({ ...opts, ch: Number((e.target as HTMLInputElement).value) })} />
        Gợi ý <select style={inp} value={opts.hint} onChange={(e) => setOpts({ ...opts, hint: Number((e.target as HTMLSelectElement).value) })}>
          {[0, 1, 2, 3, 4].map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      {(["force", "patience", "pregnant", "exam"] as const).map((k) => (
        <label key={k} style={row}><input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: (e.target as HTMLInputElement).checked })} />
          {{ force: "Thanh lực", patience: "Kiên nhẫn", pregnant: "Khách mang thai", exam: "Chế độ thi" }[k]}</label>
      ))}
      <div style={row}>Nhân vật <input style={{ ...inp, flex: 1 }} value={opts.char} onInput={(e) => setOpts({ ...opts, char: (e.target as HTMLInputElement).value })} /></div>
      <div style={{ fontSize: 13, color: "#8a5f4b" }}>Phiếu (P:id:side, M:id:side, Z:id:foot, S:step)</div>
      <textarea style={{ ...inp, width: "100%", height: 80 }} value={opts.items} onInput={(e) => setOpts({ ...opts, items: (e.target as HTMLTextAreaElement).value })} />
      <button style={{ ...inp, width: "100%", marginTop: 10, background: "#8fb39a", color: "#fff", fontWeight: 700, minHeight: 48 }} onClick={() => { setResult(null); setCfg(buildConfig(opts)); }}>Bắt đầu ca</button>
      {result && <pre style={{ fontSize: 11.5, background: "#f4e6d6", padding: 10, borderRadius: 10, overflow: "auto", maxHeight: 340 }}>{JSON.stringify(result, null, 1)}</pre>}
    </div>
  );
}

render(<Dev />, document.getElementById("app")!);
