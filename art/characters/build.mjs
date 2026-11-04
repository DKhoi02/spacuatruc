#!/usr/bin/env node
// Ghép chân dung nhân vật từ parts/ theo characters.json → out/<id>-<expression>.svg
// Chạy:  node art/characters/build.mjs            (tất cả)
//        node art/characters/build.mjs anh-khoi   (chỉ 1 hoặc vài nhân vật)
// Không cần npm. Node >= 18.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PARTS = join(ROOT, "parts");
const OUT = join(ROOT, "out");
const manifest = JSON.parse(readFileSync(join(ROOT, "characters.json"), "utf8"));
const palette = JSON.parse(readFileSync(join(ROOT, "palette.json"), "utf8"));

const OUTLINE = "#8a5f4b";
const CLASS_ATTRS = {
  ol: `stroke="${OUTLINE}" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"`,
  ol2: `stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`,
};

// ---------- đọc part: tách các <g data-layer="..."> cấp ngoài cùng ----------
const partCache = new Map();
function loadPart(kind, name) {
  const key = `${kind}/${name}`;
  if (partCache.has(key)) return partCache.get(key);
  let src;
  try { src = readFileSync(join(PARTS, kind, `${name}.svg`), "utf8"); }
  catch { throw new Error(`Không tìm thấy part ${key}.svg`); }
  src = src.replace(/<!--[\s\S]*?-->/g, "");
  const layers = {};
  const tagRe = /<(\/?)g\b[^>]*?(\/?)>/g;
  let depth = 0, start = -1, layerName = null, m;
  while ((m = tagRe.exec(src))) {
    const closing = m[1] === "/", selfClosing = m[2] === "/";
    if (selfClosing) continue;
    if (!closing) {
      if (depth === 0) {
        const lm = /data-layer="([^"]+)"/.exec(m[0]);
        if (!lm) throw new Error(`${key}: <g> cấp ngoài thiếu data-layer`);
        layerName = lm[1]; start = m.index;
      }
      depth++;
    } else {
      depth--;
      if (depth === 0) {
        const chunk = src.slice(start, m.index + m[0].length)
          .replace(/\sdata-layer="[^"]+"/, ` data-part="${key}"`);
        layers[layerName] = (layers[layerName] || "") + chunk.trim() + "\n";
      }
    }
  }
  partCache.set(key, layers);
  return layers;
}

// ---------- màu ----------
function colorOf(v) {
  if (v == null) return v;
  if (/^#|^rgb|^hsl/.test(v)) return v;
  if (palette.cloth[v]) return palette.cloth[v];
  throw new Error(`Màu không có trong palette.cloth: ${v}`);
}
function varsFor(c) {
  const skin = palette.skin[c.skin];
  const hair = palette.hair[c.hairColor];
  if (!skin) throw new Error(`${c.id}: skin "${c.skin}" không có`);
  if (!hair) throw new Error(`${c.id}: hairColor "${c.hairColor}" không có`);
  const vars = {
    skin: skin.skin, "skin-shade": skin.skinShade, blush: skin.blush,
    hair: hair.hair, "hair-shade": hair.hairShade, brow: hair.brow,
  };
  for (const [k, v] of Object.entries(c.colors || {})) vars[k] = colorOf(v);
  return vars;
}

// var(--x, fallback): thay fallback bằng màu của nhân vật; giữ biến để code đổi màu được.
// Thuộc tính trình bày (fill/stroke) được viết thành fill="#hex" style="fill:var(--x, #hex)"
// để hình vẫn đúng màu cả ở trình duyệt/công cụ không hỗ trợ var() trong thuộc tính.
function resolve(svg, vars, c, uid) {
  const browW = String(c.browWidth ?? 5.5);
  svg = svg.replace(/stroke-width="var\(--brow-w,\s*[^)]+\)"/g, `stroke-width="${browW}"`);
  svg = svg.replace(/var\(--([\w-]+),\s*([^)]+)\)/g, (_, name, fb) => `var(--${name}, ${vars[name] ?? fb.trim()})`);
  svg = svg.replace(/\b(fill|stroke)="var\(--([\w-]+), ([^)]+)\)"/g, (_, attr, name, val) => `${attr}="${val}" style="${attr}:var(--${name}, ${val})"`);
  // gộp 2 style trên cùng 1 phần tử (fill + stroke)
  svg = svg.replace(/style="([^"]*)"((?:\s+[\w-]+="[^"]*")*?)\s+style="([^"]*)"/g, (_, a, mid, b) => `style="${a};${b}"${mid}`);
  svg = svg.replace(/\sclass="(ol2?)"/g, (_, k) => ` ${CLASS_ATTRS[k]}`);
  // id duy nhất cho mỗi file (khi nhiều SVG được nhúng chung 1 trang)
  svg = svg.replace(/\bid="([^"]+)"/g, `id="${uid}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${uid}-$1)`);
  return svg;
}

const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function compose(c, expr) {
  const sources = {
    hair: loadPart("hair", c.hair),
    outfit: loadPart("outfits", c.outfit),
    head: loadPart("heads", c.head),
    expr: loadPart("expressions", expr),
  };
  const accs = (c.accessories || []).map((a) => loadPart("accessories", a));
  const hidesEars = /data-hides-ears="true"/.test(sources.hair.front || "");
  const body = manifest.layerOrder.map((slot) => {
    const [src, layer] = slot.split(":");
    if (hidesEars && layer === "ears") return "";
    const content = src === "acc" ? accs.map((a) => a[layer] || "").join("") : (sources[src][layer] || "");
    return content ? `<g class="layer-${src}-${layer}">\n${content}</g>\n` : "";
  }).join("");
  const label = `${c.name} – ${manifest.expressionLabels[expr] || expr}`;
  const uid = `${c.id}-${expr}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${escapeXml(label)}" data-character="${c.id}" data-expression="${expr}">
<title>${escapeXml(label)}</title>
${resolve(body, varsFor(c), c, uid)}</svg>
`;
}

// ---------- chạy ----------
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
if (!only.length) for (const f of readdirSync(OUT)) if (f.endsWith(".svg")) rmSync(join(OUT, f));

const index = [];
let n = 0;
for (const c of manifest.characters) {
  if (only.length && !only.includes(c.id)) continue;
  const exprs = c.expressions || manifest.expressionSets[c.expressionSet];
  if (!exprs) throw new Error(`${c.id}: thiếu expressionSet`);
  const files = {};
  for (const e of exprs) {
    const file = `${c.id}-${e}.svg`;
    writeFileSync(join(OUT, file), compose(c, e));
    files[e] = file; n++;
  }
  index.push({ id: c.id, name: c.name, group: c.group, roleLabel: c.roleLabel, defaultExpression: c.defaultExpression, files });
}
if (!only.length) writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`Đã ghép ${n} SVG cho ${index.length} nhân vật → ${OUT}`);
