/**
 * Composes a shop scene (art/shop/S0x.svg + .slots.json): equipment into slots, shop name on the
 * sign, customers on waiting chairs, receptionist behind the counter, staff at beds.
 */
import { useEffect, useState } from "preact/hooks";
import { characterSvg, equipmentSvg, itemSvg, sceneSlots, sceneSvg, type SceneSlots } from "@/ui/art/assets";

export interface ScenePlacement {
  slot: string; art: string; state?: "ok" | "warn" | "broken"; /** equipment tier 1–3: tier ≥2 gets a small gold star badge */ tier?: number;
  /** supply icon (art/items) on a shelf slot: `stock` 1–3 copies, `low` adds a small amber "!" badge */
  item?: boolean; stock?: number; low?: boolean;
}
export interface SceneActor { characterId: string; expr?: string; at: { slot?: string; anchor?: string }; size?: number; kind?: "seated" | "standing" }

const parser = typeof DOMParser !== "undefined" ? new DOMParser() : null;
const SVGNS = "http://www.w3.org/2000/svg";

function parseSvg(text: string): SVGSVGElement | null {
  if (!parser) return null;
  const doc = parser.parseFromString(text, "image/svg+xml");
  const el = doc.documentElement as unknown as SVGSVGElement;
  return el.nodeName === "svg" ? el : null;
}

function nested(src: SVGSVGElement, doc: Document, x: number, y: number, w: number, h: number, contain = false): SVGSVGElement {
  const el = doc.importNode(src, true) as SVGSVGElement;
  el.setAttribute("x", String(x));
  el.setAttribute("y", String(y));
  el.setAttribute("width", String(w));
  el.setAttribute("height", String(h));
  el.setAttribute("preserveAspectRatio", contain ? "xMidYMax meet" : "xMidYMid meet");
  el.removeAttribute("role");
  el.querySelector("title")?.remove();
  return el;
}

/** Gold pill with 1–2 stars (equipment tier Tốt / Cao cấp), drawn at the top-left of the slot. */
function tierBadge(doc: Document, tier: number, x: number, y: number): SVGGElement {
  const n = Math.max(1, Math.min(2, tier - 1));
  const g = doc.createElementNS(SVGNS, "g") as SVGGElement;
  g.setAttribute("class", "tier-badge");
  g.setAttribute("transform", `translate(${x} ${y})`);
  const w = 14 + n * 26;
  const bg = doc.createElementNS(SVGNS, "rect");
  for (const [k, v] of Object.entries({ x: 0, y: 0, width: w, height: 34, rx: 17, fill: "#fff7e0", stroke: "#5a4632", "stroke-width": 3 })) bg.setAttribute(k, String(v));
  g.appendChild(bg);
  for (let i = 0; i < n; i++) {
    const cx = 20 + i * 26, cy = 17, R = 11, r = 4.8;
    const pts: string[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 === 0 ? R : r;
      pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
    const st = doc.createElementNS(SVGNS, "polygon");
    st.setAttribute("points", pts.join(" "));
    st.setAttribute("fill", "#f2b630");
    st.setAttribute("stroke", "#8a5a14");
    st.setAttribute("stroke-width", "1.6");
    st.setAttribute("stroke-linejoin", "round");
    g.appendChild(st);
  }
  return g;
}

/**
 * Supply on a shelf slot (w×h box, bottom on the board): 1 item; 2 = item + a second one behind to the left;
 * 3 = two behind (left/right) + one in front. Fixed offsets so the shelf never jitters. `low` adds an amber "!" badge.
 */
function drawStock(doc: Document, g: SVGGElement, src: SVGSVGElement, w: number, h: number, stock: number, low: boolean) {
  const n = Math.max(1, Math.min(3, Math.round(stock)));
  const layout: [number, number][] = n === 1 ? [[0, 1]] : n === 2 ? [[-0.2, 0.86], [0.12, 0.96]] : [[-0.26, 0.8], [0.26, 0.8], [0, 0.96]];
  for (const [dx, k] of layout) {
    const sw = w * k, sh = h * k;
    g.appendChild(nested(src, doc, w / 2 + dx * w - sw / 2, h - sh, sw, sh, true));
  }
  if (!low) return;
  const b = doc.createElementNS(SVGNS, "g");
  b.setAttribute("class", "low-badge");
  b.setAttribute("transform", `translate(${w - 6} ${h * 0.28})`);
  const c = doc.createElementNS(SVGNS, "circle");
  for (const [k, v] of Object.entries({ r: 12, fill: "#e8b46a", stroke: "#8a5f4b", "stroke-width": 3 })) c.setAttribute(k, String(v));
  const t = doc.createElementNS(SVGNS, "path");
  for (const [k, v] of Object.entries({ d: "M0 -6 V2 M0 6.5 V7", stroke: "#3d2c25", "stroke-width": 3.4, "stroke-linecap": "round" })) t.setAttribute(k, String(v));
  b.appendChild(c);
  b.appendChild(t);
  g.appendChild(b);
}

export async function composeScene(
  scene: string,
  opts: { shopName?: string; placements: ScenePlacement[]; actors: SceneActor[]; /** show only this vertical band of the frame [y0, y1] (0–1) */ crop?: [number, number] },
): Promise<string> {
  const [text, slots] = await Promise.all([sceneSvg(scene), sceneSlots(scene) as Promise<SceneSlots>]);
  const root = parseSvg(text);
  if (!root) return text;
  const doc = root.ownerDocument;
  const W = slots.frame.width, H = slots.frame.height;
  const byId = (id: string) => root.querySelector(`#${CSS.escape(id)}`) as SVGGElement | null;

  // Shop name on the sign.
  const nameEl = byId("shop-name");
  if (nameEl && opts.shopName) {
    nameEl.textContent = opts.shopName;
    const spec = slots.text?.find((t) => t.id === "shop-name") as { maxWidth?: number; fontSize?: number } | undefined;
    const maxW = (spec?.maxWidth ?? 0.32) * W;
    const fs = spec?.fontSize ?? 34;
    const approx = opts.shopName.length * fs * 0.55;
    if (approx > maxW) {
      nameEl.setAttribute("textLength", String(maxW));
      nameEl.setAttribute("lengthAdjust", "spacingAndGlyphs");
    }
  }

  // Equipment.
  const badgeSvgs: Record<string, SVGSVGElement | null> = {};
  for (const b of ["warning-badge", "broken-badge"]) {
    if (opts.placements.some((p) => p.state === (b === "warning-badge" ? "warn" : "broken"))) {
      badgeSvgs[b] = parseSvg(await equipmentSvg(b).catch(() => ""));
    }
  }
  for (const p of opts.placements) {
    const slot = slots.slots.find((s) => s.id === p.slot);
    if (!slot) continue;
    const g = byId(slot.group);
    if (!g) continue;
    if (p.item) {
      const src = parseSvg(await itemSvg(p.art).catch(() => ""));
      if (src) drawStock(doc, g, src, slot.width * W, slot.height * H, p.stock ?? 1, !!p.low);
      continue;
    }
    const src = parseSvg(await equipmentSvg(p.art).catch(() => ""));
    if (!src) continue;
    const w = slot.width * W, h = slot.height * H;
    g.appendChild(nested(src, doc, 0, 0, w, h, slot.fit === "contain"));
    const badge = p.state === "warn" ? badgeSvgs["warning-badge"] : p.state === "broken" ? badgeSvgs["broken-badge"] : null;
    if (badge) g.appendChild(nested(badge, doc, w - 40, -10, 44, 44));
    if ((p.tier ?? 1) >= 2) g.appendChild(tierBadge(doc, p.tier!, 4, -6));
  }

  // Warm ambient light when a working aroma lamp (E05, any tier) is placed in this scene.
  const ambient = byId("ambient");
  if (ambient && opts.placements.some((p) => !p.item && p.art.startsWith("E05") && p.state !== "broken" && slots.slots.some((sl) => sl.id === p.slot))) {
    ambient.removeAttribute("display");
    const st = (ambient.getAttribute("style") ?? "").replace(/display\s*:\s*none\s*;?/i, "").trim();
    if (st) ambient.setAttribute("style", st); else ambient.removeAttribute("style");
  }

  // Actors.
  for (const a of opts.actors) {
    const src = parseSvg(await characterSvg(a.characterId, a.expr).catch(() => ""));
    if (!src) continue;
    const size = a.size ?? 150;
    if (a.at.slot) {
      const slot = slots.slots.find((s) => s.id === a.at.slot);
      const g = slot && byId(slot.group);
      if (!slot || !g) continue;
      const w = slot.width * W;
      // Bust sits on the chair: bottom of portrait slightly above the seat.
      g.appendChild(nested(src, doc, w / 2 - size / 2, slot.height * H * 0.62 - size, size, size));
    } else if (a.at.anchor) {
      const an = slots.anchors?.find((x) => x.id === a.at.anchor);
      if (!an) continue;
      const layerId = a.at.anchor === "receptionist" ? "actors-behind-counter" : "actors";
      const g = byId(layerId) ?? root;
      g.appendChild(nested(src, doc, an.x * W - size / 2, an.y * H - size, size, size));
    }
  }
  root.removeAttribute("width");
  root.removeAttribute("height");
  if (opts.crop) root.setAttribute("viewBox", `0 ${Math.round(opts.crop[0] * H)} ${W} ${Math.round((opts.crop[1] - opts.crop[0]) * H)}`);
  root.setAttribute("preserveAspectRatio", "xMidYMid slice");
  return new XMLSerializer().serializeToString(root);
}

export function SceneView({ scene, shopName, placements, actors, class: cls, crop }: { scene: string; shopName?: string; placements: ScenePlacement[]; actors: SceneActor[]; class?: string; crop?: [number, number] }) {
  const [html, setHtml] = useState("");
  const key = JSON.stringify([scene, shopName, placements, actors, crop]);
  useEffect(() => {
    let alive = true;
    composeScene(scene, { shopName, placements, actors, crop })
      .then((s) => alive && setHtml(s))
      .catch((e) => { console.error(e); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <div class={`scene ${cls ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
