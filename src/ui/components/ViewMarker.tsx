/** Renders a treatment view (art/views/Vxx) with a marker on a point / muscle / reflex zone. */
import { useEffect, useState } from "preact/hooks";
import type { ViewId } from "@/core/types";
import { viewData, viewSvg } from "@/ui/art/assets";

const SVGNS = "http://www.w3.org/2000/svg";

/**
 * Exam-review marks (VIEW coords, un-mirrored): the correct spot is drawn green (+ tolerance ring), the player's
 * first tap as a red ×, a swipe as a red arrow. `side` picks the customer's side; `mirrored` flips the art.
 */
export interface ReviewMarks {
  side?: string;
  mirrored?: boolean;
  tap?: [number, number];
  swipe?: { from: [number, number]; to: [number, number] };
  /** Highlight forbidden zones containing the tap. */
  showForbidden?: boolean;
}

const OK = "#2e9e6b", BAD = "#e04f4f";

export function ViewMarker({ view, kind, id, variant, review, cls }: { view: ViewId; kind: "point" | "muscle" | "zone"; id: string; variant?: string; review?: ReviewMarks; cls?: string }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let alive = true;
    Promise.all([viewSvg(view), viewData(view)]).then(([text, data]) => {
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const root = doc.documentElement;
      const W = data.frame.width, H = data.frame.height;
      // Layers: hide guides/fibers, muscles only for muscle items; pick variant groups.
      const hide = (gid: string) => root.querySelector(`#${CSS.escape(gid)}`)?.setAttribute("display", "none");
      hide("guides");
      hide("muscle-fibers");
      if (kind !== "muscle" || review) hide("muscles"); // review draws the target muscle itself
      const chosen = new Set<string>(Object.values(data.defaultVariants ?? {}));
      if (variant && data.variants) {
        for (const [grp, opts] of Object.entries(data.variants)) if (opts.includes(variant)) { for (const o of opts) chosen.delete(o); chosen.add(variant); void grp; }
      }
      for (const opts of Object.values(data.variants ?? {})) for (const o of opts) {
        const g = root.querySelector(`#${CSS.escape(o)}`) ?? root.querySelector(`#state-${CSS.escape(o)}`) ?? root.querySelector(`#${CSS.escape(o.startsWith("expr-") ? o : `state-${o}`)}`);
        if (g) g.setAttribute("display", chosen.has(o) ? "inline" : "none");
      }
      const layer = doc.createElementNS(SVGNS, "g");
      layer.setAttribute("class", "nb-marker");
      const poly = (pts: [number, number][]) => {
        const el = doc.createElementNS(SVGNS, "polygon");
        el.setAttribute("points", pts.map(([x, y]) => `${x * W},${y * H}`).join(" "));
        el.setAttribute("fill", "rgba(79,134,198,0.28)");
        el.setAttribute("stroke", "#4f86c6");
        el.setAttribute("stroke-width", "5");
        el.setAttribute("stroke-linejoin", "round");
        layer.appendChild(el);
      };
      let focus: [number, number] | null = null;
      if (review) {
        const reviewFocus = drawReview(doc, root, layer, data, W, H, kind, id, review);
        root.appendChild(layer);
        if (review.mirrored) {
          const g = doc.createElementNS(SVGNS, "g");
          g.setAttribute("transform", `translate(${W} 0) scale(-1 1)`);
          for (const ch of [...root.childNodes]) g.appendChild(ch);
          root.appendChild(g);
        }
        root.setAttribute("viewBox", reviewFocus);
        root.removeAttribute("width");
        root.removeAttribute("height");
        if (alive) setHtml(new XMLSerializer().serializeToString(root));
        return;
      }
      if (kind === "point") {
        for (const p of data.points.filter((p) => p.id === id)) {
          const r = Math.max(p.r * W, 14);
          for (const [rad, op] of [[r * 2.2, 0.18], [r, 0.9]] as const) {
            const c = doc.createElementNS(SVGNS, "circle");
            c.setAttribute("cx", String(p.x * W));
            c.setAttribute("cy", String(p.y * H));
            c.setAttribute("r", String(rad));
            c.setAttribute("fill", op < 0.5 ? "rgba(79,134,198,0.25)" : "#4f86c6");
            c.setAttribute("stroke", "#fff");
            c.setAttribute("stroke-width", op < 0.5 ? "0" : "4");
            layer.appendChild(c);
          }
          focus ??= [p.x * W, p.y * H];
        }
      } else if (kind === "muscle") {
        for (const m of data.muscles.filter((m) => m.id === id)) {
          poly(m.polygon);
          focus ??= centroid(m.polygon, W, H);
          for (const st of m.strokes) {
            const l = doc.createElementNS(SVGNS, "line");
            l.setAttribute("x1", String(st.from[0] * W)); l.setAttribute("y1", String(st.from[1] * H));
            l.setAttribute("x2", String(st.to[0] * W)); l.setAttribute("y2", String(st.to[1] * H));
            l.setAttribute("stroke", "#4f86c6"); l.setAttribute("stroke-width", "6"); l.setAttribute("stroke-linecap", "round");
            l.setAttribute("marker-end", "url(#nb-arrow)");
            layer.appendChild(l);
          }
        }
        const defs = doc.createElementNS(SVGNS, "defs");
        defs.innerHTML = `<marker id="nb-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#4f86c6"/></marker>`;
        root.insertBefore(defs, root.firstChild);
      } else {
        for (const z of (data.zones ?? []).filter((z) => z.id === id)) {
          const polys = z.polygons?.length ? z.polygons : [z.polygon];
          polys.forEach(poly);
          focus ??= centroid(polys[0], W, H);
        }
      }
      root.appendChild(layer);
      // Zoom towards the marker a bit (keep within frame).
      if (focus) {
        const vw = W * 0.7, vh = H * 0.7;
        const x = Math.max(0, Math.min(W - vw, focus[0] - vw / 2));
        const y = Math.max(0, Math.min(H - vh, focus[1] - vh / 2));
        root.setAttribute("viewBox", `${x} ${y} ${vw} ${vh}`);
      }
      root.removeAttribute("width");
      root.removeAttribute("height");
      if (alive) setHtml(new XMLSerializer().serializeToString(root));
    }).catch(() => alive && setHtml(""));
    return () => { alive = false; };
  }, [view, kind, id, variant, JSON.stringify(review ?? null)]);
  return <div class={"view-marker" + (cls ? ` ${cls}` : "")} dangerouslySetInnerHTML={{ __html: html }} />;
}

function centroid(pts: [number, number][], W: number, H: number): [number, number] {
  const n = pts.length || 1;
  return [pts.reduce((a, p) => a + p[0], 0) / n * W, pts.reduce((a, p) => a + p[1], 0) / n * H];
}

const opp = (s?: string) => (s === "left" ? "right" : s === "right" ? "left" : s);

/** Draws the review marks into `layer`; returns the viewBox (screen coords) framing target + tap. */
function drawReview(doc: Document, root: Element, layer: Element, data: Awaited<ReturnType<typeof viewData>>, W: number, H: number,
  kind: "point" | "muscle" | "zone", id: string, r: ReviewMarks): string {
  const artSide = r.mirrored ? opp(r.side) : r.side;
  const pts: [number, number][] = []; // view coords (px) to frame
  const el = (tag: string, attrs: Record<string, string | number>, parent: Element = layer) => {
    const e = doc.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    parent.appendChild(e);
    return e;
  };
  // Size marks relative to the crop (computed below) → first collect geometry, then draw with a unit.
  type Draw = (u: number) => void;
  const draws: Draw[] = [];
  const defs = doc.createElementNS(SVGNS, "defs");
  root.insertBefore(defs, root.firstChild);
  const marker = (mid: string, color: string) => {
    if (defs.querySelector(`#${mid}`)) return;
    defs.innerHTML += `<marker id="${mid}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${color}"/></marker>`;
  };
  const arrow = (a: [number, number], b: [number, number], color: string, mid: string, dashed?: boolean): Draw => (u) => {
    marker(mid, color);
    el("line", { x1: a[0] * W, y1: a[1] * H, x2: b[0] * W, y2: b[1] * H, stroke: "#fff", "stroke-width": 9 * u, "stroke-linecap": "round", opacity: 0.85 });
    el("line", { x1: a[0] * W, y1: a[1] * H, x2: b[0] * W, y2: b[1] * H, stroke: color, "stroke-width": 4.5 * u, "stroke-linecap": "round", "marker-end": `url(#${mid})`, ...(dashed ? { "stroke-dasharray": `${10 * u} ${7 * u}` } : {}) });
  };
  const polygon = (poly: [number, number][], color: string): Draw => (u) => {
    el("polygon", { points: poly.map(([x, y]) => `${x * W},${y * H}`).join(" "), fill: color, "fill-opacity": 0.25, stroke: color, "stroke-width": 3 * u, "stroke-linejoin": "round" });
  };
  if (kind === "point") {
    const p = data.points.find((q) => q.id === id && q.side === artSide) ?? data.points.find((q) => q.id === id);
    if (p) {
      pts.push([p.x * W, p.y * H]);
      const rr = p.r * W;
      draws.push((u) => {
        el("circle", { cx: p.x * W, cy: p.y * H, r: rr, fill: OK, "fill-opacity": 0.18, stroke: OK, "stroke-width": 2.5 * u, "stroke-dasharray": `${6 * u} ${4 * u}` });
        el("circle", { cx: p.x * W, cy: p.y * H, r: Math.max(5 * u, Math.min(rr * 0.4, 8 * u)), fill: OK, stroke: "#fff", "stroke-width": 2.5 * u, class: "rv-target" });
      });
    }
  } else if (kind === "muscle") {
    const m = data.muscles.find((q) => q.id === id && q.side === artSide) ?? data.muscles.find((q) => q.id === id);
    if (m) {
      m.polygon.forEach(([x, y]) => pts.push([x * W, y * H]));
      draws.push(polygon(m.polygon, OK));
      m.strokes.forEach((st) => draws.push(arrow(st.from, st.to, OK, "rv-ok")));
    }
  } else {
    for (const z of (data.zones ?? []).filter((q) => q.id === id)) {
      const polys = z.polygons?.length ? z.polygons : [z.polygon];
      polys.forEach((poly) => { poly.forEach(([x, y]) => pts.push([x * W, y * H])); draws.push(polygon(poly, OK)); });
    }
  }
  if (r.showForbidden && r.tap) {
    const [tx, ty] = r.tap;
    for (const f of data.forbidden) {
      const cx = f.x ?? 0, cy = f.y ?? 0;
      const inside = f.shape === "polygon" ? false
        : f.shape === "circle" ? Math.hypot(tx - cx, (ty - cy) * (H / W)) <= (f.r ?? 0)
        : ((tx - cx) / (f.rx ?? f.r ?? 1)) ** 2 + ((ty - cy) / (f.ry ?? f.r ?? 1)) ** 2 <= 1;
      if (!inside) continue;
      draws.unshift((u) => {
        if (f.shape === "circle") el("circle", { cx: cx * W, cy: cy * H, r: (f.r ?? 0) * W, fill: BAD, "fill-opacity": 0.22, stroke: BAD, "stroke-width": 2 * u });
        else el("ellipse", { cx: cx * W, cy: cy * H, rx: (f.rx ?? f.r ?? 0) * W, ry: (f.ry ?? f.r ?? 0) * H, fill: BAD, "fill-opacity": 0.22, stroke: BAD, "stroke-width": 2 * u });
      });
    }
  }
  if (r.swipe) {
    const { from, to } = r.swipe;
    pts.push([from[0] * W, from[1] * H], [to[0] * W, to[1] * H]);
    draws.push(arrow(from, to, BAD, "rv-bad", true));
  }
  if (r.tap) {
    const [tx, ty] = [r.tap[0] * W, r.tap[1] * H];
    pts.push([tx, ty]);
    draws.push((u) => {
      const d = 8 * u;
      for (const [stroke, w] of [["#fff", 7 * u], [BAD, 3.6 * u]] as const) {
        el("path", { d: `M${tx - d} ${ty - d} L${tx + d} ${ty + d} M${tx + d} ${ty - d} L${tx - d} ${ty + d}`, stroke, "stroke-width": w, "stroke-linecap": "round", fill: "none" });
      }
    });
  }
  // Frame (screen coords: mirrored views flip x). Aspect 6:5, at least 34% of the art width, padded.
  const sx = (x: number) => (r.mirrored ? W - x : x);
  const xs = pts.length ? pts.map((p) => sx(p[0])) : [W / 2], ys = pts.length ? pts.map((p) => p[1]) : [H / 2];
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = W * 0.1;
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  const AR = 1.2;
  let w = Math.max(x1 - x0, W * 0.34), h = Math.max(y1 - y0, w / AR);
  w = Math.max(w, h * AR); h = w / AR;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let vx = cx - w / 2, vy = cy - h / 2;
  if (w <= W) vx = Math.max(0, Math.min(W - w, vx));
  if (h <= H) vy = Math.max(0, Math.min(H - h, vy));
  const u = w / 330; // ≈ SVG units per CSS px in a ~330 px wide card
  draws.forEach((d) => d(u));
  return `${vx} ${vy} ${w} ${h}`;
}
