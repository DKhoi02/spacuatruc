import fs from 'fs';
const U = '/Users/dangkhoi/Documents/Project/spa_web_game/art/ui';
const ol = (w = 4) => `stroke="#8a5f4b" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const SK = '#f3d2bd', HAIR = '#3b2a24', PT = '#d98a83', MUS = '#d98a83';
const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="#fffaf3" opacity="0.9"/><circle cx="${x}" cy="${y}" r="5.5" fill="${PT}" ${ol(2.5)}/>`;
const motifs = {
  1: ['Mắt và trán', `
      <path d="M-30 -36 C -10 -40 10 -40 30 -36 M-24 -46 C -8 -49 8 -49 24 -46" stroke="#c9967c" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M-34 -16 C -18 -28 14 -28 32 -18" stroke="${HAIR}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M-36 12 C -18 -10 18 -10 36 12 C 18 32 -18 32 -36 12 Z" fill="#ffffff" ${ol(4)}/>
      <circle cx="0" cy="11" r="13" fill="#6b4434"/><circle cx="0" cy="11" r="6" fill="#2a1d18"/><circle cx="4" cy="7" r="3" fill="#ffffff"/>
      ${dot(0, -30)}`],
  2: ['Má, mũi, miệng', `
      <circle cx="-30" cy="0" r="12" fill="#e9a99b" opacity="0.7"/><circle cx="30" cy="0" r="12" fill="#e9a99b" opacity="0.7"/>
      <path d="M-2 -40 C -4 -22 -14 -8 -10 0 C -6 6 6 6 10 0 M-10 0 C -16 -2 -18 -8 -12 -10 M10 0 C 16 -2 18 -8 12 -10" stroke="#c9967c" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-26 22 C -12 12 -4 14 0 18 C 4 14 12 12 26 22 C 12 38 -12 38 -26 22 Z" fill="#d98a83" ${ol(4)}/>
      <path d="M-24 22 H24" stroke="#8a5f4b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      ${dot(-23, 2)}${dot(23, 2)}`],
  3: ['Cơ mặt', `
      <ellipse cx="0" cy="2" rx="32" ry="42" fill="${SK}" ${ol(4)}/>
      <path d="M-26 -22 C -14 -36 14 -36 26 -22 L 22 -14 C 10 -22 -10 -22 -22 -14 Z" fill="${MUS}" opacity="0.55"/>
      <path d="M-24 2 C -14 0 -10 10 -8 22 L -16 26 C -20 18 -24 10 -24 2 Z M24 2 C 14 0 10 10 8 22 L 16 26 C 20 18 24 10 24 2 Z" fill="${MUS}" opacity="0.55"/>
      <path d="M-14 -27 V-17 M-5 -29 V-19 M5 -29 V-19 M14 -27 V-17 M-20 6 L-13 22 M20 6 L13 22" stroke="#b86f68" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M-18 -8 C -14 -12 -8 -12 -4 -8 M4 -8 C 8 -12 14 -12 18 -8" stroke="#3d2c25" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M-8 30 C -3 34 3 34 8 30" stroke="#3d2c25" stroke-width="3" fill="none" stroke-linecap="round"/>`],
  4: ['Đầu', `<g transform="translate(0 8) scale(0.85)">
      <ellipse cx="0" cy="10" rx="34" ry="40" fill="${SK}" ${ol(4)}/>
      <path d="M-35 12 C -42 -34 -14 -46 0 -46 C 14 -46 42 -34 35 12 C 30 -8 18 -16 0 -16 C -18 -16 -30 -8 -35 12 Z" fill="${HAIR}" ${ol(4)}/>
      <path d="M-14 12 C -10 16 -4 16 0 12 M6 12 C 10 16 16 16 20 12" stroke="#3d2c25" stroke-width="3" fill="none" stroke-linecap="round" transform="translate(-3 0)"/>
      ${dot(0, -40)}${dot(-16, -36)}${dot(16, -36)}
      <path d="M-30 -56 C -18 -64 18 -64 30 -56" stroke="#fffaf3" stroke-width="3" fill="none" stroke-dasharray="3 6" stroke-linecap="round"/></g>`],
  5: ['Cổ và vai', `
      <path d="M-48 44 C -46 22 -32 12 -14 8 V-24 H14 V8 C 32 12 46 22 48 44 Z" fill="${SK}" ${ol(4)}/>
      <ellipse cx="0" cy="-30" rx="24" ry="20" fill="${HAIR}" ${ol(4)}/>
      <path d="M-12 -10 C -14 0 -30 10 -44 26 L -46 40 L -10 40 Z M12 -10 C 14 0 30 10 44 26 L 46 40 L 10 40 Z" fill="${MUS}" opacity="0.5"/>
      <path d="M0 -8 V40" stroke="#c9967c" stroke-width="2.5" stroke-dasharray="3 6" stroke-linecap="round"/>
      ${dot(-26, 14)}${dot(26, 14)}`],
  6: ['Tay', `
      <g ${ol(4)} fill="${SK}">
        <rect x="-22" y="-40" width="11" height="46" rx="5.5"/>
        <rect x="-9" y="-46" width="11" height="52" rx="5.5"/>
        <rect x="4" y="-42" width="11" height="48" rx="5.5"/>
        <rect x="17" y="-32" width="10" height="38" rx="5"/>
        <rect x="-40" y="-10" width="11" height="34" rx="5.5" transform="rotate(-38 -34 10)"/>
        <path d="M-24 -4 H27 V22 C 27 36 16 44 2 44 C -12 44 -22 36 -24 24 Z"/>
      </g>
      <path d="M-14 18 C -6 26 6 28 16 22" stroke="#c9967c" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      ${dot(-24, 4)}`],
  7: ['Lưng', `
      <path d="M-44 -30 C -30 -40 -14 -40 -10 -46 H10 C 14 -40 30 -40 44 -30 C 46 -6 34 10 30 46 H-30 C -34 10 -46 -6 -44 -30 Z" fill="${SK}" ${ol(4)}/>
      <path d="M-30 -24 C -20 -14 -16 0 -22 8 M30 -24 C 20 -14 16 0 22 8" stroke="#c9967c" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M0 -40 V44" stroke="#c9967c" stroke-width="3" stroke-dasharray="1 7" stroke-linecap="round"/>
      ${dot(-10, -6)}${dot(10, -6)}${dot(-10, 18)}${dot(10, 18)}`],
  8: ['Bàn chân', `
      <path d="M2 -30 C 22 -30 28 -10 24 10 C 20 26 22 46 4 48 C -14 50 -20 34 -18 16 C -16 0 -22 -30 2 -30 Z" fill="${SK}" ${ol(4)}/>
      <g fill="${SK}" ${ol(3)}>
        <circle cx="-12" cy="-40" r="8"/><circle cx="3" cy="-44" r="6"/><circle cx="14" cy="-42" r="5.5"/><circle cx="23" cy="-36" r="5"/><circle cx="30" cy="-28" r="4.5"/>
      </g>
      ${dot(2, -12)}`],
};
const pal = {
  1: ['#8fb39a', '#a9c9b3', '#e7b4a6'], 2: ['#e7b4a6', '#f0c6b8', '#8fb39a'], 3: ['#e8b46a', '#f6d7a7', '#8fb39a'], 4: ['#9fc0c6', '#cfe3e6', '#e7b4a6'],
  5: ['#4f7a62', '#8fb39a', '#e8b46a'], 6: ['#d98a83', '#f0c6b8', '#8fb39a'], 7: ['#c49a70', '#e8d2b8', '#8fb39a'], 8: ['#8fb39a', '#cfe3e6', '#d98a83'],
};
for (let ch = 1; ch <= 8; ch++) {
  const [ring, inner, ribbon] = pal[ch]; const [name, motif] = motifs[ch];
  const scallop = Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return `<circle cx="${(100 + 78 * Math.cos(a)).toFixed(1)}" cy="${(92 + 78 * Math.sin(a)).toFixed(1)}" r="12" fill="${ring}"/>`; }).join('');
  fs.writeFileSync(`${U}/badge-ch${ch}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220">
  <title>Huy hiệu Chương ${ch} – ${name}</title>
  <g id="ribbon" ${ol(4)}>
    <path d="M66 140 L48 212 L66 202 L80 214 L92 150 Z" fill="${ribbon}"/>
    <path d="M134 140 L152 212 L134 202 L120 214 L108 150 Z" fill="${ribbon}"/>
  </g>
  <g id="medal">
    <g ${ol(8)}>${scallop}</g>
    <g>${scallop}</g>
    <circle cx="100" cy="92" r="78" fill="${ring}"/>
    <circle cx="100" cy="92" r="62" fill="${inner}" ${ol(4)}/>
    <circle cx="100" cy="92" r="54" fill="#fffaf3"/>
  </g>
  <g id="motif" transform="translate(100 96)">${motif}
  </g>
</svg>
`);
}
// title badge
const leaf = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="15" fill="#8fb39a" transform="rotate(${r} ${x} ${y})" ${ol(3)}/>`;
let laurel = '';
for (let i = 0; i < 6; i++) { const deg = 125 + i * 21; const a = deg * Math.PI / 180; const x = 300 + 84 * Math.cos(a), y = 92 + 84 * Math.sin(a); laurel += leaf(x.toFixed(1), y.toFixed(1), (deg + 90 + 25).toFixed(0)); laurel += leaf((600 - x).toFixed(1), y.toFixed(1), (-(deg + 90 + 25)).toFixed(0)); }
fs.writeFileSync(`${U}/title-ktv-tri-lieu.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 250" font-family="Helvetica, Arial, sans-serif">
  <title>Danh hiệu Kỹ thuật viên trị liệu</title>
  <g id="laurel">${laurel}</g>
  <g id="emblem" ${ol(4)}>
    <circle cx="300" cy="92" r="66" fill="#e8b46a"/>
    <circle cx="300" cy="92" r="52" fill="#fffaf3"/>
    <path d="M300 128 C 282 108 282 80 300 58 C 318 80 318 108 300 128 Z" fill="#f0c6b8" stroke-width="3"/>
    <path d="M300 128 C 276 124 260 108 256 88 C 278 90 294 104 300 128 Z M300 128 C 324 124 340 108 344 88 C 322 90 306 104 300 128 Z" fill="#e7b4a6" stroke-width="3"/>
    <path d="M268 132 H332" stroke="#8fb39a" stroke-width="5"/>
    <circle cx="300" cy="96" r="6" fill="#d98a83" stroke-width="2.5"/>
  </g>
  <g id="banner" ${ol(4)}>
    <path d="M70 164 H120 V222 H70 L88 193 Z" fill="#e7b4a6"/>
    <path d="M530 164 H480 V222 H530 L512 193 Z" fill="#e7b4a6"/>
    <path d="M100 210 L120 222 V210 Z M500 210 L480 222 V210 Z" fill="#c98e80"/>
    <rect x="100" y="152" width="400" height="58" rx="10" fill="#8fb39a"/>
    <path d="M114 162 H486 M114 200 H486" stroke="#a9c9b3" stroke-width="3" fill="none"/>
  </g>
  <text id="title-text" x="300" y="191" font-size="29" font-weight="700" fill="#fffaf3" text-anchor="middle">Kỹ thuật viên trị liệu</text>
</svg>
`);
console.log('ok');
