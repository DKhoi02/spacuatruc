/**
 * Đắp mặt nạ mini-game (care step "mask"):
 *   read the skin (visual signs on the face + a description, no type name) → choose a mask → anh Khôi's feedback →
 *   sheet mask: tear the pack → drag the sheet to line up eyes / nose / mouth → smooth it down;
 *   powder mask: scoop powder + water → stir (texture is only seen after stirring) → brush on (alginate sets fast).
 * Item score = 50% mask choice + 50% execution (alignment / mix ratio and timing).
 */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { MASK_FIT, MASK_WHY, MASKS, type MaskDef } from "@/data/minigames";
import type { StepPlan } from "./plan";
import { Stage, type StrokePhase } from "./Stage";
import { normDist, type Pt } from "./scoring";
import { baseLayers, type TaskCtx } from "./common";
import { skinOf } from "./traits";
import { playSound } from "./sound";

type Phase = "read" | "feedback" | "tear" | "place" | "smooth" | "mix" | "stir" | "brush" | "done";

const POWDER_COLOR: Record<string, string> = { clay: "#b9c2a4", alginate: "#cfe6c8" };
const RUB_UNIT = 0.32;

/** Inner markup of the overlay's <g id="mask"> (already warped to this customer's face). */
function maskInner(svg: string | null): string {
  if (!svg) return "";
  const m = /<g id="mask"[^>]*>([\s\S]*?)\n {2}<\/g>/.exec(svg);
  return m ? m[1] : "";
}

export function MaskTask({ ctx }: { ctx: TaskCtx }) {
  const plan = ctx.plan as StepPlan;
  const skin = useMemo(() => skinOf(ctx.config.customer), [ctx.config.customer.id]);
  const [phase, setPhase] = useState<Phase>("read");
  const [mask, setMask] = useState<MaskDef | null>(null);
  const [showRef, setShowRef] = useState(false);
  const score = useRef({ fit: 0, exec: 100, placeTries: 0 });
  const startOff = useMemo<Pt>(() => [70 + (ctx.config.customer.id.length % 3) * 20, -60], [ctx.config.customer.id]);
  const [off, setOff] = useState<Pt>(startOff);
  const last = useRef<Pt | null>(null);
  const rub = useRef({ dist: 0, last: null as Pt | null });
  const [progress, setProgress] = useState(0);
  const [powder, setPowder] = useState(0);
  const [water, setWater] = useState(0);
  const [stirred, setStirred] = useState(0);
  const [texture, setTexture] = useState<{ ok: boolean; text: string } | null>(null);
  const firstMix = useRef<number | null>(null);
  const setAt = useRef<number | null>(null);
  const lateWarned = useRef(false);
  const [tear, setTear] = useState(0);
  const tearRef = useRef<{ x0: number; w: number } | null>(null);

  useEffect(() => { ctx.setPaused(phase === "read" || phase === "feedback"); }, [phase]);
  const inner = useMemo(() => maskInner(ctx.overlaySvg), [ctx.overlaySvg]);

  // ── choose ──
  const choose = (m: MaskDef) => {
    setMask(m);
    score.current.fit = MASK_FIT[skin.id][m.id];
    playSound(score.current.fit >= 85 ? "good" : "miss");
    setPhase("feedback");
  };
  const best = MASKS.find((m) => MASK_FIT[skin.id][m.id] === 100)!;

  // ── finish ──
  const finish = () => {
    setPhase("done");
    playSound("done");
    ctx.setExpr("relaxed", 1800);
    const total = Math.round(score.current.fit * 0.5 + Math.max(0, score.current.exec) * 0.5);
    ctx.toast(total >= 90 ? "Khách thấy da mát dịu 😌" : total >= 70 ? "Khách thấy dễ chịu" : "Khách thấy da hơi khó chịu", total >= 70 ? "good" : "bad");
    setTimeout(() => {
      if (mask?.form === "sheet") ctx.setCare({ ...ctx.care, mask: 1 });
      ctx.onDone({ item: ctx.item, positionScore: total, attempts: 1 + score.current.placeTries, safetyErrors: 0 });
    }, 900);
  };

  // ── stage strokes: drag sheet / smooth / brush ──
  const onStroke = (ph: StrokePhase, p: Pt) => {
    if (phase === "place") {
      if (ph === "start") { last.current = p; return; }
      if (ph === "move" && last.current) {
        const d: Pt = [(p[0] - last.current[0]) * 1000, (p[1] - last.current[1]) * 1400];
        last.current = p;
        setOff((o) => [o[0] + d[0], o[1] + d[1]]);
      } else last.current = null;
      return;
    }
    if (phase !== "smooth" && phase !== "brush") return;
    const r = rub.current;
    if (ph === "start") { r.last = p; return; }
    if (ph !== "move") { r.last = null; return; }
    if (r.last) r.dist += Math.min(0.08, normDist(r.last, p));
    r.last = p;
    const amount = phase === "smooth" ? 2 : 3;
    const pr = Math.min(1, r.dist / (amount * RUB_UNIT));
    setProgress(pr);
    if (phase === "brush" && mask?.setsIn && setAt.current && !lateWarned.current && (performance.now() - setAt.current) / 1000 > mask.setsIn) {
      lateWarned.current = true;
      score.current.exec -= 20;
      ctx.toast("Bột đã se lại, đắp bị lổn nhổn — lần sau đắp nhanh hơn", "bad", 2200);
    }
    if (pr >= 1) finish();
  };

  const dropSheet = () => {
    const d = Math.hypot(off[0], off[1]);
    score.current.placeTries++;
    if (d > 40) { playSound("miss"); ctx.toast("Còn lệch — kéo cho lỗ mắt, mũi, miệng khớp với mặt", "bad", 1800); return; }
    score.current.exec = Math.max(40, (d <= 14 ? 100 : 80) - 10 * (score.current.placeTries - 1));
    setOff([0, 0]);
    playSound("good");
    rub.current = { dist: 0, last: null };
    setProgress(0);
    setPhase("smooth");
  };

  // ── powder ──
  const stirAcc = useRef(0);
  const stir = (dist: number) => {
    if (stirAcc.current >= 1) return;
    const s = (stirAcc.current = Math.min(1, stirAcc.current + dist / 650));
    setStirred(s);
    if (s >= 1 && mask?.mix) {
      const ratio = water / Math.max(1, powder) / mask.mix.ideal;
      const ok = powder >= 2 && ratio >= 0.85 && ratio <= 1.2;
      const text = powder < 2 ? "Hơi ít bột, không đủ phủ kín mặt" : ratio < 0.85 ? "Đặc quá, vón cục" : ratio > 1.2 ? "Loãng quá, chảy nước" : `Đạt: ${mask.mix.texture}`;
      if (firstMix.current === null) firstMix.current = ok ? 100 : ratio >= 0.6 && ratio <= 1.6 && powder >= 2 ? 60 : 40;
      setTexture({ ok, text });
      playSound(ok ? "good" : "miss");
    }
  };
  const stirRef = useRef<{ x: number; y: number } | null>(null);
  const startBrush = () => {
    score.current.exec = firstMix.current ?? 40;
    setAt.current = performance.now();
    rub.current = { dist: 0, last: null };
    setProgress(0);
    setPhase("brush");
  };

  // ── tear ──
  const onTearDown = (e: PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    tearRef.current = { x0: e.clientX, w: r.width };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onTearMove = (e: PointerEvent) => {
    const t = tearRef.current;
    if (!t) return;
    const f = Math.max(0, Math.min(1, (e.clientX - t.x0) / (t.w * 0.7)));
    setTear(f);
    if (f >= 1) { tearRef.current = null; playSound("good"); setTimeout(() => setPhase("place"), 350); }
  };
  const onTearUp = () => { tearRef.current = null; if (tear < 1) setTear(0); };

  // ── drawing ──
  const layers = baseLayers(plan, 3, "relaxed", { show: [], hide: [] });
  const eyes = plan.data.variants?.eyes ?? [];
  if (eyes.includes("eyes-closed")) { layers.show.push("state-eyes-closed"); layers.hide.push(...eyes.filter((e) => e !== "eyes-closed").map((e) => `state-${e}`)); }
  for (const e of plan.data.variants?.expr ?? []) (e === "expr-relaxed" ? layers.show : layers.hide).push(e);
  for (const mo of plan.data.variants?.mouth ?? []) (mo === "mouth-closed" ? layers.show : layers.hide).push(`state-${mo}`);

  const pt = (id: string, side = "center"): Pt => {
    const p = plan.data.points.find((q) => q.id === id && q.side === side) ?? plan.data.points.find((q) => q.id === id);
    return p ? [p.x * 1000, p.y * 1400] : [500, 700];
  };
  const signs = skinSigns(skin.id, pt);
  const sheetVisible = mask?.form === "sheet" && (phase === "place" || phase === "smooth" || phase === "done");
  const powderVisible = mask?.form === "powder" && (phase === "brush" || phase === "done");
  const powderInner = mask ? inner.replace(/fill="#fffaf3" fill-opacity="0\.94"/, `fill="${POWDER_COLOR[mask.id] ?? "#ccc"}" fill-opacity="0.96"`).replace(/stroke="#c49a70"/, 'stroke="#9fae8a"') : "";

  return (
    <>
      <div class="tx-canvaswrap">
        <Stage svg={ctx.svg} mirrored={false} layers={layers} cssVars={ctx.cssVars} zoom={ctx.zoom} focus={[0.5, 0.5]}
          panMode="twofinger" onStroke={onStroke}
          qa={import.meta.env.DEV ? { kind: "mask", phase, skin: skin.id, mask: mask?.id, off, best: best.id } : undefined}>
          {phase !== "done" && phase !== "smooth" && phase !== "brush" && <g dangerouslySetInnerHTML={{ __html: signs }} />}
          {sheetVisible && (
            <g transform={`translate(${off[0]} ${off[1]})`} opacity={phase === "place" ? 0.82 : 0.5 + 0.5 * (phase === "done" ? 1 : progress)}
              dangerouslySetInnerHTML={{ __html: inner }} />
          )}
          {powderVisible && <g opacity={phase === "done" ? 1 : progress} dangerouslySetInnerHTML={{ __html: powderInner }} />}
        </Stage>
      </div>
      <div class="tx-bottom">
        {phase === "tear" && (
          <div class="mg-col">
            <div class="tx-instr"><b>Xé túi mặt nạ</b> — vuốt ngang theo mép răng cưa</div>
            <div class="mg-pack tx-nohold" onPointerDown={onTearDown as never} onPointerMove={onTearMove as never} onPointerUp={onTearUp} onPointerCancel={onTearUp}>
              <div class="mg-pack-top" style={{ transform: `rotate(${-tear * 18}deg) translateY(${-tear * 16}px)`, opacity: 1 - tear * 0.6 }} />
              <div class="mg-pack-body"><span>{mask?.name}</span></div>
              <div class="mg-pack-guide" style={{ width: `${tear * 100}%` }} />
            </div>
          </div>
        )}
        {phase === "place" && (
          <div class="mg-col">
            <div class="tx-instr"><b>Đặt mặt nạ</b> — kéo tấm mặt nạ cho lỗ mắt, mũi, miệng khớp với mặt khách</div>
            <button class="tx-btn primary grow" onClick={dropSheet}>Dán xuống</button>
          </div>
        )}
        {(phase === "smooth" || phase === "brush") && (
          <div class="mg-col">
            <div class="tx-instr">{phase === "smooth" ? <><b>Vuốt phẳng</b> — vuốt nhẹ từ giữa mặt ra ngoài cho mặt nạ bám kín</> : <><b>Quét mặt nạ</b> — quét đều khắp mặt, chừa mắt và môi{mask?.setsIn ? " (bột dẻo đông nhanh, quét nhanh tay!)" : ""}</>}</div>
            <div class="tx-holdbar"><i style={{ width: `${progress * 100}%` }} /></div>
          </div>
        )}
        {(phase === "mix" || phase === "stir") && mask?.mix && (
          <div class="mg-col">
            <div class="tx-instr"><b>Pha {mask.name.replace("Mặt nạ ", "")}</b> — cho bột và nước vào chén rồi khuấy</div>
            <div class="mg-bowlrow tx-nohold">
              <div class="mg-bowl"
                onPointerDown={(e) => { if (powder && water) { stirRef.current = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } }}
                onPointerMove={(e) => { const s = stirRef.current; if (!s) return; stir(Math.hypot(e.clientX - s.x, e.clientY - s.y)); stirRef.current = { x: e.clientX, y: e.clientY }; }}
                onPointerUp={() => { stirRef.current = null; }} onPointerCancel={() => { stirRef.current = null; }}>
                <div class={"mg-paste" + (texture ? (texture.ok ? " ok" : texture.text.startsWith("Loãng") ? " thin" : " thick") : "")}
                  style={{ background: POWDER_COLOR[mask.id], transform: `scale(${Math.min(1, 0.25 + (powder + water) * 0.08)}) rotate(${stirred * 540}deg)` }} />
                <span class="mg-bowl-note">{!powder || !water ? "Chén trống" : stirred < 1 ? "Xoay ngón tay trong chén để khuấy" : ""}</span>
              </div>
              <div class="mg-scoops">
                <button class="tx-btn" onClick={() => { setPowder((n) => n + 1); stirAcc.current = 0; setStirred(0); setTexture(null); }}>+ 1 thìa bột</button>
                <button class="tx-btn" onClick={() => { setWater((n) => n + 1); stirAcc.current = 0; setStirred(0); setTexture(null); }}>+ 1 thìa nước</button>
                <span class="mg-count">Bột {powder} · Nước {water}</span>
                <button class="tx-btn skip" onClick={() => { setPowder(0); setWater(0); stirAcc.current = 0; setStirred(0); setTexture(null); }}>Đổ đi</button>
              </div>
            </div>
            {texture && <div class={"tx-effect" + (texture.ok ? "" : " bad")}>{texture.text}</div>}
            {texture?.ok && <button class="tx-btn primary grow" onClick={startBrush}>Đắp lên mặt</button>}
          </div>
        )}
        {phase === "done" && <div class="tx-instr">✓ Xong: Đắp mặt nạ</div>}
        {phase !== "done" && ctx.tools}
      </div>

      {phase === "read" && (
        <div class="tx-sheet-bg tx-nohold mg-read" onPointerDown={(e) => e.stopPropagation()}>
          <div class="tx-sheet">
            <h2>Soi da khách</h2>
            <p class="mg-signs">“{skin.signs}”</p>
            <p class="mg-q">Chọn mặt nạ phù hợp:</p>
            <div class="mg-choices">
              {MASKS.map((m) => (
                <button key={m.id} class="mg-choice" onClick={() => choose(m)}>
                  <b>{m.name}</b><span class="tx-tag">{m.form === "sheet" ? "Giấy" : "Bột"}</span>
                  {showRef && <small>{m.short}</small>}
                </button>
              ))}
            </div>
            <button class="mg-link" onClick={() => setShowRef((v) => !v)}>{showRef ? "Ẩn công dụng" : "Xem công dụng từng loại"}</button>
          </div>
        </div>
      )}
      {phase === "feedback" && mask && (
        <div class="tx-sheet-bg tx-nohold" onPointerDown={(e) => e.stopPropagation()}>
          <div class="tx-sheet">
            <h2>{score.current.fit >= 100 ? "Chuẩn rồi!" : score.current.fit >= 70 ? "Được, nhưng chưa tối ưu" : "Chưa hợp"}</h2>
            <div class="sub"><span class="tx-tag">{skin.name}</span><span class="tx-tag">{mask.name}</span></div>
            <p>{score.current.fit >= 100 ? mask.short : MASK_WHY[skin.id]?.[mask.id] ?? `${skin.name} hợp nhất với ${best.name}: ${best.short}`}</p>
            {score.current.fit < 100 && <p class="muted">Anh Khôi: “{skin.name} → nên dùng <b>{best.name}</b>.”</p>}
            <div class="row"><button class="tx-btn primary grow" onClick={() => setPhase(mask.form === "sheet" ? "tear" : "mix")}>Tiếp tục với {mask.name.replace("Mặt nạ ", "")}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

/** Visual skin signs drawn on the face (customer's warped landmarks). */
function skinSigns(id: string, pt: (id: string, side?: string) => Pt): string {
  const [fx, fy] = [(pt("GV24")[0] + pt("GV29")[0]) / 2, (pt("GV24")[1] + pt("GV29")[1]) / 2];
  const nose = [(pt("GV29")[0] + pt("GV26")[0]) / 2, pt("GV29")[1] * 0.35 + pt("GV26")[1] * 0.65];
  const chin = pt("CV24");
  const cheeks = [pt("ST3", "left"), pt("ST3", "right")].map((c, i) => [c[0] + (i ? -1 : 1) * -40, c[1] - 10]);
  const shine = (x: number, y: number, rx: number, ry: number) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ffffff" opacity="0.55"/><ellipse cx="${x + rx * 0.3}" cy="${y - ry * 0.3}" rx="${rx * 0.35}" ry="${ry * 0.35}" fill="#ffffff" opacity="0.7"/>`;
  const out: string[] = [];
  if (id === "oily" || id === "combination") {
    out.push(shine(fx, fy, 70, 18), shine(nose[0], nose[1], 16, 34), shine(chin[0], chin[1] + 18, 34, 12));
    if (id === "oily") for (const c of cheeks) out.push(shine(c[0], c[1], 34, 16));
  }
  if (id === "dry") {
    for (const c of cheeks) for (let i = 0; i < 7; i++) {
      const x = c[0] - 40 + ((i * 37) % 80), y = c[1] - 24 + ((i * 23) % 48);
      out.push(`<path d="M${x} ${y} l9 -4 M${x + 4} ${y + 6} l7 -2" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`);
    }
  }
  if (id === "sensitive") {
    for (const c of cheeks) {
      out.push(`<ellipse cx="${c[0]}" cy="${c[1]}" rx="62" ry="38" fill="#e2645a" opacity="0.26"/>`);
      out.push(`<path d="M${c[0] - 30} ${c[1]} q12 -8 22 2 q10 8 20 -2 M${c[0] - 20} ${c[1] + 16} q12 -6 24 2" stroke="#d0534a" stroke-width="2" fill="none" opacity="0.6"/>`);
    }
  }
  if (id === "acne") {
    const spots: Pt[] = [];
    for (const c of cheeks) for (let i = 0; i < 6; i++) spots.push([c[0] - 36 + ((i * 29) % 72), c[1] - 22 + ((i * 17) % 44)]);
    for (let i = 0; i < 4; i++) spots.push([fx - 60 + i * 38, fy + ((i * 11) % 20) - 10]);
    spots.push([chin[0] - 24, chin[1] + 4], [chin[0] + 20, chin[1] + 12]);
    for (const [x, y] of spots) out.push(`<circle cx="${x}" cy="${y}" r="7" fill="#e07a6e" opacity="0.75"/><circle cx="${x}" cy="${y}" r="2.6" fill="#fff4e8" opacity="0.8"/>`);
    out.push(shine(nose[0], nose[1], 14, 28));
  }
  return out.join("");
}
