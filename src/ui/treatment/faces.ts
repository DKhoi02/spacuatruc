/**
 * Per-customer faces for the frontal face view (V01). The art and its JSON are drawn for ONE canonical face; each
 * customer gets a smooth warp (face shape, build, size) plus hair style, age lines and facial hair drawn on top.
 *
 * The same warp moves the SVG and every coordinate in the view JSON (points, muscles, forbidden areas), so acupoints
 * stay on the same anatomy (brow head, orbital rim, jaw angle…) whatever the face. Taps / swipes are recorded back in
 * canonical coords (`unwarp`), so the exam review and the notebook keep using the canonical art.
 *
 * Pure (no DOM): SVG strings are rewritten with regexes; the V01/V13 art only uses absolute M/L/C/Q/S/Z paths,
 * circles, ellipses and one background rect.
 */
import type { ViewData } from "@/ui/art/assets";

type P = [number, number];

export type HairStyle =
  | "bun" | "ponytail" | "long-straight" | "long-wavy" | "bob" | "pixie" | "curly-short"
  | "short-male" | "side-part-male" | "buzz-male" | "receding-male";
export type FaceShape = "oval" | "round" | "square" | "long" | "heart";
export type Build = "normal" | "fat" | "thin" | "hollow";

export interface FaceLook {
  /** Stable key (memo / cache). */
  key: string;
  male: boolean;
  age: number;
  shape: FaceShape;
  build: Build;
  /** Overall face size vs. the canonical face (0.9 small … 1.08 big). */
  size: number;
  hair: HairStyle;
  /** 0 none · 1 salt-and-pepper · 2 silver. */
  gray: 0 | 1 | 2;
  beard: { stubble: boolean; mustache: boolean };
  earrings?: "stud" | "pearl";
  /** Spa headband color (pushes the hair back, sits above the hairline). */
  headband?: string;
}

export interface CharacterLike { id: string; gender?: string; age?: number; head?: string; hair?: string; hairColor?: string; accessories?: string[] }

/**
 * Hand-picked face shape / build / size per customer character so the roster covers men and women, young to old,
 * big and small faces, chubby, slim and hollow-cheeked. Unknown characters get a seeded pick.
 */
const CURATED: Record<string, { shape?: FaceShape; build?: Build; size?: number; stubble?: boolean }> = {
  "khach-mai": { shape: "oval", build: "normal", size: 1 },
  "khach-hoa": { shape: "round", build: "fat", size: 1.05 },
  "khach-bich": { shape: "oval", build: "hollow", size: 0.95 },
  "khach-tuan": { shape: "square", build: "normal", size: 1.03, stubble: true },
  "khach-linh": { shape: "heart", build: "thin", size: 0.91 },
  "khach-phuong": { shape: "heart", build: "normal", size: 0.98 },
  "khach-chu-bay": { shape: "long", build: "hollow", size: 1.0 },
  "khach-hang": { shape: "round", build: "fat", size: 1.03 },
  "khach-dung": { shape: "long", build: "thin", size: 0.97 },
  "khach-yen": { shape: "oval", build: "normal", size: 0.95 },
  "khach-ba-tam": { shape: "round", build: "hollow", size: 0.93 },
  "khach-nhung": { shape: "long", build: "normal", size: 0.99 },
  "quen-thu": { shape: "round", build: "fat", size: 1.02 },
  "quen-huong": { shape: "oval", build: "thin", size: 0.96 },
  "quen-phat": { shape: "square", build: "fat", size: 1.07 },
  "quen-diem": { shape: "heart", build: "normal", size: 0.93 },
  "dacbiet-mang-thai": { shape: "round", build: "normal", size: 1.01 },
  "dacbiet-vip": { shape: "oval", build: "normal", size: 0.99 },
  "dacbiet-van-phong": { shape: "long", build: "thin", size: 1.0 },
  "anh-khoi": { shape: "square", build: "normal", size: 1.02 },
  "khach-ong-lam": { shape: "long", build: "hollow", size: 0.97 },
  "khach-anh-hai": { shape: "round", build: "fat", size: 1.08 },
  "khach-co-loan": { shape: "square", build: "fat", size: 1.03 },
  "khach-nam": { shape: "oval", build: "thin", size: 0.91 },
  "khach-chi-thanh": { shape: "long", build: "hollow", size: 0.96 },
  "khach-chu-hoa": { shape: "square", build: "normal", size: 1.05, stubble: true },
};

const HAIRS: HairStyle[] = ["bun", "ponytail", "long-straight", "long-wavy", "bob", "pixie", "curly-short", "short-male", "side-part-male", "buzz-male", "receding-male"];
const SHAPES: FaceShape[] = ["oval", "round", "square", "long", "heart"];
const BUILDS: Build[] = ["normal", "normal", "fat", "thin", "hollow"];
const BAND: Record<string, string> = { sage: "#8fb39a", rose: "#e3a6a0", cream: "#f3e6cf" };

function h01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
const pick = <T,>(arr: T[], s: string): T => arr[Math.floor(h01(s) * arr.length) % arr.length];

export function lookFor(c: CharacterLike | undefined, fallbackId = "x"): FaceLook {
  const id = c?.id ?? fallbackId;
  const male = c?.gender === "nam";
  const age = c?.age ?? 30;
  const cur = CURATED[id] ?? {};
  let hair = (c?.hair ?? "") as HairStyle;
  if ((c?.hair ?? "") === "headscarf") hair = "bun"; // the scarf comes off for a facial
  if (!HAIRS.includes(hair)) hair = male ? pick(["short-male", "side-part-male", "buzz-male"] as HairStyle[], id + "hair") : pick(["bun", "ponytail", "long-straight", "bob"] as HairStyle[], id + "hair");
  const headShape: FaceShape | undefined = c?.head === "soft-square" ? "square" : c?.head === "round" ? "round" : c?.head === "oval" ? "oval" : undefined;
  const shape = cur.shape ?? headShape ?? pick(SHAPES, id + "shape");
  const build = cur.build ?? pick(BUILDS, id + "build");
  const size = cur.size ?? Math.round((0.92 + 0.15 * h01(id + "size")) * 100) / 100;
  const acc = c?.accessories ?? [];
  const gray: 0 | 1 | 2 = c?.hairColor === "bac" ? 2 : c?.hairColor === "muoi-tieu" ? 1 : 0;
  const earrings = acc.includes("earrings-pearl") ? "pearl" : acc.includes("earrings-stud") || acc.includes("earrings-hoop") ? "stud" : undefined;
  const look: FaceLook = {
    key: "", male, age, shape, build, size, hair, gray,
    beard: { stubble: male && (acc.includes("stubble") || !!cur.stubble), mustache: male && acc.includes("mustache") },
    ...(earrings ? { earrings } : {}),
    ...(acc.includes("headband") ? { headband: BAND.sage } : {}),
  };
  look.key = [id, shape, build, size, hair, gray, +look.beard.stubble, +look.beard.mustache, age, +male].join("|");
  return look;
}

// ───────────────────────────── warp ─────────────────────────────

interface WarpParams { sF: number; sC: number; sM: number; sJ: number; sCh: number; sN: number; fh: number; lf: number; gs: number }

export function warpParams(l: FaceLook): WarpParams {
  const p: WarpParams = { sF: 1, sC: 1, sM: 1, sJ: 1, sCh: 1, sN: 1, fh: 1, lf: 1, gs: l.size };
  const add = (o: Partial<WarpParams>) => { for (const [k, v] of Object.entries(o)) (p as unknown as Record<string, number>)[k] += v as number; };
  switch (l.shape) {
    case "round": add({ sF: 0.02, sC: 0.06, sM: 0.07, sJ: 0.04, sCh: 0.06, fh: -0.04, lf: -0.06 }); break;
    case "square": add({ sF: 0.03, sC: 0.03, sM: 0.05, sJ: 0.12, sCh: 0.13 }); break;
    case "long": add({ sF: -0.03, sC: -0.05, sM: -0.05, sJ: -0.05, sCh: -0.04, fh: 0.06, lf: 0.1 }); break;
    case "heart": add({ sF: 0.05, sC: 0.03, sM: -0.03, sJ: -0.1, sCh: -0.14, lf: 0.02 }); break;
    case "oval": add({ sJ: -0.04, sCh: -0.05 }); break;
  }
  switch (l.build) {
    case "fat": add({ sF: 0.02, sC: 0.06, sM: 0.11, sJ: 0.11, sCh: 0.07, sN: 0.16 }); break;
    case "thin": add({ sF: -0.03, sC: -0.05, sM: -0.08, sJ: -0.07, sCh: -0.04, sN: -0.08 }); break;
    case "hollow": add({ sF: -0.02, sC: -0.01, sM: -0.13, sJ: -0.05, sCh: -0.03, sN: -0.07 }); break;
  }
  if (l.male) add({ sJ: 0.04, sCh: 0.03, sN: 0.08, lf: 0.02 });
  if (l.age >= 60) add({ sJ: 0.03, lf: 0.02 });
  return p;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
/** Piecewise smoothstep through knots (flat at each knot; extends flat outside). */
function knotLerp(k: P[], y: number): number {
  if (y <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (y <= k[i][0]) {
      const t = (y - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * smooth(t);
    }
  }
  return k[k.length - 1][1];
}
/** Monotone cubic (Fritsch–Carlson) through increasing knots. */
function pchip(k: P[]): (x: number) => number {
  const n = k.length;
  const d: number[] = [], m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
    const h0 = k[i][0] - k[i - 1][0], h1 = k[i + 1][0] - k[i][0];
    const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return (x: number) => {
    if (x <= k[0][0]) return k[0][1] + (x - k[0][0]) * m[0];
    if (x >= k[n - 1][0]) return k[n - 1][1] + (x - k[n - 1][0]) * m[n - 1];
    let i = 0;
    while (x > k[i + 1][0]) i++;
    const h = k[i + 1][0] - k[i][0], t = (x - k[i][0]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * k[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * k[i + 1][1] + (t3 - t2) * h * m[i + 1];
  };
}

export interface Warp {
  /** Canonical px (1000×1400 frame) → this face's px. */
  fwd: (p: P) => P;
  /** This face's px → canonical px. */
  inv: (p: P) => P;
  /** Local scale (sx, sy) at a canonical px point. */
  jac: (p: P) => P;
}

const CX = 500, CY = 640;

export function makeWarp(l: FaceLook): Warp {
  const w = warpParams(l);
  const g = w.gs;
  // Width scale by height (canonical y). Shoulders / towel (y ≥ 1200) never move.
  const sK: P[] = [[200, w.sF * g], [470, w.sF * g], [620, w.sC * g], [760, w.sM * g], [870, w.sJ * g], [965, w.sCh * g], [1060, w.sN * g], [1200, 1], [1400, 1]];
  // Vertical map: eyes (650) stay, forehead / lower face stretch, then the whole face scales around CY.
  const sc = (y: number) => CY + (y - CY) * g;
  const Yk: P[] = [
    [0, 0],
    [235, sc(235 - (w.fh - 1) * 170)],
    [418, sc(418 - (w.fh - 1) * 130)],
    [650, sc(650)],
    [790, sc(790 + (w.lf - 1) * 140)],
    [975, sc(975 + (w.lf - 1) * 325)],
    [1150, Math.min(1255, sc(1150 + (w.lf - 1) * 200))],
    [1280, 1280],
    [1400, 1400],
  ];
  const Yf = pchip(Yk);
  // Inner features (eyes, nose, mouth) widen less than the outline.
  const wt = (ad: number) => 0.4 + 0.6 * smooth(Math.max(0, Math.min(1, (ad - 60) / 230)));
  const Xf = (x: number, y: number) => {
    const dx = x - CX, s = knotLerp(sK, y);
    return CX + dx * (1 + (s - 1) * wt(Math.abs(dx)));
  };
  const fwd = (p: P): P => [Xf(p[0], p[1]), Yf(p[1])];
  const bis = (f: (v: number) => number, target: number, lo: number, hi: number) => {
    for (let i = 0; i < 48; i++) { const mid = (lo + hi) / 2; if (f(mid) < target) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  const inv = (q: P): P => {
    const y = bis(Yf, q[1], -400, 1800);
    const x = bis((v) => Xf(v, y), q[0], -800, 1800);
    return [x, y];
  };
  const jac = (p: P): P => {
    const e = 2;
    return [(Xf(p[0] + e, p[1]) - Xf(p[0] - e, p[1])) / (2 * e), (Yf(p[1] + e) - Yf(p[1] - e)) / (2 * e)];
  };
  return { fwd, inv, jac };
}

// ───────────────────────────── view data ─────────────────────────────

const NW = 1000, NH = 1400;
const toPx = (x: number, y: number): P => [x * NW, y * NH];
const r4 = (v: number) => Math.round(v * 10000) / 10000;

/** Warped copy of a view JSON (normalized coords) + `unwarp` (warped normalized → canonical normalized). */
export function warpViewData(d: ViewData, l: FaceLook): ViewData {
  const W = makeWarp(l);
  const f = (x: number, y: number): P => { const q = W.fwd(toPx(x, y)); return [r4(q[0] / NW), r4(q[1] / NH)]; };
  const fp = (p: [number, number]): [number, number] => f(p[0], p[1]);
  const meanJ = (x: number, y: number) => { const j = W.jac(toPx(x, y)); return Math.sqrt(j[0] * j[1]); };
  const out: ViewData = {
    ...d,
    points: d.points.map((p) => { const [x, y] = f(p.x, p.y); return { ...p, x, y, r: r4(p.r * Math.max(0.9, Math.min(1.15, meanJ(p.x, p.y)))) }; /* tolerance stays fair on small faces */ }),
    muscles: d.muscles.map((m) => ({ ...m, polygon: m.polygon.map(fp), strokes: m.strokes.map((s) => ({ from: fp(s.from), to: fp(s.to) })) })),
    forbidden: d.forbidden.map((z) => {
      const o = { ...z };
      if (z.x != null && z.y != null) {
        const j = W.jac(toPx(z.x, z.y));
        [o.x, o.y] = f(z.x, z.y);
        if (z.r != null) o.r = r4(z.r * Math.sqrt(j[0] * j[1]));
        if (z.rx != null) o.rx = r4(z.rx * j[0]);
        if (z.ry != null) o.ry = r4(z.ry * j[1]);
      }
      if (z.points) o.points = z.points.map(fp);
      return o;
    }),
    ...(d.zones ? { zones: d.zones.map((z) => ({ ...z, polygon: z.polygon.map(fp), ...(z.polygons ? { polygons: z.polygons.map((pp) => pp.map(fp)) } : {}) })) } : {}),
    unwarp: (p: [number, number]): [number, number] => { const q = W.inv(toPx(p[0], p[1])); return [q[0] / NW, q[1] / NH]; },
    faceKey: l.key,
  };
  return out;
}

// ───────────────────────────── SVG ─────────────────────────────

const num = (v: number) => (Math.round(v * 10) / 10).toString();

function warpPathD(d: string, fwd: (p: P) => P): string {
  const toks = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  if (!toks || /[^MLCQSTZz]/.test(toks.filter((t) => /[A-Za-z]/.test(t)).join(""))) return d; // unsupported → unchanged
  const out: string[] = [];
  let pend: number | null = null;
  for (const t of toks) {
    if (/[A-Za-z]/.test(t)) { out.push(t); pend = null; continue; }
    const v = parseFloat(t);
    if (pend === null) pend = v;
    else { const q = fwd([pend, v]); out.push(num(q[0]), num(q[1])); pend = null; }
  }
  return out.join(" ");
}

/** Warps every path / circle / ellipse of an SVG string (rects are left alone: the background). */
export function warpSvg(svg: string, W: Warp): string {
  return svg.replace(/<(path|circle|ellipse)\b([^>]*)>/g, (_all, tag: string, attrs: string) => {
    const get = (n: string) => { const m = new RegExp(`\\s${n}="([^"]*)"`).exec(attrs); return m ? parseFloat(m[1]) : null; };
    const set = (n: string, v: string) => { attrs = attrs.replace(new RegExp(`(\\s${n}=")[^"]*(")`), `$1${v}$2`); };
    if (tag === "path") {
      attrs = attrs.replace(/(\sd=")([^"]*)(")/, (_m, a, d, b) => a + warpPathD(d, W.fwd) + b);
    } else {
      const cx = get("cx") ?? 0, cy = get("cy") ?? 0;
      const q = W.fwd([cx, cy]), j = W.jac([cx, cy]);
      set("cx", num(q[0])); set("cy", num(q[1]));
      const r = get("r"); if (r != null) set("r", num(r * Math.sqrt(j[0] * j[1])));
      const rx = get("rx"); if (rx != null) set("rx", num(rx * j[0]));
      const ry = get("ry"); if (ry != null) set("ry", num(ry * j[1]));
    }
    return `<${tag}${attrs}>`;
  });
}

const mxP = (d: string) => d.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (_m, x, y) => `${num(1000 - parseFloat(x))} ${y}`);
const both = (d: string) => `${d} ${mxP(d)}`;
const HAIR = "var(--hair, #3b2a24)";
const LINE = "#b9876d";

/** Canonical hairline (must match V01: hair-covered points GV24 / ST8 sit relative to it). */
const HAIRLINE_IN = "C778 545 764 500 738 468 C680 432 580 418 500 418 C420 418 320 432 262 468 C236 500 222 545 215 600 Z";
/** Hair cap from the left temple (215,600) over the head to (785,600) and back along the hairline. */
function cap(top: number, side: number, bulge = 0): string {
  return `M215 600 C${205 - side} ${360 - bulge} ${320 - side / 2} ${top} 500 ${top} C${680 + side / 2} ${top} ${795 + side} ${360 - bulge} 785 600 ${HAIRLINE_IN}`;
}

function hairSvg(l: FaceLook): { back: string; front: string } {
  const back: string[] = [], front: string[] = [];
  const fill = `fill="${HAIR}"`;
  const sheen = (ds: string[], op = 0.14) => `<g fill="none" stroke="#ffffff" stroke-opacity="${op}" stroke-width="4" stroke-linecap="round">${ds.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  const grayStrands = l.gray ? sheen(["M470 250 C420 280 370 330 340 410", "M540 240 C600 270 650 330 680 420", "M500 225 C470 300 450 360 440 420", "M360 300 C330 340 300 380 285 450", "M640 300 C670 340 700 380 715 450"], l.gray === 2 ? 0.35 : 0.24) : "";
  const sheenBack = (ds: string[]) => sheen(ds, 0.12);
  const std = sheen(["M500 230 C420 250 330 310 290 420 M500 230 C580 250 670 310 710 420", "M470 240 C400 280 350 340 330 430 M530 240 C600 280 650 340 670 430"]);
  switch (l.hair) {
    case "bun":
      front.push(`<ellipse cx="500" cy="175" rx="95" ry="70" ${fill}/>`, `<path d="${cap(195, 0)}" ${fill}/>`, std,
        `<path d="M440 140 C470 120 530 120 560 140 M430 175 C460 160 540 160 570 175" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="4"/>`);
      break;
    case "ponytail":
      back.push(`<path d="M720 450 C830 520 876 680 864 850 C856 970 826 1060 792 1120 C774 1060 772 980 774 900 C776 800 768 650 712 540 Z" ${fill}/>`, sheenBack(["M800 560 C830 680 836 820 820 980"]));
      front.push(`<path d="${cap(200, 0)}" ${fill}/>`, std, `<path d="M742 452 C752 470 758 488 760 506" fill="none" stroke="#c9b48a" stroke-width="14" stroke-linecap="round"/>`);
      break;
    case "long-straight":
    case "long-wavy": {
      const wavy = l.hair === "long-wavy";
      const left = wavy
        ? "M236 380 C170 470 190 560 160 660 C130 760 190 840 150 940 C110 1040 170 1120 140 1210 C130 1250 150 1290 170 1300 L330 1290 C320 1200 330 1100 320 1000 L300 640 Z"
        : "M236 380 C180 470 168 600 162 760 C156 920 150 1080 146 1240 C146 1270 152 1290 160 1300 L330 1290 C322 1200 324 1100 322 1000 L300 640 Z";
      back.push(`<path d="${both(left)}" ${fill}/>`);
      front.push(`<path d="${cap(196, 6)}" ${fill}/>`, `<path d="M500 200 L500 418" stroke="#000000" stroke-opacity="0.16" stroke-width="3" fill="none"/>`, std,
        sheen(["M190 600 C176 760 170 920 166 1100 M810 600 C824 760 830 920 834 1100"], 0.12));
      break;
    }
    case "bob":
      back.push(`<path d="${both("M232 400 C182 500 168 640 172 800 C174 880 186 930 220 950 C250 960 290 958 316 950 C290 900 270 820 262 700 Z")}" ${fill}/>`);
      front.push(`<path d="${cap(192, 10, 10)}" ${fill}/>`, std, `<path d="M440 205 C420 260 410 330 412 420" stroke="#000000" stroke-opacity="0.16" stroke-width="3" fill="none"/>`);
      break;
    case "pixie":
      front.push(`<path d="${cap(206, -6)}" ${fill}/>`,
        `<path d="${both("M262 468 C250 440 246 410 262 380 C262 420 270 446 290 458 Z")}" ${fill}/>`,
        sheen(["M500 222 C450 250 380 300 340 380 M520 222 C580 250 640 300 670 380", "M460 236 C430 280 410 330 400 400"]));
      break;
    case "curly-short": {
      const curls: string[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * (1.04 + (i / 12) * 0.92);
        const cx = 500 + Math.cos(a) * 300, cy = 470 + Math.sin(a) * 290;
        curls.push(`<circle cx="${num(cx)}" cy="${num(cy)}" r="44" ${fill}/>`);
      }
      front.push(...curls, `<path d="${cap(185, 14, 8)}" ${fill}/>`,
        `<g fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="3.5" stroke-linecap="round">${[[360, 300], [450, 250], [550, 250], [640, 300], [300, 400], [700, 400], [500, 330], [410, 350], [590, 350]]
          .map(([x, y]) => `<path d="M${x - 14} ${y + 6} C${x - 10} ${y - 10} ${x + 10} ${y - 10} ${x + 14} ${y + 6}"/>`).join("")}</g>`);
      break;
    }
    case "short-male":
      front.push(`<path d="${cap(204, -8, 4)}" ${fill}/>`,
        sheen(["M480 230 C430 260 370 320 330 420 M520 230 C570 260 630 320 670 420", "M500 250 C520 300 540 340 560 380"]));
      break;
    case "side-part-male":
      front.push(`<path d="${cap(200, -6, 6)}" ${fill}/>`,
        `<path d="M405 220 C395 300 390 360 396 424" stroke="#000000" stroke-opacity="0.22" stroke-width="3.5" fill="none"/>`,
        sheen(["M420 300 C500 280 620 300 720 420", "M420 250 C500 230 620 250 700 330", "M410 360 C500 340 600 360 700 440", "M390 260 C350 290 310 340 290 420"]));
      break;
    case "buzz-male":
      front.push(`<path d="${cap(222, -14)}" ${fill} fill-opacity="0.82"/>`,
        `<g fill="${HAIR}" opacity="0.5">${Array.from({ length: 40 }, (_, i) => { const a = Math.PI * (1.1 + 0.8 * ((i * 0.7548776662) % 1)), k = 0.35 + 0.6 * ((i * 0.5698402910) % 1); return `<circle cx="${num(500 + Math.cos(a) * 250 * k)}" cy="${num(420 + Math.sin(a) * 180 * k)}" r="3"/>`; }).join("")}</g>`);
      break;
    case "receding-male":
      // Thinning front: the original hairline still shows faintly (GV24 / ST8 are measured from it).
      front.push(`<path d="${cap(206, -8)}" ${fill} fill-opacity="0.28"/>`,
        `<path d="M215 600 C205 360 316 206 500 206 C684 206 795 360 785 600 C776 540 760 470 730 420 C700 380 680 350 660 340 C620 360 560 372 500 372 C440 372 380 360 340 340 C320 350 300 380 270 420 C240 470 224 540 215 600 Z" ${fill}/>`,
        sheen(["M470 236 C420 260 370 300 340 340 M530 236 C580 260 630 300 660 340"], 0.18));
      break;
  }
  if (l.headband) front.push(`<path d="M222 540 C236 390 372 330 500 330 C628 330 764 390 778 540" fill="none" stroke="${l.headband}" stroke-width="32" stroke-linecap="round"/>`);
  if (grayStrands) front.push(grayStrands);
  return { back: back.join("\n"), front: front.join("\n") };
}

/** Age lines, cheek hollows, double chin, facial hair, earrings — canonical coords (warped afterwards). */
function detailSvg(l: FaceLook): string {
  const s: string[] = [];
  const line = (d: string, op: number, w = 3) => s.push(`<path d="${d}" fill="none" stroke="${LINE}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`);
  const a = l.age;
  if (a >= 35) {
    line(both("M440 690 C420 704 384 708 352 700"), a >= 55 ? 0.55 : 0.35, 2.5); // under-eye
    line(both("M446 772 C432 800 418 828 410 852"), a >= 55 ? 0.6 : 0.35); // nasolabial fold
  }
  if (a >= 45) {
    line("M390 480 C440 470 560 470 610 480 M410 515 C450 506 550 506 590 515", a >= 60 ? 0.5 : 0.32, 2.5); // forehead
    line(both("M292 642 L268 634 M292 656 L266 658 M292 670 L270 682"), a >= 60 ? 0.55 : 0.35, 2.5); // crow's feet
    line("M360 1020 C420 1034 580 1034 640 1020", 0.4, 2.5); // neck
  }
  if (a >= 58) {
    line(both("M412 884 C406 904 402 924 400 944"), 0.5); // marionette
    line("M486 566 L490 592 M514 566 L510 592", 0.4, 2.5); // glabella
    line("M370 1070 C430 1084 570 1084 630 1070", 0.35, 2.5);
    line(both("M262 872 C276 896 300 914 330 924"), 0.3, 3); // jowl
  }
  if (l.build === "hollow") {
    s.push(`<path d="${both("M250 780 C270 830 300 860 340 872 C330 840 320 800 300 770 C280 760 262 764 250 780 Z")}" fill="#a86f55" fill-opacity="0.16"/>`);
    line(both("M236 730 C270 760 310 772 360 772"), 0.45, 3);
  }
  if (l.build === "fat") {
    s.push(`<path d="M400 1000 C440 1030 560 1030 600 1000 C580 1040 420 1040 400 1000 Z" fill="#a86f55" fill-opacity="0.13"/>`);
    line("M410 1004 C450 1034 550 1034 590 1004", 0.55, 3.5); // double chin
    s.push(`<ellipse cx="320" cy="800" rx="60" ry="34" fill="#e9a99b" fill-opacity="0.18"/><ellipse cx="680" cy="800" rx="60" ry="34" fill="#e9a99b" fill-opacity="0.18"/>`);
  }
  if (l.beard.stubble) {
    const jaw = "M240 760 C246 830 262 870 300 920 C350 966 420 984 500 984 C580 984 650 966 700 920 C738 870 754 830 760 760 C730 800 700 830 660 850 C620 905 560 925 500 925 C440 925 380 905 340 850 C300 830 270 800 240 760 Z";
    const lip = "M420 846 C450 822 480 816 500 818 C520 816 550 822 580 846 C550 840 520 838 500 842 C480 838 450 840 420 846 Z";
    s.push(`<path d="${jaw} ${lip}" fill="${HAIR}" fill-opacity="0.16"/>`);
    // Stubble dots in a band along the lower face outline (R2 low-discrepancy sequence), not on the lips.
    const dots: string[] = [];
    for (let i = 1; dots.length < 90 && i < 400; i++) {
      const th = (0.1 + 0.8 * ((i * 0.7548776662) % 1)) * Math.PI, k = 0.8 + 0.17 * ((i * 0.5698402910) % 1);
      const x = 500 + Math.cos(th) * 250 * k, y = 760 + Math.sin(th) * 215 * k;
      if (y < 830 || (Math.abs(x - 500) < 112 && y < 905)) continue;
      dots.push(`<circle cx="${num(x)}" cy="${num(y)}" r="2.6"/>`);
    }
    s.push(`<g fill="${HAIR}" opacity="0.32">${dots.join("")}</g>`);
  }
  if (l.beard.mustache) {
    s.push(`<path d="M414 852 C430 826 470 818 500 830 C530 818 570 826 586 852 C566 846 536 842 500 846 C464 842 434 846 414 852 Z" fill="${HAIR}" fill-opacity="0.9"/>`);
  }
  if (l.earrings) {
    const r = l.earrings === "pearl" ? 9 : 6;
    s.push(`<circle cx="214" cy="800" r="${r}" fill="#fffaf3" stroke="#9a6a52" stroke-width="2"/><circle cx="786" cy="800" r="${r}" fill="#fffaf3" stroke="#9a6a52" stroke-width="2"/>`);
  }
  return s.join("\n");
}

const BROW_DARK = "#4a342c";

/**
 * This customer's V01 art: hair replaced by their style (long hair behind the head), age / build details and
 * facial hair added, brows thicker for men and lighter for gray hair, then the whole drawing warped.
 */
export function faceSvg(svg: string, l: FaceLook): string {
  const hair = hairSvg(l);
  let out = svg.replace(/<g id="hair"[^>]*>[\s\S]*?\n {2}<\/g>/, `<g id="hair" stroke-linecap="round" stroke-linejoin="round">\n${hair.front}\n  </g>`);
  out = out.replace(/(<g id="bg">[\s\S]*?<\/g>)/, `$1\n  <g id="hair-back" stroke="none">\n${hair.back}\n  </g>`);
  out = out.replace(/(<g id="skin-detail"[^>]*>)/, `$1\n${detailSvg(l)}`);
  const browW = l.male ? 15 : l.age >= 60 ? 10 : 12;
  const browC = l.gray === 2 ? "#9b8f87" : l.gray === 1 ? "#6d5f57" : BROW_DARK;
  out = out.replace(new RegExp(`stroke="${BROW_DARK}" stroke-width="12"`, "g"), `stroke="${browC}" stroke-width="${browW}"`);
  return warpSvg(out, makeWarp(l));
}

/** Face overlays drawn in V01 coords (V13 foam / mask / scrub) follow the same warp. */
export function faceOverlaySvg(svg: string, l: FaceLook): string {
  return warpSvg(svg, makeWarp(l));
}
