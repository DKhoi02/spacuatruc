import fs from 'fs';
const A = '/Users/dangkhoi/Documents/Project/spa_web_game/art/app';
const icon = fs.readFileSync(`${A}/icon.svg`, 'utf8').match(/<g id="icon">([\s\S]*)<\/g>\s*<\/svg>/)[1];
const OL = 'stroke="#8a5f4b" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
const T = '#3d2c25', T2 = '#8a5f4b';
// app icon as symbol, clipped to rounded square
const defs = `
  <defs>
    <clipPath id="ins-icon-clip"><rect width="512" height="512" rx="115"/></clipPath>
    <symbol id="ins-app-icon" viewBox="0 0 512 512"><g clip-path="url(#ins-icon-clip)">${icon}</g></symbol>
  </defs>`;
const phone = inner => `
  <rect x="20" y="10" width="260" height="500" rx="40" fill="#fffaf3" ${OL}/>
  <rect x="34" y="24" width="232" height="472" rx="28" fill="#fbf6f0" stroke="#e8d2b8" stroke-width="2"/>
  <rect x="115" y="32" width="70" height="14" rx="7" fill="#3d2c25"/>${inner}`;
const shareIcon = (x, y, s = 1, c = '#4f86c6') => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-5 -4 H-9 V11 H9 V-4 H5"/><path d="M0 4 V-12 M-5 -7 L0 -12 L5 -7"/>
  </g>`;
const plusSquare = (x, y, c = T) => `
  <g transform="translate(${x} ${y})" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <rect x="-9" y="-9" width="18" height="18" rx="4"/><path d="M0 -4 V4 M-4 0 H4"/>
  </g>`;
const finger = (x, y) => `
  <g transform="translate(${x} ${y})">
    <circle r="22" fill="#e7b4a6" opacity="0.35"/>
    <circle r="13" fill="none" stroke="#d98a83" stroke-width="3"/>
    <path d="M6 10 C 6 2 12 0 14 4 L 14 2 C 14 -2 20 -2 21 2 L 21 0 C 22 -3 27 -3 28 1 L 28 22 C 28 36 20 44 10 44 C 0 44 -4 38 -8 30 L -14 18 C -16 13 -10 10 -6 14 L 0 20 L 0 -10 C 0 -16 6 -16 6 -10 Z" fill="#f3d2bd" stroke="#9a6a52" stroke-width="2.5" stroke-linejoin="round" transform="translate(2 20)"/>
  </g>`;
const page = `
  <g>
    <rect x="58" y="96" width="184" height="110" rx="14" fill="#f4e6d6"/>
    <use href="#ins-app-icon" x="122" y="110" width="56" height="56"/>
    <rect x="96" y="178" width="108" height="10" rx="5" fill="#8fb39a"/>
    <rect x="58" y="222" width="184" height="10" rx="5" fill="#e8d2b8"/>
    <rect x="58" y="242" width="150" height="10" rx="5" fill="#e8d2b8"/>
    <rect x="58" y="262" width="170" height="10" rx="5" fill="#e8d2b8"/>
    <rect x="58" y="292" width="88" height="34" rx="17" fill="#8fb39a"/>
    <rect x="58" y="342" width="184" height="10" rx="5" fill="#e8d2b8"/>
    <rect x="58" y="362" width="130" height="10" rx="5" fill="#e8d2b8"/>
  </g>`;
const urlBar = `
  <rect x="48" y="56" width="204" height="28" rx="10" fill="#efe6dc"/>
  <text x="150" y="75" font-size="12" fill="${T2}" text-anchor="middle">dkhoi02.github.io/spa_web_game</text>`;
const toolbar = `
  <rect x="34" y="440" width="232" height="56" fill="#f6efe7"/>
  <path d="M34 440 H266" stroke="#e8d2b8" stroke-width="2"/>
  <g fill="none" stroke="#4f86c6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M64 458 L56 466 L64 474"/>
    <path d="M100 458 L108 466 L100 474" stroke="#b9c9d6"/>
    <path d="M182 458 C 188 456 194 456 198 460 C 202 456 208 456 214 458 V476 C 208 474 202 474 198 478 C 194 474 188 474 182 476 Z"/>
    <rect x="232" y="458" width="16" height="16" rx="3"/><path d="M236 454 H252 V470"/>
  </g>`;
const svg = (title, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 520" font-family="Helvetica, Arial, sans-serif">
  <title>${title}</title>${defs}${phone(body)}
</svg>
`;
// 1 – Safari, share button highlighted
fs.writeFileSync(`${A}/install-1-safari.svg`, svg('Bước 1: mở trang trong Safari, bấm nút Chia sẻ', urlBar + page + toolbar + `
  <circle cx="150" cy="466" r="20" fill="#fffaf3" stroke="#d98a83" stroke-width="4"/>` + shareIcon(150, 467) + finger(150, 466)));
// 2 – share sheet
const row = (y, label, icon, hi = false) => `
  <g>
    ${hi ? `<rect x="46" y="${y - 20}" width="208" height="40" rx="10" fill="#f0c6b8" stroke="#d98a83" stroke-width="3"/>` : `<path d="M60 ${y + 20} H240" stroke="#efe6dc" stroke-width="2"/>`}
    <text x="62" y="${y + 5}" font-size="${hi ? 12.5 : 13}" ${hi ? 'font-weight="700"' : ''} fill="${T}">${label}</text>
    ${icon(238, y)}
  </g>`;
const iconCopy = (x, y) => `<g transform="translate(${x} ${y})" fill="none" stroke="${T}" stroke-width="2.2" stroke-linejoin="round"><rect x="-8" y="-6" width="12" height="15" rx="2"/><path d="M-4 -6 V-10 H8 V5 H4"/></g>`;
const iconBook = (x, y) => `<g transform="translate(${x} ${y})" fill="none" stroke="${T}" stroke-width="2.2" stroke-linejoin="round"><path d="M-10 -7 C -6 -9 -2 -9 0 -6 C 2 -9 6 -9 10 -7 V8 C 6 6 2 6 0 9 C -2 6 -6 6 -10 8 Z"/></g>`;
const iconGlasses = (x, y) => `<g transform="translate(${x} ${y})" fill="none" stroke="${T}" stroke-width="2.2"><circle cx="-5" cy="2" r="4.5"/><circle cx="6" cy="2" r="4.5"/><path d="M-1 2 H2"/></g>`;
fs.writeFileSync(`${A}/install-2-share-sheet.svg`, svg('Bước 2: chọn Thêm vào Màn hình chính', urlBar + page + `
  <rect x="34" y="24" width="232" height="472" rx="28" fill="#3d2c25" opacity="0.28"/>
  <path d="M34 180 Q34 166 48 166 H252 Q266 166 266 180 V468 Q266 496 238 496 H62 Q34 496 34 468 Z" fill="#fffaf3" stroke="#e8d2b8" stroke-width="2"/>
  <rect x="130" y="174" width="40" height="5" rx="2.5" fill="#d8c8b8"/>
  <use href="#ins-app-icon" x="50" y="190" width="34" height="34"/>
  <text x="94" y="204" font-size="13" font-weight="700" fill="${T}">Spa của Trúc</text>
  <text x="94" y="219" font-size="11" fill="${T2}">dkhoi02.github.io/spa_web_game</text>
  <path d="M46 236 H254" stroke="#efe6dc" stroke-width="2"/>
  ${[0, 1, 2, 3, 4].map(i => `<circle cx="${66 + i * 42}" cy="264" r="15" fill="${['#cfe3e6', '#a9c9b3', '#f0c6b8', '#e8d2b8', '#efe6dc'][i]}"/>`).join('')}
  <path d="M46 292 H254" stroke="#efe6dc" stroke-width="2"/>` +
  row(318, 'Sao chép', iconCopy) + row(358, 'Thêm vào Danh sách đọc', iconGlasses) + row(398, 'Thêm Dấu trang', iconBook) +
  row(442, 'Thêm vào Màn hình chính', (x, y) => plusSquare(x, y), true) + finger(238, 444)));
// 3 – home screen
const cols = ['#cfe3e6', '#a9c9b3', '#f0c6b8', '#e8d2b8', '#d8b48c', '#b9cfd6', '#e7b4a6', '#c9dccd'];
let apps = '';
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
  const x = 52 + c * 52, y = 74 + r * 66;
  if (r === 2 && c === 1) continue;
  apps += `<rect x="${x}" y="${y}" width="40" height="40" rx="10" fill="${cols[(r * 4 + c) % 8]}"/><rect x="${x + 6}" y="${y + 46}" width="28" height="5" rx="2.5" fill="#d8c8b8"/>`;
}
fs.writeFileSync(`${A}/install-3-home.svg`, svg('Bước 3: biểu tượng game xuất hiện trên màn hình chính', `
  <rect x="34" y="24" width="232" height="472" rx="28" fill="#f4e6d6"/>
  <text x="150" y="62" font-size="11" fill="${T2}" text-anchor="middle" opacity="0">.</text>
  ${apps}
  <circle cx="124" cy="226" r="34" fill="#ffe9a8" opacity="0.7"/>
  <circle cx="124" cy="226" r="30" fill="none" stroke="#d98a83" stroke-width="3" stroke-dasharray="5 5"/>
  <use href="#ins-app-icon" x="104" y="206" width="40" height="40"/>
  <rect x="88" y="254" width="72" height="15" rx="7.5" fill="#fffaf3" opacity="0.92"/>
  <text x="124" y="265" font-size="10" font-weight="700" fill="${T}" text-anchor="middle">Spa của Trúc</text>
  <rect x="48" y="420" width="204" height="62" rx="20" fill="#fffaf3" opacity="0.8"/>
  ${[0, 1, 2, 3].map(i => `<rect x="${62 + i * 47}" y="431" width="40" height="40" rx="10" fill="${cols[i + 3]}"/>`).join('')}
  <path d="M196 196 L206 186 M208 210 L222 206 M186 186 L188 172" stroke="#e8b46a" stroke-width="4" stroke-linecap="round"/>
  <rect x="115" y="486" width="70" height="4" rx="2" fill="#3d2c25"/>`));
console.log('ok');
