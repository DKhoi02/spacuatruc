/**
 * Cửa hàng → Trang trí: buy decorations and arrange them freely in the lobby (Sảnh) or treatment room 1 by dragging.
 * Ambience (Không khí) of the lobby makes waiting customers more patient; of room 1 adds tips.
 */
import { useMemo, useRef, useState } from "preact/hooks";
import type { DecorArea, GameState } from "@/core/types";
import { FlipHorizontal2, PackageOpen, Plus, Sparkles } from "lucide-preact";
import { DECOR, DECOR_CONFIG, type DecorDef } from "@/data/decor";
import { decorSvg, sceneSlots, type SceneSlots } from "@/ui/art/assets";
import { api } from "../api";
import { Bar, Btn, Section } from "../components/bits";
import { SceneView } from "../components/Scene";
import { vnd } from "../format";
import { dispatch, toast } from "../store";
import { decorFor, lobbyScene, placementsFor, roomScene } from "../sceneState";
import { useAsync } from "../useAsync";

const AREAS: { id: DecorArea; label: string }[] = [{ id: "lobby", label: "Sảnh chờ" }, { id: "room1", label: "Phòng trị liệu" }];

/** Default drop spot for a newly placed item (normalized scene coords). */
const spawnAt = (d: DecorDef, n: number): [number, number] => {
  const dx = ((n * 0.37) % 1) * 0.5 - 0.25;
  return d.kind === "wall" ? [0.5 + dx, 0.24] : d.kind === "rug" ? [0.5 + dx * 0.4, 0.93] : [0.5 + dx, 0.9];
};

export function Decorate({ s }: { s: GameState }) {
  const [area, setArea] = useState<DecorArea>("lobby");
  const [sel, setSel] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ uid: string; x: number; y: number; ox: number; oy: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const scene = area === "lobby" ? lobbyScene(s.shopLevel) : roomScene(s.shopLevel, 1);
  const slots = useAsync<SceneSlots>(() => sceneSlots(scene), [scene]);
  const placements = placementsFor(s, slots?.scene === scene ? slots : null, scene, 1);
  const placed = decorFor(s, area);
  const score = api.ambience(s, area);
  const effect = area === "lobby"
    ? `Khách chờ kiên nhẫn thêm ${api.decorPatienceBonus(s)} phút`
    : `Tip thêm ${(api.decorTipPct(s, "S02") * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% giá dịch vụ`;
  const shown = placed.map((p) => (drag?.uid === p.uid ? { ...p, x: drag.x, y: drag.y } : p)).map((p) => (p.uid === sel ? { ...p, selected: true } : p));

  const toScene = (e: PointerEvent): [number, number] => {
    const r = boxRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  /** Topmost placed item under a scene point (front items before wall / rug). */
  const hit = (x: number, y: number) => {
    const order = [...placed].sort((a, b) => rank(b) - rank(a));
    return order.find((p) => {
      const d = DECOR.find((q) => q.id === p.id)!;
      const w = d.w / 1000, h = d.h / 1000;
      const top = d.kind === "wall" ? p.y - h / 2 : p.y - h;
      return x >= p.x - w / 2 - 0.02 && x <= p.x + w / 2 + 0.02 && y >= top - 0.02 && y <= top + h + 0.02;
    });
  };
  const onDown = (e: PointerEvent) => {
    const [x, y] = toScene(e);
    const p = hit(x, y);
    if (!p) { setSel(null); return; }
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setSel(p.uid);
    setDrag({ uid: p.uid, x: p.x, y: p.y, ox: x - p.x, oy: y - p.y });
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const [x, y] = toScene(e);
    setDrag({ ...drag, x: Math.max(0.03, Math.min(0.97, x - drag.ox)), y: Math.max(0.08, Math.min(1, y - drag.oy)) });
  };
  const onUp = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    dispatch((g) => api.moveDecor(g, d.uid, d.x, d.y));
  };

  const place = (d: DecorDef) => {
    const [x, y] = spawnAt(d, placed.length);
    let uid = "";
    if (dispatch((g) => { const r = api.placeDecor(g, d.id, area, x, y); uid = r.uid; return r.state; })) {
      setSel(uid);
      toast(`Đã bày ${d.name} — kéo để đổi chỗ`, "ok");
    }
  };
  const buy = (d: DecorDef) => {
    if (dispatch((g) => api.buyDecor(g, d.id))) place(d);
  };
  const selItem = placed.find((p) => p.uid === sel);

  return (
    <>
      <Section title="Trang trí tiệm">
        <div class="seg room-tabs">
          {AREAS.map((a) => (
            <button key={a.id} class={`seg-btn${area === a.id ? " on" : ""}`} onClick={() => { setArea(a.id); setSel(null); }}>{a.label}</button>
          ))}
        </div>
        <div class="decor-stage card" ref={boxRef}
          onPointerDown={onDown as never} onPointerMove={onMove as never} onPointerUp={onUp} onPointerCancel={onUp}>
          <SceneView scene={scene} shopName={area === "lobby" ? s.shopName : undefined} placements={placements} actors={[]} decor={shown} class="decor-scene" />
          {!placed.length && <div class="decor-empty">Mua hoặc bày đồ bên dưới, rồi kéo thả để sắp xếp</div>}
        </div>
        {selItem && (
          <div class="decor-tools">
            <b class="grow">{DECOR.find((d) => d.id === selItem.id)?.name}</b>
            <Btn small kind="secondary" onClick={() => dispatch((g) => api.flipDecor(g, selItem.uid))}><FlipHorizontal2 size={16} /> Lật</Btn>
            <Btn small kind="secondary" onClick={() => { dispatch((g) => api.storeDecor(g, selItem.uid)); setSel(null); }}><PackageOpen size={16} /> Cất kho</Btn>
          </div>
        )}
        <div class="card decor-meter">
          <div class="row-between"><span><Sparkles size={16} /> Không khí {area === "lobby" ? "sảnh" : "phòng"}</span><b>{score}/{DECOR_CONFIG.maxScore}</b></div>
          <Bar value={score} max={DECOR_CONFIG.maxScore} tone="ok" />
          <span class="muted small">{effect}. Mỗi món mới cộng ♥ theo món, món trùng chỉ cộng 1.</span>
        </div>
      </Section>
      <Section title="Đồ trang trí">
        <div class="decor-grid">
          {DECOR.map((d) => {
            const own = s.decor?.owned[d.id] ?? 0;
            const free = api.decorInStorage(s, d.id);
            return (
              <div key={d.id} class="card decor-card">
                <DecorThumb id={d.id} />
                <b>{d.name}</b>
                <span class="muted small">{"♥".repeat(d.beauty)} · {kindLabel[d.kind]}{own ? ` · có ${own}` : ""}</span>
                {free > 0
                  ? <Btn small block onClick={() => place(d)}>Bày ({free})</Btn>
                  : <Btn small block kind="secondary" disabled={s.money < d.price} onClick={() => buy(d)}><Plus size={15} /> {vnd(d.price)}</Btn>}
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

const kindLabel: Record<DecorDef["kind"], string> = { floor: "đặt sàn", table: "để bàn/kệ", wall: "treo tường", rug: "trải sàn" };
const rank = (p: { id: string; y: number }) => {
  const k = DECOR.find((d) => d.id === p.id)?.kind;
  return (k === "wall" || k === "rug" ? 0 : 10) + p.y;
};

function DecorThumb({ id }: { id: string }) {
  const svg = useAsync<string>(() => decorSvg(id), [id]);
  const html = useMemo(() => (svg ?? "").replace(/<svg /, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" '), [svg]);
  return <div class="decor-thumb" dangerouslySetInnerHTML={{ __html: html }} />;
}
