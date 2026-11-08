/**
 * Pha dầu massage mini-game (care step "blend-oil"): listen to the customer's need → pick an essential oil (or carrier
 * oil only) → tap the bottle to drop it into a 30 ml bowl of carrier oil → "Pha xong".
 * Score = 60% oil choice + 40% drops in the dilution range. Overdose (≥ 2× max) or essential oil for a pregnant
 * customer = safety error.
 */
import { useEffect, useMemo, useState } from "preact/hooks";
import { DILUTION, OIL_FIT, OIL_WRONG, OILS, type OilDef } from "@/data/minigames";
import type { TaskCtx } from "./common";
import { gentleOil, isPregnant, needOf } from "./traits";
import { playSound } from "./sound";

type Phase = "listen" | "drops" | "done";

export function OilTask({ ctx }: { ctx: TaskCtx }) {
  const c = ctx.config.customer;
  const need = useMemo(() => needOf(c), [c.id]);
  const pregnant = isPregnant(c);
  const face = /mat/.test(ctx.config.service.id);
  const range = pregnant ? DILUTION.pregnant : gentleOil(c, ctx.config.service.id) ? DILUTION.gentle : DILUTION.body;
  const [phase, setPhase] = useState<Phase>("listen");
  const [oil, setOil] = useState<OilDef | null>(null);
  const [drops, setDrops] = useState(0);
  const [showRef, setShowRef] = useState(false);
  const [splash, setSplash] = useState(0);

  useEffect(() => { ctx.setPaused(phase === "listen"); }, [phase]);

  const fitOf = (o: OilDef | null): { score: number; safety: number; note: string } => {
    if (pregnant) return o ? { score: 20, safety: 1, note: "Thai phụ: chỉ dùng dầu nền, không pha tinh dầu." } : { score: 100, safety: 0, note: "Đúng: thai phụ chỉ dùng dầu nền." };
    if (!o) return { score: 50, safety: 0, note: "Dầu nền vẫn massage được, nhưng thiếu tác dụng hỗ trợ cho nhu cầu của khách." };
    if (face && o.noFace) return { score: OIL_WRONG, safety: 0, note: `${o.name} khá mạnh, dễ cay mắt — không dùng cho mặt.` };
    const s = OIL_FIT[need.id][o.id] ?? OIL_WRONG;
    const best = OILS.filter((x) => OIL_FIT[need.id][x.id] === 100).map((x) => x.name).join(" hoặc ");
    return { score: s, safety: 0, note: s >= 100 ? o.short : `${need.label}: hợp nhất là ${best}.` };
  };

  const pick = (o: OilDef | null) => {
    setOil(o);
    setDrops(0);
    setPhase("drops");
  };

  const finish = () => {
    const f = fitOf(oil);
    const max = range.max, min = range.min;
    const dropScore = !oil ? 100 : drops >= min && drops <= max ? 100 : Math.abs(drops - (drops < min ? min : max)) <= 2 ? 70 : 30;
    const overdose = !!oil && max > 0 && drops >= max * DILUTION.overdoseFactor;
    const safety = f.safety + (overdose ? 1 : 0);
    const total = Math.round(f.score * 0.6 + dropScore * 0.4);
    setPhase("done");
    playSound(safety ? "miss" : "done");
    const dropNote = !oil ? "" : drops < min ? ` Hơi ít: ${range.label}.` : drops > max ? ` ${overdose ? "Quá liều, dễ kích ứng da!" : "Hơi nhiều."} ${range.label}.` : " Số giọt chuẩn.";
    ctx.toast(`${f.note}${dropNote}`, total >= 80 && !safety ? "good" : "bad", 3200);
    if (!safety && total >= 80) ctx.setExpr("relaxed", 1800);
    setTimeout(() => ctx.onDone({ item: ctx.item, positionScore: total, attempts: 1, safetyErrors: safety }), 1400);
  };

  const drip = () => {
    if (!oil) return;
    setDrops((n) => n + 1);
    setSplash((n) => n + 1);
    playSound("tick");
  };

  const tint = oil ? oil.color : "#f2dca0";
  const level = Math.min(1, drops / 14);

  return (
    <>
      <div class="tx-canvaswrap mg-oilwrap">
        <div class="mg-oil-scene">
          <div class="mg-bubble">“{pregnant ? "Em đang mang bầu, nhờ em làm nhẹ nhàng nha. " : ""}{need.complaint}”</div>
          <div class="mg-oil-table">
            <div class="mg-oil-bowl" style={{ ["--oil" as string]: tint, ["--lv" as string]: String(level) }}>
              <div class="mg-oil-liquid" />
              {splash > 0 && <div key={splash} class="mg-oil-drop" style={{ background: tint }} />}
              <span class="mg-oil-label">Dầu nền {DILUTION.bowlMl} ml</span>
            </div>
            {phase === "drops" && oil && (
              <button class="mg-oil-bottle big tx-nohold" style={{ ["--oil" as string]: oil.color }} onClick={drip} aria-label={`Nhỏ 1 giọt ${oil.name}`}>
                <i /><span>{oil.name}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <div class="tx-bottom">
        {phase === "drops" && (
          <div class="mg-col">
            <div class="tx-instr">{oil ? <>Chạm lọ <b>{oil.name}</b> để nhỏ từng giọt vào chén</> : <>Chỉ dùng dầu nền, không nhỏ tinh dầu</>}</div>
            {oil && <div class="mg-count big">{drops} giọt</div>}
            <div class="tx-tools">
              {oil && <button class="tx-btn" onClick={() => setDrops(0)}>Đổ đi pha lại</button>}
              <button class="tx-btn" onClick={() => setPhase("listen")}>Đổi lọ</button>
              <button class="tx-btn primary grow" onClick={finish}>Pha xong</button>
            </div>
          </div>
        )}
        {phase === "done" && <div class="tx-instr">✓ Xong: Pha dầu massage</div>}
      </div>
      {phase === "listen" && (
        <div class="tx-sheet-bg tx-nohold" onPointerDown={(e) => e.stopPropagation()}>
          <div class="tx-sheet">
            <h2>Pha dầu massage</h2>
            <p class="mg-signs">“{pregnant ? "Em đang mang bầu. " : ""}{need.complaint}”</p>
            <p class="mg-q">Chọn tinh dầu cho chén dầu nền {DILUTION.bowlMl} ml{face ? " (massage mặt)" : ""}:</p>
            <div class="mg-choices oils">
              {OILS.map((o) => (
                <button key={o.id} class="mg-choice" onClick={() => pick(o)}>
                  <span class="mg-dot" style={{ background: o.color }} /><b>{o.name}</b>
                  {showRef && <small>{o.short}</small>}
                </button>
              ))}
              <button class="mg-choice" onClick={() => pick(null)}><span class="mg-dot" style={{ background: "#f2dca0" }} /><b>Không pha – chỉ dầu nền</b></button>
            </div>
            <button class="mg-link" onClick={() => setShowRef((v) => !v)}>{showRef ? "Ẩn công dụng & tỉ lệ" : "Xem công dụng & tỉ lệ pha"}</button>
            {showRef && (
              <ul class="mg-ref">
                <li>{DILUTION.body.label}</li><li>{DILUTION.gentle.label}</li><li>{DILUTION.pregnant.label}</li>
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
