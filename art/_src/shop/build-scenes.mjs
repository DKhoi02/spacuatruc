// Builds art/shop/S0x.svg + S0x.slots.json from one definition, and preview PNG sources (scratch).
import fs from 'fs';
const ROOT = '/Users/dangkhoi/Documents/Project/spa_web_game/art';
const SCR = '/private/tmp/claude-501/-Users-dangkhoi-Documents-Project-spa-web-game/e12c28a8-2539-4073-bb39-cdbdb77c1e92/scratchpad/scenes-lv';
const OL = 'stroke="#8a5f4b" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
const ol = w => `stroke="#8a5f4b" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const FLOOR_Y = 700, BACK = 720, FRONT = 940;

// equipment native sizes (viewBox w,h) — slots are made exactly this size (1:1 scale)
const EQ = {
  E01: [300, 140], 'E01-upgraded': [300, 140], E02: [130, 116], E03: [100, 240], E05: [140, 230],
  E06: [320, 220], E07: [150, 84], E08: [120, 210], E09: [190, 130], E10: [300, 230],
};
const ITEMS = ['I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I08'];

// ---------- shared background pieces ----------
const wall = (fill = '#f4e6d6') => `
    <rect id="wall" x="0" y="0" width="1000" height="${FLOOR_Y}" fill="${fill}"/>`;
const cornice = (fill = '#fffaf3') => `
    <rect x="-4" y="-4" width="1008" height="30" fill="${fill}" ${OL}/>`;
const floor = (fill = '#d8b48c', line = '#c49a70') => {
  const rows = [FLOOR_Y, 760, 830, 910];
  let seams = '';
  const offs = [[180, 520, 860], [90, 400, 700], [260, 600, 920], [140, 470, 780]];
  for (let i = 0; i < rows.length; i++) {
    const y0 = rows[i], y1 = rows[i + 1] ?? 1000;
    seams += offs[i].map(x => `M${x} ${y0} V${y1}`).join(' ') + ' ';
  }
  return `
    <rect id="floor" x="0" y="${FLOOR_Y}" width="1000" height="${1000 - FLOOR_Y}" fill="${fill}"/>
    <path d="M0 760 H1000 M0 830 H1000 M0 910 H1000 ${seams}" stroke="${line}" stroke-width="3" fill="none"/>
    <path d="M-4 ${FLOOR_Y} H1004" ${OL} fill="none"/>
    <rect x="-4" y="${FLOOR_Y - 18}" width="1008" height="18" fill="#e8d2b8" ${OL}/>`;
};
const pendant = (x, len, shade = '#fffaf3', id = '') => `
    <g ${OL} fill="${shade}">
      <line x1="${x}" y1="26" x2="${x}" y2="${len}"/>
      <path d="M${x - 38} ${len + 28} A38 28 0 0 1 ${x + 38} ${len + 28} Z"/>
    </g>
    <circle ${id ? `class="${id}"` : ''} cx="${x}" cy="${len + 31}" r="9" fill="#ffe9a8"/>`;
const plant = (x, base, s = 1) => `
    <g transform="translate(${x} ${base}) scale(${s})" ${OL}>
      <ellipse cx="-14" cy="-90" rx="18" ry="42" fill="#8fb39a" transform="rotate(-20 -14 -90)"/>
      <ellipse cx="14" cy="-95" rx="18" ry="46" fill="#7aa588" transform="rotate(15 14 -95)"/>
      <ellipse cx="0" cy="-110" rx="16" ry="50" fill="#8fb39a"/>
      <path d="M-30 -52 H30 L22 0 H-22 Z" fill="#e7b4a6"/>
    </g>`;
const window_ = (x, y, w, h, curtain = '#f0c6b8') => `
    <g ${OL}>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#cfe3e6"/>
      <path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" fill="none"/>
      <path d="M${x + 22} ${y + 30} L${x + 52} ${y + 60} M${x + w / 2 + 22} ${y + 30} L${x + w / 2 + 52} ${y + 60}" stroke="#ffffff" stroke-width="6"/>
      <rect x="${x - 14}" y="${y + h}" width="${w + 28}" height="14" rx="5" fill="#c49a70"/>
      <path d="M${x - 20} ${y - 8} H${x + w + 20}" stroke-width="6" fill="none"/>
      <path d="M${x - 14} ${y - 8} H${x + 40} C ${x + 30} ${y + h * 0.5} ${x + 40} ${y + h * 0.8} ${x + 26} ${y + h + 10} H${x - 14} Z" fill="${curtain}"/>
      <path d="M${x + w + 14} ${y - 8} H${x + w - 40} C ${x + w - 30} ${y + h * 0.5} ${x + w - 40} ${y + h * 0.8} ${x + w - 26} ${y + h + 10} H${x + w + 14} Z" fill="${curtain}"/>
    </g>`;
const art = (x, y, w = 160, h = 110) => `
    <g ${OL}>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#fffaf3"/>
      <path d="M${x + 20} ${y + h - 20} C ${x + 50} ${y + 35} ${x + 80} ${y + 35} ${x + 100} ${y + 70} C ${x + 115} ${y + 50} ${x + 130} ${y + 50} ${x + w - 20} ${y + h - 20} Z" fill="#b8d3bf" stroke="none"/>
      <circle cx="${x + w - 35}" cy="${y + 30}" r="12" fill="#f2c9a0" stroke="none"/>
    </g>`;
const shelf = (x, w, ys) => ys.map(y => `
    <g ${OL}>
      <rect x="${x}" y="${y}" width="${w}" height="14" rx="5" fill="#d8b48c"/>
      <path d="M${x + 24} ${y + 14} L${x + 24} ${y + 40} L${x + 50} ${y + 14} M${x + w - 24} ${y + 14} L${x + w - 24} ${y + 40} L${x + w - 50} ${y + 14}" fill="none" stroke-width="3"/>
    </g>`).join('');

// ---------- slot helpers ----------
function slot(id, x, base, size, accepts, extra = {}) {
  const [w, h] = size;
  return { id, x, y: base - h, w, h, accepts, ...extra };
}
const itemSlot = (id, x, boardY, s = 70) => ({ id, x, y: boardY - s, w: s, h: s, accepts: ITEMS, fit: 'contain', kind: 'supply' });
const slotSvg = s => `
    <g id="slot-${s.id}" data-slot="${s.id}" data-accepts="${s.accepts.join(' ')}" transform="translate(${s.x} ${s.y})"></g>`;

function buildScene(def) {
  const layerSvg = def.layers.map(L => {
    if (L.slots) return `  <g id="${L.id}">${L.slots.map(slotSvg).join('')}\n  </g>`;
    if (L.empty) return `  <g id="${L.id}"></g>`;
    return `  <g id="${L.id}"${L.attrs ? ' ' + L.attrs : ''}>${L.svg}\n  </g>`;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" font-family="Helvetica, Arial, sans-serif">
  <title>${def.scene} ${def.title}</title>${def.defs ? `\n  <defs>${def.defs}\n  </defs>` : ''}
${layerSvg}
</svg>
`;
  const n = v => Math.round(v / 1000 * 10000) / 10000;
  const slots = [];
  def.layers.forEach(L => (L.slots || []).forEach(s => slots.push({
    id: s.id, group: `slot-${s.id}`, layer: L.id,
    x: n(s.x), y: n(s.y), width: n(s.w), height: n(s.h),
    anchor: 'bottom-center', fit: s.fit || 'native', kind: s.kind || 'equipment',
    accepts: s.accepts, ...(s.default ? { default: s.default } : {}), ...(s.overlay ? { overlay: s.overlay } : {}),
    ...(s.note ? { note: s.note } : {}),
  })));
  const json = {
    scene: def.scene, title: def.title, svg: `${def.scene}.svg`, frame: { width: 1000, height: 1000 },
    coords: 'x, y, width, height normalized 0–1 (svg units / 1000). Box top-left = (x, y). Equipment slots are exactly the equipment viewBox size, so equipment is drawn 1:1 (scale = 1) at translate(x*1000, y*1000). fit "contain" = scale down into the box keeping aspect, aligned bottom-center (preserveAspectRatio="xMidYMax meet").',
    layers: def.layers.map(L => ({ id: L.id, role: L.role })),
    floorY: n(FLOOR_Y), rows: { back: n(BACK), front: n(FRONT) },
    ...(def.text ? { text: def.text } : {}),
    slots,
    ...(def.anchors ? { anchors: def.anchors.map(a => ({ id: a.id, x: n(a.x), y: n(a.y), note: a.note })) } : {}),
    ...(def.toggles ? { toggles: def.toggles } : {}),
  };
  fs.writeFileSync(`${ROOT}/shop/${def.scene}.svg`, svg);
  fs.writeFileSync(`${ROOT}/shop/${def.scene}.slots.json`, JSON.stringify(json, null, 2) + '\n');
  // preview: fill slots with def.preview[slotId] = equipment id
  let prev = svg;
  for (const [sid, eid] of Object.entries(def.preview || {})) {
    const s = slots.find(q => q.id === sid);
    const file = eid.startsWith('I') ? `${ROOT}/items/${eid}.svg` : `${ROOT}/equipment/${eid}.svg`;
    const src = fs.readFileSync(file, 'utf8');
    const vb = src.match(/viewBox="([^"]+)"/)[1];
    const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>.*?<\/title>/, '');
    const nested = `<svg x="0" y="0" width="${s.width * 1000}" height="${s.height * 1000}" viewBox="${vb}" preserveAspectRatio="xMidYMax meet" overflow="visible">${inner}</svg>`;
    prev = prev.replace(`data-slot="${sid}" `, `data-slot="${sid}" data-filled="1" `).replace(new RegExp(`(<g id="slot-${sid}"[^>]*>)(</g>)`), `$1${nested}$2`);
  }
  if (def.previewShow) for (const id of def.previewShow) prev = prev.replace(`id="${id}" style="display:none"`, `id="${id}"`);
  if (def.slotDebug !== false) {
    const boxes = slots.map(s => `<rect x="${s.x * 1000}" y="${s.y * 1000}" width="${s.width * 1000}" height="${s.height * 1000}" fill="none" stroke="#4f86c6" stroke-width="2" stroke-dasharray="6 4"/><text x="${s.x * 1000 + 3}" y="${s.y * 1000 + 14}" font-size="13" fill="#4f86c6">${s.id}</text>`).join('');
    fs.writeFileSync(`${SCR}/${def.scene}-slots.svg`, svg.replace('</svg>', `<g>${boxes}</g></svg>`));
  }
  fs.writeFileSync(`${SCR}/${def.scene}-preview.svg`, prev);
}

// =====================================================================
// S01 – Sảnh
// =====================================================================
const signGroup = (x, y, w) => `
  <g id="sign">
    <path d="M${x + 50} 26 V${y} M${x + w - 50} 26 V${y}" ${ol(3)} fill="none"/>
    <rect id="shop-sign" x="${x}" y="${y}" width="${w}" height="84" rx="18" fill="#8fb39a" ${OL}/>
    <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="64" rx="12" fill="none" stroke="#a9c9b3" stroke-width="3"/>
    <text id="shop-name" x="${x + w / 2}" y="${y + 54}" font-size="34" font-weight="700" fill="#fffaf3" text-anchor="middle">Tên tiệm</text>
  </g>`;
const door = (x, y = 360, w = 170) => `
    <g ${OL}>
      <rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${FLOOR_Y - y + 12}" rx="8" fill="#c49a70"/>
      <rect x="${x}" y="${y}" width="${w}" height="${FLOOR_Y - y}" rx="6" fill="#cfe3e6"/>
      <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${FLOOR_Y}"/>
      <path d="M${x + 20} ${y + 30} L${x + 50} ${y + 60} M${x + w / 2 + 20} ${y + 30} L${x + w / 2 + 50} ${y + 60}" stroke="#ffffff" stroke-width="6"/>
    </g>
    <circle cx="${x + w / 2 - 13}" cy="${y + 170}" r="6" fill="#8a5f4b"/><circle cx="${x + w / 2 + 13}" cy="${y + 170}" r="6" fill="#8a5f4b"/>`;
const counter = (x, w = 300) => `
    <g ${OL}>
      <rect x="${x}" y="540" width="${w}" height="24" rx="6" fill="#c49a70"/>
      <rect x="${x + 15}" y="564" width="${w - 30}" height="${BACK - 564}" fill="#e8d2b8"/>
      <path d="M${x + 35} 590 H${x + w - 35} M${x + 35} ${BACK - 30} H${x + w - 35}" stroke="#c49a70" stroke-width="3" fill="none"/>
      <circle cx="${x + w / 2}" cy="638" r="20" fill="#8fb39a"/>
    </g>
    <path d="M${x + w / 2 - 11} 638 C ${x + w / 2 - 5} 625 ${x + w / 2 + 5} 625 ${x + w / 2 + 11} 638 C ${x + w / 2 + 5} 651 ${x + w / 2 - 5} 651 ${x + w / 2 - 11} 638 Z" fill="#fffaf3"/>
    <g ${OL}>
      <path d="M${x + w - 60} 540 C ${x + w - 65} 515 ${x + w - 50} 505 ${x + w - 50} 505 C ${x + w - 50} 505 ${x + w - 35} 515 ${x + w - 40} 540 Z" fill="#cfe3e6"/>
      <circle cx="${x + w - 58}" cy="495" r="9" fill="#e7b4a6"/><circle cx="${x + w - 40}" cy="490" r="9" fill="#f6d7a7"/>
      <rect x="${x + 30}" y="516" width="54" height="24" rx="4" fill="#fffaf3" stroke-width="3"/>
      <path d="M${x + 40} 528 H${x + 74}" stroke-width="2" fill="none"/>
    </g>`;
const rug = (cx, cy, rx, ry, fill = '#f0c6b8') => `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${ol(3)}/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 16}" ry="${ry - 8}" fill="none" stroke="#fffaf3" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>`;

const lobbyAnchors = [
  { id: 'receptionist', x: 500, y: 700, note: 'Đứng sau quầy (vẽ vào lớp actors-behind-counter, chân bị quầy che)' },
  { id: 'entrance', x: 135, y: 940, note: 'Khách mới xuất hiện trước cửa' },
  { id: 'counter-front', x: 500, y: 940, note: 'Khách đứng trước quầy (thanh toán)' },
];
const lobbyLayersRole = {
  bg: 'tường, sàn, cửa sổ, đèn', 'decor-wall': 'cửa, tranh, biển hiệu, cây', 'actors-behind-counter': 'trống – code chèn lễ tân',
  counter: 'quầy lễ tân (che nửa dưới lễ tân)', 'slots-back': 'chỗ đặt đồ hàng sau', actors: 'trống – code chèn khách/nhân viên',
  'slots-front': 'chỗ đặt đồ hàng trước', fg: 'tiền cảnh (trống/để dành)', ambient: 'lớp ánh sáng phủ, bật/tắt bằng code',
};
const L = (id, extra) => ({ id, role: lobbyLayersRole[id] || extra?.role, ...extra });
const chair = E => EQ.E02;

buildScene({
  scene: 'S01', title: 'Sảnh tiệm',
  text: [{ id: 'shop-name', default: 'Tên tiệm', x: 0.5, y: 0.124, baseline: true, maxWidth: 0.32, fontSize: 34, note: 'Chữ căn giữa; nếu tên dài hơn maxWidth thì giảm font-size hoặc đặt textLength + lengthAdjust="spacingAndGlyphs"' }],
  layers: [
    L('bg', { svg: wall() + cornice() + floor() + window_(690, 170, 230, 200) + pendant(260, 150) + pendant(740, 110) + rug(500, 960, 230, 26) }),
    L('decor-wall', { svg: door(50) + art(420, 300) + plant(290, BACK) + signGroup(330, 70, 340) }),
    L('actors-behind-counter', { empty: true }),
    L('counter', { svg: counter(350) }),
    L('slots-back', { slots: [
      slot('chair-1', 690, BACK, EQ.E02, ['E02'], { default: 'E02', note: 'Có sẵn từ đầu' }),
      slot('chair-2', 835, BACK, EQ.E02, ['E02'], { default: 'E02', note: 'Có sẵn từ đầu' }),
    ] }),
    L('actors', { empty: true }),
    L('slots-front', { slots: [
      slot('chair-3', 690, FRONT, EQ.E02, ['E02'], { note: 'Mua thêm ghế chờ (+1 chỗ)' }),
      slot('chair-4', 835, FRONT, EQ.E02, ['E02'], { note: 'Mua thêm ghế chờ (+1 chỗ)' }),
    ] }),
    L('fg', { empty: true }),
  ],
  anchors: lobbyAnchors,
  preview: { 'chair-1': 'E02', 'chair-2': 'E02', 'chair-3': 'E02', 'chair-4': 'E02' },
});

// S01-expanded – Chương 5: mặt bằng mở rộng (thêm phòng, 6 ghế chờ)
const archDoor = (x, w = 150, y = 330) => `
    <g ${OL}>
      <path d="M${x - 14} ${FLOOR_Y} V${y + w / 2} A${w / 2 + 14} ${w / 2 + 14} 0 0 1 ${x + w + 14} ${y + w / 2} V${FLOOR_Y} Z" fill="#8fb39a"/>
      <path d="M${x} ${FLOOR_Y} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${FLOOR_Y} Z" fill="#e8d2b8"/>
      <path d="M${x + 16} ${FLOOR_Y} V${y + w / 2 + 6} A${w / 2 - 16} ${w / 2 - 16} 0 0 1 ${x + w - 16} ${y + w / 2 + 6} V${FLOOR_Y}" fill="#d8b48c" stroke="#c49a70" stroke-width="3"/>
      <path d="M${x + 4} ${y + 60} C ${x + 30} ${y + 120} ${x + 34} ${y + 200} ${x + 22} ${y + 240} C ${x + 30} ${y + 280} ${x + 26} ${y + 330} ${x + 34} ${FLOOR_Y} H${x + 4} Z" fill="#f0c6b8" stroke-width="3"/>
      <path d="M${x + w - 4} ${y + 60} C ${x + w - 30} ${y + 120} ${x + w - 34} ${y + 200} ${x + w - 22} ${y + 240} C ${x + w - 30} ${y + 280} ${x + w - 26} ${y + 330} ${x + w - 34} ${FLOOR_Y} H${x + w - 4} Z" fill="#f0c6b8" stroke-width="3"/>
      <rect x="${x + w / 2 - 34}" y="${y + 40}" width="68" height="40" rx="10" fill="#fffaf3" stroke-width="3"/>
    </g>
    <path d="M${x + w / 2 - 12} ${y + 64} C ${x + w / 2 - 6} ${y + 50} ${x + w / 2 + 6} ${y + 50} ${x + w / 2 + 12} ${y + 64} C ${x + w / 2 + 6} ${y + 70} ${x + w / 2 - 6} ${y + 70} ${x + w / 2 - 12} ${y + 64} Z M${x + w / 2 - 22} ${y + 64} C ${x + w / 2 - 14} ${y + 56} ${x + w / 2 - 6} ${y + 64} ${x + w / 2} ${y + 68} C ${x + w / 2 + 6} ${y + 64} ${x + w / 2 + 14} ${y + 56} ${x + w / 2 + 22} ${y + 64}" fill="#e7b4a6" stroke="#8a5f4b" stroke-width="2" stroke-linejoin="round"/>`;
buildScene({
  scene: 'S01-expanded', title: 'Sảnh tiệm (mặt bằng mở rộng – Chương 5)',
  text: [{ id: 'shop-name', default: 'Tên tiệm', x: 0.5, y: 0.124, baseline: true, maxWidth: 0.32, fontSize: 34, note: 'Như S01' }],
  layers: [
    L('bg', { svg: wall('#f2e2d0') + `
    <rect x="560" y="0" width="440" height="${FLOOR_Y}" fill="#f4e6d6"/>
    <path d="M560 26 V${FLOOR_Y - 18}" stroke="#e8d2b8" stroke-width="10"/>` + cornice() + floor() + window_(620, 180, 160, 170) + pendant(190, 150) + pendant(880, 110) + rug(400, 960, 230, 26) }),
    L('decor-wall', { svg: door(40) + art(335, 300) + plant(240, BACK, 0.85) + archDoor(856, 130) + signGroup(330, 70, 340) }),
    L('actors-behind-counter', { empty: true }),
    L('counter', { svg: counter(270, 290) }),
    L('slots-back', { slots: [
      slot('chair-1', 570, BACK, EQ.E02, ['E02'], { default: 'E02' }),
      slot('chair-2', 705, BACK, EQ.E02, ['E02'], { default: 'E02', note: 'Cửa phòng mở rộng ngay sau, ghế không che lối' }),
    ] }),
    L('actors', { empty: true }),
    L('slots-front', { slots: [
      slot('chair-3', 330, FRONT, EQ.E02, ['E02']),
      slot('chair-4', 465, FRONT, EQ.E02, ['E02']),
      slot('chair-5', 600, FRONT, EQ.E02, ['E02']),
      slot('chair-6', 735, FRONT, EQ.E02, ['E02']),
    ] }),
    L('fg', { empty: true }),
  ],
  anchors: [
    { id: 'receptionist', x: 415, y: 700, note: 'Sau quầy' },
    { id: 'entrance', x: 125, y: 940, note: 'Cửa chính' },
    { id: 'room-door', x: 921, y: 720, note: 'Cửa sang phòng mở rộng (khách đi vào phòng trị liệu thứ 2)' },
    { id: 'counter-front', x: 415, y: 940, note: 'Trước quầy' },
  ],
  preview: { 'chair-1': 'E02', 'chair-2': 'E02', 'chair-3': 'E02', 'chair-4': 'E02', 'chair-5': 'E02', 'chair-6': 'E02' },
});

// =====================================================================
// S02 – Phòng trị liệu
// =====================================================================
const roomAnchors = beds => beds.map(([id, x, y]) => ({ id: `${id}-staff`, x, y, note: `KTV đứng cạnh ${id}` }));
const ambient = (fill = '#ffe9a8', op = 0.16) => `
    <rect x="0" y="0" width="1000" height="1000" fill="${fill}" opacity="${op}"/>`;
const sconce = (x, y) => `
    <g ${OL}>
      <rect x="${x - 6}" y="${y}" width="12" height="30" rx="4" fill="#c49a70" stroke-width="3"/>
      <path d="M${x - 26} ${y + 4} H${x + 26} L${x + 18} ${y - 40} H${x - 18} Z" fill="#fffaf3"/>
    </g>`;
buildScene({
  scene: 'S02', title: 'Phòng trị liệu',
  layers: [
    { id: 'bg', role: 'tường, sàn, cửa sổ, đèn trần', svg: wall() + cornice() + floor() + window_(110, 170, 230, 210, '#a9c9b3') + pendant(500, 110) },
    { id: 'decor-wall', role: 'kệ treo tường, tranh, cây treo', svg: shelf(560, 340, [300, 430]) + art(395, 220, 130, 100) + `
    <g ${OL}>
      <path d="M940 26 V150" fill="none" stroke-width="3"/>
      <path d="M915 150 H965 L958 186 H922 Z" fill="#e7b4a6"/>
      <path d="M925 180 C 905 210 900 240 910 270 M940 186 C 940 220 935 250 945 290 M955 180 C 975 210 978 236 970 262" stroke="#7aa588" stroke-width="5" fill="none"/>
    </g>` },
    { id: 'slots-shelf', role: 'chỗ bày vật tư / dụng cụ trên kệ', slots: [
      itemSlot('shelf-1', 580, 300), itemSlot('shelf-2', 660, 300), itemSlot('shelf-3', 740, 300), itemSlot('shelf-4', 820, 300),
      itemSlot('shelf-5', 580, 430), itemSlot('shelf-6', 660, 430),
      { ...slot('shelf-tool', 740, 430, EQ.E07, ['E07'], { note: 'Bộ đá gua sha (Chương 3) hoặc để trống' }) },
    ] },
    { id: 'slots-back', role: 'giường 1–2, máy xông, đèn & tinh dầu', slots: [
      slot('steamer', 50, BACK, EQ.E03, ['E03'], { note: 'Máy xông mặt, đặt cạnh đầu giường 1' }),
      slot('bed-1', 170, BACK, EQ.E01, ['E01', 'E01-upgraded'], { default: 'E01', note: 'E01-upgraded khi đã mua nệm êm (E04)' }),
      slot('bed-2', 520, BACK, EQ.E01, ['E01', 'E01-upgraded']),
      slot('aroma', 845, BACK, EQ.E05, ['E05'], { note: 'Nâng cấp đèn & tinh dầu; khi có thì bật lớp ambient' }),
    ] },
    { id: 'actors', role: 'trống – code chèn KTV/khách', empty: true },
    { id: 'slots-front', role: 'giường 3–4', slots: [
      slot('bed-3', 120, FRONT, EQ.E01, ['E01', 'E01-upgraded']),
      slot('bed-4', 520, FRONT, EQ.E01, ['E01', 'E01-upgraded']),
    ] },
    { id: 'fg', role: 'tiền cảnh (trống)', empty: true },
    { id: 'ambient', role: 'ánh sáng ấm khi có E05 (mặc định ẩn)', attrs: 'style="display:none" pointer-events="none"', svg: ambient() },
  ],
  anchors: [
    { id: 'bed-1-staff', x: 320, y: 720, note: 'KTV đứng phía sau giường 1 (vẽ trước giường thì che, nên chèn vào actors và để thấp hơn)' },
    { id: 'bed-2-staff', x: 670, y: 720, note: 'KTV ở giường 2' },
    { id: 'bed-3-staff', x: 270, y: 940, note: 'KTV ở giường 3' },
    { id: 'bed-4-staff', x: 670, y: 940, note: 'KTV ở giường 4' },
  ],
  toggles: [{ group: 'ambient', showWhen: 'E05 đặt ở slot aroma' }],
  preview: { 'bed-1': 'E01-upgraded', 'bed-2': 'E01', 'bed-3': 'E01', 'bed-4': 'E01', steamer: 'E03', aroma: 'E05', 'shelf-1': 'I01', 'shelf-2': 'I02', 'shelf-3': 'I04', 'shelf-4': 'I05', 'shelf-5': 'I06', 'shelf-6': 'I03', 'shelf-tool': 'E07' },
  previewShow: ['ambient'],
});

// =====================================================================
// S03 – Phòng VIP
// =====================================================================
const vipDefs = `
    <pattern id="s03-wallpaper" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect width="80" height="80" fill="#f2e0d4"/>
      <path d="M40 22 C 46 30 46 38 40 44 C 34 38 34 30 40 22 Z M28 40 C 34 38 38 40 40 44 C 34 46 30 44 28 40 Z M52 40 C 46 38 42 40 40 44 C 46 46 50 44 52 40 Z" fill="#ead2c3"/>
      <circle cx="0" cy="0" r="3" fill="#ead2c3"/><circle cx="80" cy="0" r="3" fill="#ead2c3"/><circle cx="0" cy="80" r="3" fill="#ead2c3"/><circle cx="80" cy="80" r="3" fill="#ead2c3"/>
    </pattern>`;
const chandelier = x => `
    <g ${OL}>
      <line x1="${x}" y1="26" x2="${x}" y2="90" stroke-width="3"/>
      <path d="M${x - 70} 110 C ${x - 40} 140 ${x + 40} 140 ${x + 70} 110" fill="none" stroke="#c9953f"/>
      <ellipse cx="${x}" cy="100" rx="22" ry="12" fill="#e8b46a"/>
    </g>
    ${[-70, -35, 0, 35, 70].map(d => `<g ${OL}><path d="M${x + d - 13} ${d === 0 ? 150 : 140} H${x + d + 13} L${x + d + 8} ${d === 0 ? 124 : 116} H${x + d - 8} Z" fill="#fffaf3" stroke-width="3"/></g><circle cx="${x + d}" cy="${(d === 0 ? 150 : 140) + 6}" r="6" fill="#ffe9a8"/>`).join('')}`;
const wainscot = `
    <rect x="0" y="470" width="1000" height="${FLOOR_Y - 470}" fill="#e8d2b8"/>
    <path d="M-4 470 H1004" ${OL} fill="none"/>
    <g fill="none" stroke="#c49a70" stroke-width="3">${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${20 + i * 140}" y="495" width="110" height="${FLOOR_Y - 540}" rx="8"/>`).join('')}</g>`;
const console_ = (x, w) => `
    <g ${OL}>
      <path d="M${x + 16} 620 V${BACK} M${x + w - 16} 620 V${BACK}" fill="none"/>
      <rect x="${x}" y="600" width="${w}" height="22" rx="6" fill="#c49a70"/>
      <rect x="${x + 12}" y="622" width="${w - 24}" height="46" rx="6" fill="#d8b48c"/>
      <path d="M${x + w / 2} 622 V668" fill="none" stroke-width="3"/>
      <circle cx="${x + w / 2 - 14}" cy="645" r="4" fill="#8a5f4b" stroke="none"/><circle cx="${x + w / 2 + 14}" cy="645" r="4" fill="#8a5f4b" stroke="none"/>
    </g>`;
const niche = (x, y, w, h) => `
    <g ${OL}>
      <path d="M${x} ${y + h} V${y + 50} A${w / 2} 50 0 0 1 ${x + w} ${y + 50} V${y + h} Z" fill="#fffaf3"/>
      <rect x="${x - 10}" y="${y + h}" width="${w + 20}" height="14" rx="5" fill="#c49a70"/>
    </g>`;
const candles = (x, y) => `
    <g ${ol(3)}>
      <rect x="${x}" y="${y - 40}" width="24" height="40" rx="4" fill="#fffaf3"/>
      <rect x="${x + 30}" y="${y - 28}" width="24" height="28" rx="4" fill="#f0c6b8"/>
      <path d="M${x + 12} ${y - 40} V${y - 46} M${x + 42} ${y - 28} V${y - 34}" fill="none" stroke-width="2"/>
    </g>
    <ellipse cx="${x + 12}" cy="${y - 54}" rx="5" ry="8" fill="#e8b46a"/><ellipse cx="${x + 42}" cy="${y - 42}" rx="5" ry="8" fill="#e8b46a"/>`;
buildScene({
  scene: 'S03', title: 'Phòng VIP', defs: vipDefs,
  layers: [
    { id: 'bg', role: 'tường giấy dán hoa sen, ốp gỗ, sàn, đèn chùm', svg: `
    <rect id="wall" x="0" y="0" width="1000" height="${FLOOR_Y}" fill="url(#s03-wallpaper)"/>` + wainscot + cornice('#e8b46a') + floor('#c9a47c', '#b58d66') + window_(70, 150, 220, 230, '#d98a83') + chandelier(470) + `
    <rect x="160" y="900" width="600" height="70" rx="30" fill="#a9c9b3" ${ol(3)}/>
    <rect x="180" y="910" width="560" height="50" rx="22" fill="none" stroke="#fffaf3" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>` },
    { id: 'decor-wall', role: 'tranh lớn, hốc tường, cây, nến', svg: `
    <g ${OL}>
      <rect x="350" y="200" width="250" height="160" rx="6" fill="#e8b46a"/>
      <rect x="364" y="214" width="222" height="132" rx="4" fill="#fffaf3"/>
    </g>
    <path d="M475 330 C 455 300 455 270 475 240 C 495 270 495 300 475 330 Z M475 330 C 445 320 425 300 420 275 C 445 280 465 300 475 330 Z M475 330 C 505 320 525 300 530 275 C 505 280 485 300 475 330 Z" fill="#f0c6b8" stroke="#8a5f4b" stroke-width="3" stroke-linejoin="round"/>
    <path d="M400 330 H550" stroke="#8fb39a" stroke-width="4" stroke-linecap="round"/>` + niche(700, 200, 200, 230) + plant(70, BACK, 1.15) + candles(880, FRONT) },
    { id: 'slots-shelf', role: 'hốc tường: dụng cụ và vật tư', slots: [
      slot('shelf-tool', 725, 430, EQ.E07, ['E07']),
      itemSlot('shelf-1', 715, 340, 60), itemSlot('shelf-2', 770, 340, 60), itemSlot('shelf-3', 825, 340, 60),
    ] },
    { id: 'slots-back', role: 'giường VIP, máy xông, tủ + đá nóng, đèn & tinh dầu', slots: [
      slot('steamer', 175, BACK, EQ.E03, ['E03']),
      slot('bed-1', 285, BACK, EQ.E01, ['E01', 'E01-upgraded'], { default: 'E01-upgraded', note: 'Phòng VIP nên dùng giường có nệm êm' }),
      slot('hot-stone', 635, 600, EQ.E09, ['E09'], { note: 'Đặt trên mặt tủ (tủ là decor của cảnh)' }),
      slot('aroma', 850, BACK, EQ.E05, ['E05']),
    ] },
    { id: 'decor-back', role: 'tủ gỗ (vẽ sau slot đá nóng để không che)', svg: console_(620, 220) },
    { id: 'actors', role: 'trống – code chèn KTV/khách', empty: true },
    { id: 'slots-front', role: '(không có)', slots: [] },
    { id: 'fg', role: 'tiền cảnh (trống)', empty: true },
    { id: 'ambient', role: 'ánh sáng ấm khi có E05 (mặc định ẩn)', attrs: 'style="display:none" pointer-events="none"', svg: ambient('#ffe9a8', 0.14) },
  ],
  anchors: [{ id: 'bed-1-staff', x: 435, y: 720, note: 'KTV ở giường VIP' }],
  toggles: [{ group: 'ambient', showWhen: 'E05 đặt ở slot aroma' }],
  preview: { 'bed-1': 'E01-upgraded', steamer: 'E03', aroma: 'E05', 'hot-stone': 'E09', 'shelf-tool': 'E07', 'shelf-1': 'I03', 'shelf-2': 'I01', 'shelf-3': 'I06' },
  previewShow: ['ambient'],
});

// =====================================================================
// S04 – Khu gội đầu
// =====================================================================
const tiles = `
    <rect x="0" y="420" width="1000" height="${FLOOR_Y - 420}" fill="#e3eef0"/>
    <path d="${[0, 1, 2, 3, 4].map(i => `M0 ${450 + i * 56} H1000`).join(' ')} ${Array.from({ length: 21 }, (_, i) => `M${i * 50} 420 V${FLOOR_Y}`).join(' ')}" stroke="#cfe3e6" stroke-width="3" fill="none"/>
    <path d="M-4 420 H1004" ${OL} fill="none"/>`;
const mirror = (x, y) => `
    <g ${OL}>
      <rect x="${x}" y="${y}" width="150" height="190" rx="70" fill="#d8b48c"/>
      <rect x="${x + 14}" y="${y + 14}" width="122" height="162" rx="58" fill="#cfe3e6"/>
      <path d="M${x + 40} ${y + 60} L${x + 70} ${y + 30} M${x + 44} ${y + 90} L${x + 96} ${y + 38}" stroke="#ffffff" stroke-width="6" fill="none"/>
    </g>`;
const towelCabinet = (x, w = 160) => `
    <g ${OL}>
      <rect x="${x}" y="${BACK - 170}" width="${w}" height="170" rx="8" fill="#e8d2b8"/>
      <rect x="${x + 12}" y="${BACK - 158}" width="${w - 24}" height="70" rx="5" fill="#fffaf3" stroke-width="3"/>
      <rect x="${x + 22}" y="${BACK - 126}" width="${w - 44}" height="18" rx="7" fill="#ffffff" stroke-width="3"/>
      <rect x="${x + 22}" y="${BACK - 144}" width="${w - 44}" height="18" rx="7" fill="#a9c9b3" stroke-width="3"/>
      <rect x="${x + 22}" y="${BACK - 108}" width="${w - 44}" height="18" rx="7" fill="#f0c6b8" stroke-width="3"/>
      <path d="M${x + 12} ${BACK - 70} H${x + w - 12} M${x + w / 2} ${BACK - 70} V${BACK - 10}" fill="none" stroke="#c49a70" stroke-width="3"/>
      <circle cx="${x + w / 2 - 14}" cy="${BACK - 40}" r="4" fill="#8a5f4b" stroke="none"/><circle cx="${x + w / 2 + 14}" cy="${BACK - 40}" r="4" fill="#8a5f4b" stroke="none"/>
    </g>`;
/** Khu gội đầu: every level variant (S04, S04-L2, S04-L3) shares these slots / anchors exactly. */
function washScene({ scene, title, defs, bg, decor, fg = '', preview }) {
  buildScene({
    scene, title, defs,
    layers: [
      { id: 'bg', role: 'tường, gạch ốp, sàn, đèn', svg: bg },
      { id: 'decor-wall', role: 'gương, kệ, tủ khăn, cây', svg: decor },
      { id: 'slots-shelf', role: 'kệ: dầu gội, dầu xả, khăn', slots: [
        itemSlot('shelf-1', 660, 330), itemSlot('shelf-2', 740, 330), itemSlot('shelf-3', 820, 330),
      ] },
      { id: 'slots-wall', role: 'bình nước nóng treo tường', slots: [
        slot('water-heater', 40, 430, EQ.E08, ['E08'], { note: 'Chương 4; treo tường phía trên bồn gội ghế 1' }),
      ] },
      { id: 'slots-back', role: 'ghế gội 1', slots: [
        slot('shampoo-chair-1', 90, BACK, EQ.E06, ['E06'], { default: 'E06' }),
      ] },
      { id: 'actors', role: 'trống – code chèn KTV/khách', empty: true },
      { id: 'slots-front', role: 'ghế gội 2', slots: [
        slot('shampoo-chair-2', 440, FRONT, EQ.E06, ['E06']),
      ] },
      { id: 'fg', role: fg ? 'tiền cảnh: cây / nến' : 'tiền cảnh (trống)', ...(fg ? { svg: fg } : { empty: true }) },
    ],
    anchors: [
      { id: 'shampoo-chair-1-staff', x: 60, y: 720, note: 'KTV đứng sau bồn gội (bên trái ghế 1)' },
      { id: 'shampoo-chair-2-staff', x: 410, y: 940, note: 'KTV ở ghế gội 2' },
    ],
    preview: preview || { 'shampoo-chair-1': 'E06', 'shampoo-chair-2': 'E06', 'water-heater': 'E08', 'shelf-1': 'I07', 'shelf-2': 'I08', 'shelf-3': 'I01' },
  });
}
washScene({
  scene: 'S04', title: 'Khu gội đầu',
  bg: wall() + tiles + cornice() + floor() + pendant(330, 120) + pendant(740, 120),
  decor: mirror(420, 160) + shelf(640, 300, [330]) + towelCabinet(810) + plant(970, FRONT, 0.9),
});

// =====================================================================
// S05 – Khu ngâm chân
// =====================================================================
const slats = `
    <rect x="0" y="0" width="1000" height="${FLOOR_Y}" fill="#efdcc6"/>
    <path d="${Array.from({ length: 25 }, (_, i) => `M${i * 42 + 20} 26 V${FLOOR_Y}`).join(' ')}" stroke="#e5ceb5" stroke-width="3" fill="none"/>`;
const pebbles = `
    <g ${ol(2)}>${[[30, 12], [80, 9], [128, 11], [180, 8], [232, 12], [300, 9], [360, 11], [430, 10], [500, 12], [570, 9], [640, 11], [710, 10], [780, 12], [850, 9], [920, 11], [975, 9]].map(([x, r], i) => `<ellipse cx="${x}" cy="${FLOOR_Y - 26 + (i % 2) * 3}" rx="${r + 10}" ry="${r - 1}" fill="${['#e8d2b8', '#fffaf3', '#d8b48c'][i % 3]}"/>`).join('')}</g>`;
const bamboo = x => `
    <g ${OL}>
      <path d="M${x} ${BACK - 20} V120 M${x + 34} ${BACK - 20} V170 M${x + 66} ${BACK - 20} V90" stroke="#8fb39a" stroke-width="16" fill="none"/>
      <path d="M${x} 300 h0 M${x} 460 h0 M${x + 34} 380 h0 M${x + 66} 260 h0 M${x + 66} 520 h0" stroke="#4f7a62" stroke-width="18"/>
      <path d="M${x} 180 C ${x - 30} 160 ${x - 50} 170 ${x - 60} 150 C ${x - 34} 146 ${x - 16} 160 ${x} 180 Z M${x + 66} 200 C ${x + 96} 176 ${x + 116} 186 ${x + 126} 166 C ${x + 100} 160 ${x + 80} 176 ${x + 66} 200 Z M${x + 34} 250 C ${x + 4} 236 ${x - 8} 244 ${x - 20} 226 C ${x + 4} 222 ${x + 20} 232 ${x + 34} 250 Z" fill="#a9c9b3" stroke-width="3"/>
      <rect x="${x - 26}" y="${BACK - 50}" width="118" height="50" rx="8" fill="#c49a70"/>
    </g>`;
/** Khu ngâm chân: every level variant (S05, S05-L2, S05-L3) shares these slots / anchors exactly. */
function footScene({ scene, title, defs, bg, decor, fg = '', ambientOp = 0.16, preview }) {
  buildScene({
    scene, title, defs,
    layers: [
      { id: 'bg', role: 'tường ốp gỗ, sỏi, sàn, cửa sổ, đèn', svg: bg },
      { id: 'decor-wall', role: 'trúc, kệ, tranh', svg: decor },
      { id: 'slots-shelf', role: 'kệ: khăn, tinh dầu', slots: [
        itemSlot('shelf-1', 100, 330), itemSlot('shelf-2', 180, 330), itemSlot('shelf-3', 260, 330),
      ] },
      { id: 'slots-back', role: 'ghế ngâm chân 1–2, đèn & tinh dầu', slots: [
        slot('footbath-chair-1', 60, BACK, EQ.E10, ['E10'], { default: 'E10' }),
        slot('footbath-chair-2', 400, BACK, EQ.E10, ['E10']),
        slot('aroma', 710, BACK, EQ.E05, ['E05']),
      ] },
      { id: 'actors', role: 'trống – code chèn KTV/khách', empty: true },
      { id: 'slots-front', role: 'ghế ngâm chân 3', slots: [
        slot('footbath-chair-3', 240, FRONT, EQ.E10, ['E10']),
      ] },
      { id: 'fg', role: fg ? 'tiền cảnh: cây / nến' : 'tiền cảnh (trống)', ...(fg ? { svg: fg } : { empty: true }) },
      { id: 'ambient', role: 'ánh sáng ấm khi có E05 (mặc định ẩn)', attrs: 'style="display:none" pointer-events="none"', svg: ambient('#ffe9a8', ambientOp) },
    ],
    anchors: [
      { id: 'footbath-chair-1-staff', x: 380, y: 720, note: 'KTV ngồi/quỳ cạnh chậu ngâm ghế 1' },
      { id: 'footbath-chair-2-staff', x: 720, y: 720, note: 'KTV ở ghế 2' },
      { id: 'footbath-chair-3-staff', x: 560, y: 940, note: 'KTV ở ghế 3' },
    ],
    toggles: [{ group: 'ambient', showWhen: 'E05 đặt ở slot aroma' }],
    preview: preview || { 'footbath-chair-1': 'E10', 'footbath-chair-2': 'E10', 'footbath-chair-3': 'E10', aroma: 'E05', 'shelf-1': 'I01', 'shelf-2': 'I02', 'shelf-3': 'I03' },
  });
}
footScene({
  scene: 'S05', title: 'Khu ngâm chân',
  bg: slats + cornice() + floor('#d8b48c', '#c49a70') + window_(380, 160, 240, 200, '#e8d2b8') + pendant(230, 140, '#f0c6b8') + pendant(720, 90, '#f0c6b8') + pebbles,
  decor: bamboo(860) + shelf(80, 260, [330]) + art(660, 210, 140, 150),
});

// =====================================================================
// Shop levels (GAME_DESIGN §12): richer lobby / treatment rooms per level
//   lobby  L0 S01 · L1 S01-expanded · L2 S01-L2 · L3 S01-L3
//   room 1 L0 S02 · L1 S02-L1 · L2 S02-L2 · L3 S02-L3   (same slots as S02)
//   room 2 L2 S06 · L3 S06-L3                            (beds bed-5..8)
// =====================================================================
const GOLD = '#e8b46a', GOLD_D = '#c9953f';
const goldOl = w => `stroke="${GOLD_D}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** wallpaper patterns */
const patLeaf = (id, base, motif) => `
    <pattern id="${id}" width="70" height="70" patternUnits="userSpaceOnUse">
      <rect width="70" height="70" fill="${base}"/>
      <path d="M35 18 C 44 24 44 34 35 40 C 26 34 26 24 35 18 Z M35 40 V52" fill="${motif}" stroke="${motif}" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 52 C 4 48 8 48 10 52 C 8 56 4 56 0 52 Z M70 52 C 66 48 62 48 60 52 C 62 56 66 56 70 52 Z" fill="${motif}"/>
    </pattern>`;
const patDamask = (id, base, motif) => `
    <pattern id="${id}" width="90" height="90" patternUnits="userSpaceOnUse">
      <rect width="90" height="90" fill="${base}"/>
      <path d="M45 14 C 56 28 56 40 45 52 C 34 40 34 28 45 14 Z M45 52 C 58 50 66 56 70 66 C 58 68 50 62 45 52 Z M45 52 C 32 50 24 56 20 66 C 32 68 40 62 45 52 Z M45 58 V76" fill="${motif}" stroke="${motif}" stroke-width="2" stroke-linecap="round"/>
      <path d="M0 0 L8 8 L0 16 M90 0 L82 8 L90 16 M0 90 L8 82 L0 74 M90 90 L82 82 L90 74" fill="none" stroke="${motif}" stroke-width="3"/>
    </pattern>`;
const patStripe = (id, base, stripe) => `
    <pattern id="${id}" width="60" height="60" patternUnits="userSpaceOnUse">
      <rect width="60" height="60" fill="${base}"/>
      <rect x="0" y="0" width="22" height="60" fill="${stripe}"/>
      <path d="M40 0 V60" stroke="${stripe}" stroke-width="3"/>
    </pattern>`;
const glowGrad = (id, color = '#ffe9a8') => `
    <radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="0.75"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

const papered = id => `
    <rect id="wall" x="0" y="0" width="1000" height="${FLOOR_Y}" fill="url(#${id})"/>`;
/** lower wall paneling from y=top to the floor */
const panels = (top, fill, line, trim = '#d8b48c', n = 7) => {
  const pw = 1000 / n;
  return `
    <rect x="0" y="${top}" width="1000" height="${FLOOR_Y - top}" fill="${fill}"/>
    <g fill="none" stroke="${line}" stroke-width="3">${Array.from({ length: n }, (_, i) => `<rect x="${Math.round(i * pw + 18)}" y="${top + 26}" width="${Math.round(pw - 36)}" height="${FLOOR_Y - top - 60}" rx="8"/>`).join('')}</g>
    <rect x="-4" y="${top - 6}" width="1008" height="14" rx="4" fill="${trim}" ${ol(3)}/>`;
};
/** plain chair rail + lower wall tint */
const railBand = (top, fill) => `
    <rect x="0" y="${top}" width="1000" height="${FLOOR_Y - top}" fill="${fill}"/>
    <rect x="-4" y="${top - 5}" width="1008" height="12" rx="4" fill="#d8b48c" ${ol(3)}/>`;
const marbleFloor = (a = '#f6efe6', b = '#ece0d2', vein = '#dccab7', trim = GOLD) => {
  const rows = [FLOOR_Y, 770, 850, 940, 1000];
  let tiles = '';
  for (let i = 0; i < 4; i++) {
    const y0 = rows[i], h = rows[i + 1] - y0, off = i % 2 ? -62 : 0;
    for (let k = 0; k < 9; k++) tiles += `<rect x="${off + k * 125}" y="${y0}" width="125" height="${h}" fill="${(k + i) % 2 ? b : a}"/>`;
  }
  return `
    <rect id="floor" x="0" y="${FLOOR_Y}" width="1000" height="${1000 - FLOOR_Y}" fill="${a}"/>
    <g stroke="${vein}" stroke-width="2.5" fill="none">${tiles}</g>
    <path d="M60 790 C 120 780 150 820 230 812 M420 880 C 480 870 520 900 600 892 M700 740 C 760 760 800 730 860 750 M120 960 C 190 950 220 975 300 968 M760 975 C 820 960 860 985 930 975 M330 735 C 380 750 410 728 470 742" stroke="${vein}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M-4 ${FLOOR_Y} H1004" ${OL} fill="none"/>
    <rect x="-4" y="${FLOOR_Y - 18}" width="1008" height="18" fill="${trim}" ${OL}/>`;
};
const runnerRug = (x, y, w, h, fill, border = '#fffaf3') => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${fill}" ${ol(3)}/>
    <rect x="${x + 12}" y="${y + 10}" width="${w - 24}" height="${h - 20}" rx="12" fill="none" stroke="${border}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>`;
/** rattan dome pendant (L2) */
const domePendant = (x, len, fill = '#e8c79a') => `
    <g ${OL}>
      <line x1="${x}" y1="26" x2="${x}" y2="${len}" stroke-width="3"/>
      <path d="M${x - 52} ${len + 46} C ${x - 50} ${len + 4} ${x + 50} ${len + 4} ${x + 52} ${len + 46} Z" fill="${fill}"/>
      <path d="M${x - 30} ${len + 14} V${len + 46} M${x} ${len + 6} V${len + 46} M${x + 30} ${len + 14} V${len + 46}" stroke="#c49a70" stroke-width="3" fill="none"/>
    </g>
    <ellipse cx="${x}" cy="${len + 50}" rx="16" ry="7" fill="#ffe9a8"/>`;
/** two-tier crystal chandelier (L3) */
const grandChandelier = (x, drop = 60, s = 1) => `
    <g transform="translate(${x} 0) scale(${s} 1)">
      <circle cx="0" cy="${drop + 70}" r="${130}" fill="url(#glow)" opacity="0.8"/>
      <g ${OL}>
        <line x1="0" y1="26" x2="0" y2="${drop}" stroke-width="3"/>
        <path d="M-110 ${drop + 62} C -80 ${drop + 102} 80 ${drop + 102} 110 ${drop + 62}" fill="none" stroke="${GOLD_D}" stroke-width="5"/>
        <path d="M-60 ${drop + 24} C -40 ${drop + 54} 40 ${drop + 54} 60 ${drop + 24}" fill="none" stroke="${GOLD_D}" stroke-width="5"/>
        <path d="M0 ${drop} V${drop + 90}" stroke="${GOLD_D}" stroke-width="5"/>
        <ellipse cx="0" cy="${drop + 92}" rx="20" ry="11" fill="${GOLD}"/>
        <ellipse cx="0" cy="${drop + 40}" rx="14" ry="9" fill="${GOLD}"/>
      </g>
      ${[-110, -55, 0, 55, 110].map(d => { const yy = d === 0 ? drop + 92 : drop + 62 + (Math.abs(d) < 60 ? 22 : 0); return `<g ${ol(3)}><path d="M${d - 12} ${yy - 2} H${d + 12} L${d + 7} ${yy - 26} H${d - 7} Z" fill="#fffaf3"/></g><circle cx="${d}" cy="${yy - 30}" r="5" fill="#ffe9a8"/><ellipse cx="${d}" cy="${yy + 12}" rx="4" ry="8" fill="#cfe3e6" ${ol(2)}/>`; }).join('')}
      ${[-60, 0, 60].map(d => `<g ${ol(3)}><path d="M${d - 10} ${drop + 24} H${d + 10} L${d + 6} ${drop + 4} H${d - 6} Z" fill="#fffaf3"/></g>`).join('')}
    </g>`;
const goldArt = (x, y, w, h, inner = 'lotus') => `
    <g ${OL}>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${GOLD}"/>
      <rect x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${h - 24}" rx="3" fill="#fffaf3" stroke-width="3"/>
    </g>${inner === 'lotus' ? `
    <path d="M${x + w / 2} ${y + h - 30} C ${x + w / 2 - 18} ${y + h - 55} ${x + w / 2 - 18} ${y + h * 0.35} ${x + w / 2} ${y + h * 0.28} C ${x + w / 2 + 18} ${y + h * 0.35} ${x + w / 2 + 18} ${y + h - 55} ${x + w / 2} ${y + h - 30} Z M${x + w / 2} ${y + h - 30} C ${x + w / 2 - 30} ${y + h - 36} ${x + w / 2 - 44} ${y + h - 56} ${x + w / 2 - 46} ${y + h - 74} C ${x + w / 2 - 22} ${y + h - 68} ${x + w / 2 - 8} ${y + h - 52} ${x + w / 2} ${y + h - 30} Z M${x + w / 2} ${y + h - 30} C ${x + w / 2 + 30} ${y + h - 36} ${x + w / 2 + 44} ${y + h - 56} ${x + w / 2 + 46} ${y + h - 74} C ${x + w / 2 + 22} ${y + h - 68} ${x + w / 2 + 8} ${y + h - 52} ${x + w / 2} ${y + h - 30} Z" fill="#f0c6b8" ${ol(3)}/>
    <path d="M${x + 26} ${y + h - 26} H${x + w - 26}" stroke="#8fb39a" stroke-width="4" stroke-linecap="round"/>` : inner === 'hills' ? `
    <path d="M${x + 14} ${y + h - 14} C ${x + w * 0.3} ${y + h * 0.35} ${x + w * 0.45} ${y + h * 0.35} ${x + w * 0.6} ${y + h * 0.62} C ${x + w * 0.7} ${y + h * 0.5} ${x + w * 0.8} ${y + h * 0.5} ${x + w - 14} ${y + h - 14} Z" fill="#b8d3bf"/>
    <circle cx="${x + w * 0.72}" cy="${y + h * 0.3}" r="${Math.min(w, h) * 0.08}" fill="#f2c9a0"/>` : `
    <path d="M${x + w / 2} ${y + 24} C ${x + w / 2 - 6} ${y + h * 0.5} ${x + w / 2 + 10} ${y + h * 0.7} ${x + w / 2} ${y + h - 24}" stroke="#4f7a62" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${[0.3, 0.45, 0.6, 0.75].map((f, i) => `<ellipse cx="${x + w / 2 + (i % 2 ? 16 : -16)}" cy="${y + h * f}" rx="16" ry="7" fill="#8fb39a" transform="rotate(${i % 2 ? -30 : 30} ${x + w / 2 + (i % 2 ? 16 : -16)} ${y + h * f})" ${ol(2)}/>`).join('')}`}`;
/** plant with configurable pot (gold for luxury) */
const potPlant = (x, base, s = 1, pot = '#e7b4a6', leaves = ['#8fb39a', '#7aa588']) => `
    <g transform="translate(${x} ${base}) scale(${s})" ${OL}>
      <ellipse cx="-30" cy="-110" rx="16" ry="44" fill="${leaves[1]}" transform="rotate(-32 -30 -110)"/>
      <ellipse cx="30" cy="-112" rx="16" ry="44" fill="${leaves[1]}" transform="rotate(30 30 -112)"/>
      <ellipse cx="-14" cy="-120" rx="18" ry="54" fill="${leaves[0]}" transform="rotate(-12 -14 -120)"/>
      <ellipse cx="14" cy="-128" rx="18" ry="58" fill="${leaves[0]}" transform="rotate(12 14 -128)"/>
      <path d="M-34 -60 H34 L26 0 H-26 Z" fill="${pot}"/>
      <path d="M-30 -46 H30" stroke-width="3" fill="none"/>
    </g>`;
const hangingPlant = (x, len, pot = '#e7b4a6') => `
    <g ${OL}>
      <path d="M${x} 26 V${len}" fill="none" stroke-width="3"/>
      <path d="M${x - 26} ${len} H${x + 26} L${x + 19} ${len + 36} H${x - 19} Z" fill="${pot}"/>
      <path d="M${x - 16} ${len + 30} C ${x - 36} ${len + 70} ${x - 40} ${len + 110} ${x - 28} ${len + 150} M${x} ${len + 36} C ${x} ${len + 80} ${x - 6} ${len + 120} ${x + 4} ${len + 170} M${x + 16} ${len + 30} C ${x + 38} ${len + 64} ${x + 42} ${len + 96} ${x + 32} ${len + 128}" stroke="#7aa588" stroke-width="5" fill="none"/>
    </g>
    ${[[-30, 80], [-36, 120], [-4, 100], [2, 150], [30, 70], [38, 105]].map(([dx, dy]) => `<ellipse cx="${x + dx}" cy="${len + dy}" rx="8" ry="5" fill="#8fb39a" stroke="#8a5f4b" stroke-width="2"/>`).join('')}`;
const roomMark = (cx, cy, n, fill = '#fffaf3') => `
    <g ${ol(3)}><circle cx="${cx}" cy="${cy}" r="17" fill="${fill}"/>
    <path d="${n === 1 ? `M${cx} ${cy - 8} V${cy + 8}` : `M${cx - 5} ${cy - 8} V${cy + 8} M${cx + 5} ${cy - 8} V${cy + 8}`}" stroke-width="4" fill="none"/></g>`;
const candleTrio = (x, y) => candles(x, y) + `
    <g ${ol(3)}><rect x="${x + 60}" y="${y - 52}" width="22" height="52" rx="4" fill="#fffaf3"/><path d="M${x + 71} ${y - 52} V${y - 58}" stroke-width="2"/></g>
    <ellipse cx="${x + 71}" cy="${y - 66}" rx="5" ry="8" fill="#e8b46a"/>`;
const drapes = (x, y, w, h, fill, rod = GOLD) => `
    <g ${OL}>
      <path d="M${x - 30} ${y - 14} H${x + w + 30}" stroke="${rod}" stroke-width="8" fill="none"/>
      <circle cx="${x - 34}" cy="${y - 14}" r="9" fill="${rod}"/><circle cx="${x + w + 34}" cy="${y - 14}" r="9" fill="${rod}"/>
      <path d="M${x - 26} ${y - 10} H${x + 46} C ${x + 30} ${y + h * 0.45} ${x + 14} ${y + h * 0.55} ${x + 30} ${y + h + 40} H${x - 26} Z" fill="${fill}"/>
      <path d="M${x + w + 26} ${y - 10} H${x + w - 46} C ${x + w - 30} ${y + h * 0.45} ${x + w - 14} ${y + h * 0.55} ${x + w - 30} ${y + h + 40} H${x + w + 26} Z" fill="${fill}"/>
      <path d="M${x - 4} ${y + 30} C ${x + 6} ${y + h * 0.4} ${x} ${y + h * 0.7} ${x + 6} ${y + h + 30} M${x + w + 4} ${y + 30} C ${x + w - 6} ${y + h * 0.4} ${x + w} ${y + h * 0.7} ${x + w - 6} ${y + h + 30}" stroke-width="2" fill="none"/>
    </g>
    <g ${ol(3)}><rect x="${x + 6}" y="${y + h * 0.5}" width="26" height="14" rx="6" fill="${rod}"/><rect x="${x + w - 32}" y="${y + h * 0.5}" width="26" height="14" rx="6" fill="${rod}"/></g>`;
const archWindow = (x, y, w, h, glass = '#cfe3e6', frame = '#fffaf3') => `
    <g ${OL}>
      <path d="M${x - 14} ${y + h + 4} V${y + w / 2} A${w / 2 + 14} ${w / 2 + 14} 0 0 1 ${x + w + 14} ${y + w / 2} V${y + h + 4} Z" fill="${frame}"/>
      <path d="M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z" fill="${glass}"/>
      <path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + w / 2 + 40} H${x + w} M${x} ${y + h * 0.75} H${x + w}" fill="none" stroke-width="3"/>
      <path d="M${x + 24} ${y + w / 2 + 70} L${x + 56} ${y + w / 2 + 102} M${x + w / 2 + 24} ${y + w / 2 + 70} L${x + w / 2 + 56} ${y + w / 2 + 102}" stroke="#ffffff" stroke-width="6"/>
      <rect x="${x - 22}" y="${y + h}" width="${w + 44}" height="16" rx="6" fill="#d8b48c"/>
    </g>`;
/** wall shelf with gold brackets */
const shelfLux = (x, w, ys) => ys.map(y => `
    <g ${OL}>
      <rect x="${x}" y="${y}" width="${w}" height="16" rx="5" fill="#d8b48c"/>
      <path d="M${x + 4} ${y + 16} H${x + w - 4}" stroke="${GOLD}" stroke-width="4" fill="none"/>
      <path d="M${x + 30} ${y + 18} C ${x + 30} ${y + 36} ${x + 44} ${y + 40} ${x + 54} ${y + 18} M${x + w - 30} ${y + 18} C ${x + w - 30} ${y + 36} ${x + w - 44} ${y + 40} ${x + w - 54} ${y + 18}" stroke="${GOLD_D}" stroke-width="4" fill="none"/>
    </g>`).join('');
/** decorative (non-slot) items for room 2 shelves */
const towelStack = (x, y, cols = ['#ffffff', '#a9c9b3', '#f0c6b8']) => `
    <g ${ol(3)}>${cols.map((c, i) => `<rect x="${x}" y="${y - 18 * (i + 1)}" width="64" height="18" rx="8" fill="${c}"/>`).join('')}</g>`;
const jar = (x, y, fill = '#e8b46a', h = 50) => `
    <g ${ol(3)}><rect x="${x}" y="${y - h}" width="36" height="${h}" rx="8" fill="${fill}"/><rect x="${x + 8}" y="${y - h - 12}" width="20" height="12" rx="3" fill="#fffaf3"/><rect x="${x + 7}" y="${y - h + 14}" width="22" height="16" rx="3" fill="#fffaf3" stroke-width="2"/></g>`;
const orchid = (x, y) => `
    <g ${ol(3)}>
      <path d="M${x} ${y - 36} C ${x - 4} ${y - 80} ${x + 20} ${y - 110} ${x + 40} ${y - 112}" fill="none" stroke="#4f7a62"/>
      <rect x="${x - 22}" y="${y - 36}" width="44" height="36" rx="8" fill="#fffaf3"/>
      <ellipse cx="${x - 14}" cy="${y - 42}" rx="18" ry="7" fill="#8fb39a"/><ellipse cx="${x + 14}" cy="${y - 44}" rx="18" ry="7" fill="#7aa588"/>
    </g>
    ${[[6, -84], [18, -100], [34, -108], [44, -96]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="9" fill="#f0c6b8" stroke="#8a5f4b" stroke-width="2"/><circle cx="${x + dx}" cy="${y + dy}" r="3" fill="#d98a83"/>`).join('')}`;

// ---------------------------------------------------------------- lobby L2 / L3
const counterL2 = (x, w) => `
    <g ${OL}>
      <rect x="${x - 6}" y="534" width="${w + 12}" height="26" rx="8" fill="#c49a70"/>
      <rect x="${x + 10}" y="560" width="${w - 20}" height="${BACK - 560}" fill="#e8d2b8"/>
      <rect x="${x + 30}" y="580" width="${(w - 80) / 2}" height="${BACK - 600}" rx="8" fill="#a9c9b3" stroke-width="3"/>
      <rect x="${x + 50 + (w - 80) / 2}" y="580" width="${(w - 80) / 2}" height="${BACK - 600}" rx="8" fill="#a9c9b3" stroke-width="3"/>
      <circle cx="${x + w / 2}" cy="636" r="24" fill="#fffaf3"/>
    </g>
    <path d="M${x + w / 2} 650 C ${x + w / 2 - 10} 640 ${x + w / 2 - 10} 626 ${x + w / 2} 618 C ${x + w / 2 + 10} 626 ${x + w / 2 + 10} 640 ${x + w / 2} 650 Z M${x + w / 2} 650 C ${x + w / 2 - 16} 648 ${x + w / 2 - 22} 638 ${x + w / 2 - 22} 630 C ${x + w / 2 - 10} 632 ${x + w / 2 - 4} 640 ${x + w / 2} 650 Z M${x + w / 2} 650 C ${x + w / 2 + 16} 648 ${x + w / 2 + 22} 638 ${x + w / 2 + 22} 630 C ${x + w / 2 + 10} 632 ${x + w / 2 + 4} 640 ${x + w / 2} 650 Z" fill="#e7b4a6" stroke="#8a5f4b" stroke-width="2" stroke-linejoin="round"/>
    <g ${OL}>
      <path d="M${x + 36} 534 V506 M${x + 24} 474 H${x + 48} L${x + 56} 500 H${x + 16} Z" fill="#fffaf3" stroke-width="3"/>
      <rect x="${x + 22}" y="500" width="28" height="34" rx="4" fill="none" stroke="none"/>
      <rect x="${x + 70}" y="512" width="60" height="22" rx="4" fill="#fffaf3" stroke-width="3"/>
    </g>
    <circle cx="${x + 36}" cy="502" r="6" fill="#ffe9a8"/>` + orchid(x + w - 50, 534);
const counterLux = (x, w) => `
    <g ${OL}>
      <rect x="${x - 10}" y="528" width="${w + 20}" height="30" rx="8" fill="#f6efe6"/>
      <path d="M${x + 10} 538 C ${x + 40} 534 ${x + 60} 548 ${x + 100} 542 M${x + w - 110} 548 C ${x + w - 80} 540 ${x + w - 50} 552 ${x + w - 20} 544" stroke="#dccab7" stroke-width="2" fill="none"/>
      <rect x="${x + 6}" y="558" width="${w - 12}" height="${BACK - 558 - 14}" fill="#4f7a62"/>
      <rect x="${x - 2}" y="${BACK - 16}" width="${w + 4}" height="16" rx="4" fill="${GOLD}"/>
    </g>
    <path d="${Array.from({ length: Math.floor((w - 40) / 24) }, (_, i) => `M${x + 26 + i * 24} 572 V${BACK - 30}`).join(' ')}" stroke="#3f6a53" stroke-width="5" stroke-linecap="round"/>
    <rect x="${x + 6}" y="558" width="${w - 12}" height="8" fill="${GOLD}" ${ol(2)}/>
    <circle cx="${x + w / 2}" cy="632" r="30" fill="#4f7a62" ${goldOl(5)}/>
    <path d="M${x + w / 2} 650 C ${x + w / 2 - 10} 640 ${x + w / 2 - 10} 624 ${x + w / 2} 614 C ${x + w / 2 + 10} 624 ${x + w / 2 + 10} 640 ${x + w / 2} 650 Z M${x + w / 2} 650 C ${x + w / 2 - 16} 648 ${x + w / 2 - 22} 638 ${x + w / 2 - 22} 628 C ${x + w / 2 - 10} 630 ${x + w / 2 - 4} 640 ${x + w / 2} 650 Z M${x + w / 2} 650 C ${x + w / 2 + 16} 648 ${x + w / 2 + 22} 638 ${x + w / 2 + 22} 628 C ${x + w / 2 + 10} 630 ${x + w / 2 + 4} 640 ${x + w / 2} 650 Z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2" stroke-linejoin="round"/>
    <g ${OL}><rect x="${x + 26}" y="506" width="60" height="22" rx="4" fill="#fffaf3" stroke-width="3"/><path d="M${x + 110} 528 C ${x + 106} 506 ${x + 122} 494 ${x + 122} 494 C ${x + 122} 494 ${x + 138} 506 ${x + 134} 528 Z" fill="${GOLD}" stroke-width="3"/></g>` + orchid(x + w - 46, 528);
const doorLux = (x, y = 390, w = 140) => `
    <g ${OL}>
      <path d="M${x - 14} ${FLOOR_Y} V${y - 14} H${x + w + 14} V${FLOOR_Y} Z" fill="#c49a70"/>
      <path d="M${x - 14} ${y - 14} V${y - 20} A${w / 2 + 14} 62 0 0 1 ${x + w + 14} ${y - 20} V${y - 14} Z" fill="#c49a70"/>
      <path d="M${x} ${y - 20} A${w / 2} 50 0 0 1 ${x + w} ${y - 20} Z" fill="#cfe3e6"/>
      <path d="M${x + w / 2} ${y - 70} V${y - 20} M${x + 20} ${y - 40} L${x + w / 2} ${y - 20} L${x + w - 20} ${y - 40}" stroke-width="3" fill="none"/>
      <rect x="${x}" y="${y}" width="${w}" height="${FLOOR_Y - y}" rx="4" fill="#cfe3e6"/>
      <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${FLOOR_Y}"/>
      <path d="M${x + 18} ${y + 28} L${x + 46} ${y + 56} M${x + w / 2 + 18} ${y + 28} L${x + w / 2 + 46} ${y + 56}" stroke="#ffffff" stroke-width="6"/>
    </g>
    <g ${goldOl(3)} fill="${GOLD}"><rect x="${x + w / 2 - 18}" y="${y + 110}" width="8" height="70" rx="4"/><rect x="${x + w / 2 + 10}" y="${y + 110}" width="8" height="70" rx="4"/></g>`;
/** corridor arch to both treatment rooms (L3): two small doors marked I / II inside */
const grandArch = (x, w, y = 300) => {
  const r = w / 2, cx = x + r;
  return `
    <g ${OL}>
      <path d="M${x - 16} ${FLOOR_Y} V${y + r} A${r + 16} ${r + 16} 0 0 1 ${x + w + 16} ${y + r} V${FLOOR_Y} Z" fill="${GOLD}"/>
      <path d="M${x} ${FLOOR_Y} V${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${FLOOR_Y} Z" fill="#f7ecdf"/>
    </g>
    <path d="M${x + 2} ${FLOOR_Y - 2} L${cx - 20} 600 H${cx + 20} L${x + w - 2} ${FLOOR_Y - 2} Z" fill="#efe2d3" stroke="#d9c3ad" stroke-width="3" stroke-linejoin="round"/>
    <rect x="${cx - 20}" y="470" width="40" height="130" fill="#fffaf3" stroke="#d9c3ad" stroke-width="3"/>
    <circle cx="${cx}" cy="500" r="8" fill="#ffe9a8"/>
    <g ${ol(3)}>
      <path d="M${x + 6} ${FLOOR_Y - 14} V${y + r + 70} L${cx - 26} ${y + r + 110} V${FLOOR_Y - 64} Z" fill="#d8b48c"/>
      <path d="M${x + w - 6} ${FLOOR_Y - 14} V${y + r + 70} L${cx + 26} ${y + r + 110} V${FLOOR_Y - 64} Z" fill="#d8b48c"/>
    </g>
    <path d="M${x + 14} ${y + r + 112} V${y + r + 130} M${x + w - 18} ${y + r + 112} V${y + r + 130} M${x + w - 26} ${y + r + 112} V${y + r + 130}" stroke="#8a5f4b" stroke-width="4" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${y + 8}" r="12" fill="${GOLD}" ${ol(3)}/>`;
};
const signLux = (x, y, w, h) => `
  <g id="sign">
    <rect id="shop-sign" x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#4f7a62" ${OL}/>
    <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" rx="10" fill="none" ${goldOl(4)}/>
    <rect x="${x + 18}" y="${y + 18}" width="${w - 36}" height="${h - 36}" rx="7" fill="none" stroke="${GOLD}" stroke-width="2"/>
    <path d="M${x + w / 2} ${y + h * 0.36} C ${x + w / 2 - 14} ${y + h * 0.28} ${x + w / 2 - 14} ${y + h * 0.16} ${x + w / 2} ${y + h * 0.1} C ${x + w / 2 + 14} ${y + h * 0.16} ${x + w / 2 + 14} ${y + h * 0.28} ${x + w / 2} ${y + h * 0.36} Z M${x + w / 2} ${y + h * 0.36} C ${x + w / 2 - 24} ${y + h * 0.34} ${x + w / 2 - 32} ${y + h * 0.26} ${x + w / 2 - 34} ${y + h * 0.18} C ${x + w / 2 - 16} ${y + h * 0.2} ${x + w / 2 - 6} ${y + h * 0.28} ${x + w / 2} ${y + h * 0.36} Z M${x + w / 2} ${y + h * 0.36} C ${x + w / 2 + 24} ${y + h * 0.34} ${x + w / 2 + 32} ${y + h * 0.26} ${x + w / 2 + 34} ${y + h * 0.18} C ${x + w / 2 + 16} ${y + h * 0.2} ${x + w / 2 + 6} ${y + h * 0.28} ${x + w / 2} ${y + h * 0.36} Z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M${x + 50} ${y + h * 0.74} H${x + w - 50}" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>
    <text id="shop-name" x="${x + w / 2}" y="${y + h * 0.6}" font-size="32" font-weight="700" fill="#ffe9a8" text-anchor="middle">Tên tiệm</text>
  </g>`;
const signL2 = (x, y, w) => `
  <g id="sign">
    <path d="M${x + 50} 26 V${y} M${x + w - 50} 26 V${y}" ${ol(3)} fill="none"/>
    <rect id="shop-sign" x="${x}" y="${y}" width="${w}" height="88" rx="20" fill="#4f7a62" ${OL}/>
    <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="68" rx="13" fill="none" stroke="#a9c9b3" stroke-width="3"/>
    <path d="M${x + 26} ${y + 44} C ${x + 34} ${y + 30} ${x + 46} ${y + 30} ${x + 50} ${y + 44} C ${x + 46} ${y + 58} ${x + 34} ${y + 58} ${x + 26} ${y + 44} Z M${x + w - 26} ${y + 44} C ${x + w - 34} ${y + 30} ${x + w - 46} ${y + 30} ${x + w - 50} ${y + 44} C ${x + w - 46} ${y + 58} ${x + w - 34} ${y + 58} ${x + w - 26} ${y + 44} Z" fill="#a9c9b3"/>
    <text id="shop-name" x="${x + w / 2}" y="${y + 56}" font-size="34" font-weight="700" fill="#fffaf3" text-anchor="middle">Tên tiệm</text>
  </g>`;
const chairsPreview = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [`chair-${i + 1}`, 'E02']));

// S01-L2 – Cấp 2: thêm phòng trị liệu thứ 2 (8 ghế chờ: 2 hàng sau + 6 hàng trước)
const L2_FRONT = [190, 322, 454, 586, 718, 850];
buildScene({
  scene: 'S01-L2', title: 'Sảnh tiệm (cấp 2 – thêm phòng trị liệu thứ 2)', defs: patLeaf('s01l2-wall', '#f4e6d6', '#ecdac6'),
  text: [{ id: 'shop-name', default: 'Tên tiệm', x: 0.5, y: 0.126, baseline: true, maxWidth: 0.3, fontSize: 34, note: 'Biển xanh đậm, chữ kem' }],
  layers: [
    L('bg', { svg: papered('s01l2-wall') + panels(480, '#efe0cd', '#e0c9ae', '#d8b48c', 8) + cornice('#e8d2b8') + floor('#dcb88f', '#c8a077') + window_(560, 190, 200, 170, '#a9c9b3') + domePendant(160, 110) + domePendant(830, 110) + runnerRug(170, 935, 820, 55, '#a9c9b3') }),
    L('decor-wall', { svg: door(30, 370, 140) + archDoor(207, 112) + roomMark(263, 300, 2, '#f0c6b8') + art(392, 330, 150, 100) + archDoor(897, 104) + roomMark(949, 306, 1, '#f0c6b8') + signL2(325, 66, 350) }),
    L('actors-behind-counter', { empty: true }),
    L('counter', { svg: counterL2(345, 260) }),
    L('slots-back', { slots: [
      slot('chair-1', 625, BACK, EQ.E02, ['E02'], { default: 'E02' }),
      slot('chair-2', 760, BACK, EQ.E02, ['E02'], { default: 'E02' }),
    ] }),
    L('actors', { empty: true }),
    L('slots-front', { slots: L2_FRONT.map((x, i) => slot(`chair-${i + 3}`, x, FRONT, EQ.E02, ['E02'])) }),
    L('fg', { role: 'tiền cảnh: chậu cây góc trái', svg: potPlant(85, 990, 1.05) }),
  ],
  anchors: [
    { id: 'receptionist', x: 475, y: 700, note: 'Sau quầy' },
    { id: 'entrance', x: 100, y: 720, note: 'Cửa chính (khách mới đứng ở cửa)' },
    { id: 'room-door-1', x: 949, y: 720, note: 'Cửa phòng trị liệu 1 (vòm phải, dấu I)' },
    { id: 'room-door-2', x: 263, y: 720, note: 'Cửa phòng trị liệu 2 (vòm trái, dấu II)' },
    { id: 'counter-front', x: 475, y: 940, note: 'Trước quầy' },
  ],
  preview: chairsPreview(8),
});

// S01-L3 – Cấp 3: tiệm cao cấp (10 ghế chờ: 3 hàng sau + 7 hàng trước)
const L3_FRONT = [40, 172, 304, 436, 568, 700, 832];
buildScene({
  scene: 'S01-L3', title: 'Sảnh tiệm (cấp 3 – tiệm cao cấp)', defs: patDamask('s01l3-wall', '#f7ece0', '#efdcc6') + glowGrad('glow'),
  text: [{ id: 'shop-name', default: 'Tên tiệm', x: 0.3, y: 0.348, baseline: true, maxWidth: 0.22, fontSize: 32, note: 'Biển hiệu cao cấp sau quầy (xanh đậm viền vàng), chữ vàng nhạt' }],
  layers: [
    L('bg', { svg: papered('s01l3-wall') + panels(470, '#efe2d2', '#dcc4a8', GOLD, 8) + cornice(GOLD) + `
    <rect x="-4" y="22" width="1008" height="10" fill="#fffaf3" ${ol(3)}/>` + marbleFloor() + runnerRug(25, 932, 950, 58, '#e7b4a6', GOLD) + grandChandelier(640, 50) + hangingPlant(95, 130, GOLD) }),
    L('decor-wall', { svg: doorLux(20, 400, 130) + signLux(170, 236, 260, 190) + goldArt(470, 250, 110, 150, 'leaf') + goldArt(600, 230, 140, 190, 'lotus') + goldArt(760, 250, 80, 150, 'hills') + sconce(455, 300).replace(/#fffaf3/, '#ffe9a8') + grandArch(866, 116, 290) }),
    L('actors-behind-counter', { empty: true }),
    L('counter', { svg: counterLux(185, 230) }),
    L('slots-back', { slots: [
      slot('chair-1', 440, BACK, EQ.E02, ['E02'], { default: 'E02' }),
      slot('chair-2', 572, BACK, EQ.E02, ['E02'], { default: 'E02' }),
      slot('chair-3', 704, BACK, EQ.E02, ['E02']),
    ] }),
    L('actors', { empty: true }),
    L('slots-front', { slots: L3_FRONT.map((x, i) => slot(`chair-${i + 4}`, x, FRONT, EQ.E02, ['E02'])) }),
    L('fg', { empty: true }),
  ],
  anchors: [
    { id: 'receptionist', x: 300, y: 700, note: 'Sau quầy, trước biển hiệu' },
    { id: 'entrance', x: 85, y: 720, note: 'Cửa chính' },
    { id: 'room-door', x: 924, y: 720, note: 'Hành lang vòm dẫn vào phòng trị liệu 1 và 2' },
    { id: 'counter-front', x: 300, y: 940, note: 'Trước quầy' },
  ],
  preview: chairsPreview(10),
});

// ---------------------------------------------------------------- treatment rooms
const s02Slots = () => [
  { id: 'slots-shelf', role: 'chỗ bày vật tư / dụng cụ trên kệ', slots: [
    itemSlot('shelf-1', 580, 300), itemSlot('shelf-2', 660, 300), itemSlot('shelf-3', 740, 300), itemSlot('shelf-4', 820, 300),
    itemSlot('shelf-5', 580, 430), itemSlot('shelf-6', 660, 430),
    { ...slot('shelf-tool', 740, 430, EQ.E07, ['E07'], { note: 'Bộ đá gua sha hoặc để trống' }) },
  ] },
  { id: 'slots-back', role: 'giường 1–2, máy xông, đèn & tinh dầu', slots: [
    slot('steamer', 50, BACK, EQ.E03, ['E03']),
    slot('bed-1', 170, BACK, EQ.E01, ['E01', 'E01-upgraded'], { default: 'E01' }),
    slot('bed-2', 520, BACK, EQ.E01, ['E01', 'E01-upgraded']),
    slot('aroma', 845, BACK, EQ.E05, ['E05']),
  ] },
  { id: 'actors', role: 'trống – code chèn KTV/khách', empty: true },
  { id: 'slots-front', role: 'giường 3–4', slots: [
    slot('bed-3', 120, FRONT, EQ.E01, ['E01', 'E01-upgraded']),
    slot('bed-4', 520, FRONT, EQ.E01, ['E01', 'E01-upgraded']),
  ] },
];
const room2Slots = () => [
  { id: 'slots-back', role: 'giường 5–6 (phòng 2)', slots: [
    slot('bed-5', 170, BACK, EQ.E01, ['E01', 'E01-upgraded'], { note: 'Phòng 2 = giường bed-5..8 (GAME_DESIGN §12.1)' }),
    slot('bed-6', 520, BACK, EQ.E01, ['E01', 'E01-upgraded']),
  ] },
  { id: 'actors', role: 'trống – code chèn KTV/khách', empty: true },
  { id: 'slots-front', role: 'giường 7–8', slots: [
    slot('bed-7', 120, FRONT, EQ.E01, ['E01', 'E01-upgraded']),
    slot('bed-8', 520, FRONT, EQ.E01, ['E01', 'E01-upgraded']),
  ] },
];
const bedAnchors = (a, b, c, d) => [
  { id: `bed-${a}-staff`, x: 320, y: 720, note: `KTV ở giường ${a}` },
  { id: `bed-${b}-staff`, x: 670, y: 720, note: `KTV ở giường ${b}` },
  { id: `bed-${c}-staff`, x: 270, y: 940, note: `KTV ở giường ${c}` },
  { id: `bed-${d}-staff`, x: 670, y: 940, note: `KTV ở giường ${d}` },
];
const s02Preview = { 'bed-1': 'E01-upgraded', 'bed-2': 'E01', 'bed-3': 'E01', 'bed-4': 'E01-upgraded', steamer: 'E03', aroma: 'E05', 'shelf-1': 'I01', 'shelf-2': 'I02', 'shelf-3': 'I04', 'shelf-4': 'I05', 'shelf-5': 'I06', 'shelf-6': 'I03', 'shelf-tool': 'E07' };
const hangPlantS02 = `
    <g ${OL}>
      <path d="M940 26 V150" fill="none" stroke-width="3"/>
      <path d="M915 150 H965 L958 186 H922 Z" fill="#e7b4a6"/>
      <path d="M925 180 C 905 210 900 240 910 270 M940 186 C 940 220 935 250 945 290 M955 180 C 975 210 978 236 970 262" stroke="#7aa588" stroke-width="5" fill="none"/>
    </g>`;
function roomScene({ scene, title, defs, bg, decor, fg = '', ambientOp = 0.16, room = 1 }) {
  const slotLayers = room === 1 ? s02Slots() : room2Slots();
  buildScene({
    scene, title, defs,
    layers: [
      { id: 'bg', role: 'tường, sàn, cửa sổ, đèn', svg: bg },
      { id: 'decor-wall', role: 'kệ, tranh, cây, trang trí', svg: decor },
      ...slotLayers,
      { id: 'fg', role: fg ? 'tiền cảnh: cây / nến góc phòng' : 'tiền cảnh (trống)', ...(fg ? { svg: fg } : { empty: true }) },
      { id: 'ambient', role: 'ánh sáng ấm khi có E05 (mặc định ẩn)', attrs: 'style="display:none" pointer-events="none"', svg: ambient('#ffe9a8', ambientOp) },
    ],
    anchors: room === 1 ? bedAnchors(1, 2, 3, 4) : bedAnchors(5, 6, 7, 8),
    toggles: [{ group: 'ambient', showWhen: room === 1 ? 'E05 đặt ở slot aroma' : 'E05 ở phòng 1 (phòng 2 dùng chung)' }],
    preview: room === 1 ? s02Preview : { 'bed-5': 'E01', 'bed-6': 'E01-upgraded', 'bed-7': 'E01-upgraded', 'bed-8': 'E01' },
  });
}

// S02-L1 – phòng trị liệu, cấp 1: ốp tường thấp, 2 đèn, thảm, cây góc
roomScene({
  scene: 'S02-L1', title: 'Phòng trị liệu (cấp 1)',
  bg: wall('#f6e8d8') + railBand(470, '#efdcc6') + cornice() + floor() + window_(110, 170, 230, 210, '#a9c9b3') + pendant(300, 100) + pendant(700, 100) + runnerRug(80, 900, 800, 80, '#f0c6b8'),
  decor: shelf(560, 340, [300, 430]) + art(395, 200, 130, 100) + hangPlantS02,
  fg: plant(60, FRONT + 40, 0.95),
});
// S02-L2 – cấp 2: giấy dán tường lá, ốp gỗ, đèn mây, thảm xanh lớn, tấm ốp sau kệ
roomScene({
  scene: 'S02-L2', title: 'Phòng trị liệu 1 (cấp 2)', defs: patLeaf('s02l2-wall', '#f1e9da', '#dfe4cf'),
  bg: papered('s02l2-wall') + panels(470, '#e8d2b8', '#c49a70', '#c49a70', 7) + cornice('#d8b48c') + floor('#cfa67c', '#b88f66') + window_(100, 165, 250, 220, '#8fb39a') + domePendant(470, 70) + domePendant(820, 40) + runnerRug(60, 880, 860, 105, '#a9c9b3'),
  decor: `
    <rect x="548" y="196" width="364" height="268" rx="16" fill="#e8d2b8" ${OL}/>
    <rect x="562" y="210" width="336" height="240" rx="10" fill="#f6ead9" stroke="#d8b48c" stroke-width="3"/>` + shelf(560, 340, [300, 430]) + goldArt(385, 190, 140, 120, 'hills').replace(new RegExp(GOLD, 'g'), '#c49a70') + hangPlantS02,
  fg: potPlant(55, FRONT + 45, 0.95, '#d8b48c'),
});
// S02-L3 – cấp 3 cao cấp: giấy dán tường hoa văn, ốp viền vàng, sàn đá, đèn chùm, cửa vòm rèm dày, hốc kệ sáng
roomScene({
  scene: 'S02-L3', title: 'Phòng trị liệu 1 (cấp 3 – cao cấp)', defs: patDamask('s02l3-wall', '#f7ece0', '#efdcc6') + glowGrad('glow') + glowGrad('nicheglow', '#ffe9a8'),
  bg: papered('s02l3-wall') + panels(480, '#efe2d2', '#dcc4a8', GOLD, 7) + cornice(GOLD) + `
    <rect x="-4" y="22" width="1008" height="10" fill="#fffaf3" ${ol(3)}/>` + marbleFloor() + archWindow(120, 150, 210, 260, '#cfe3e6') + drapes(120, 150, 210, 260, '#d98a83') + grandChandelier(450, 30, 0.8) + runnerRug(70, 885, 840, 100, '#e7b4a6', GOLD),
  decor: `
    <g ${OL}>
      <path d="M545 470 V250 A185 70 0 0 1 915 250 V470 Z" fill="#fffaf3"/>
      <path d="M545 470 V250 A185 70 0 0 1 915 250 V470" fill="none" ${goldOl(5)}/>
    </g>
    <ellipse cx="730" cy="330" rx="200" ry="150" fill="url(#nicheglow)" opacity="0.6"/>
    <path d="M688 206 H710 M750 206 H772" stroke="${GOLD_D}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="730" cy="206" r="15" fill="${GOLD}" ${ol(3)}/>
    <path d="M730 215 C 723 210 723 202 730 196 C 737 202 737 210 730 215 Z M730 215 C 722 214 718 209 717 204 C 724 205 728 209 730 215 Z M730 215 C 738 214 742 209 743 204 C 736 205 732 209 730 215 Z" fill="#fffaf3" stroke="${GOLD_D}" stroke-width="1.5" stroke-linejoin="round"/>` + shelfLux(560, 340, [300, 430]) + goldArt(380, 200, 130, 110, 'lotus') + hangingPlant(960, 60, GOLD),
  fg: potPlant(55, FRONT + 45, 1.05, GOLD) + candleTrio(850, FRONT + 30) + potPlant(955, FRONT + 45, 0.95, GOLD, ['#a9c9b3', '#8fb39a']),
  ambientOp: 0.12,
});

// S06 – phòng trị liệu 2 (cấp 2): tông hồng đất, cửa sổ phải, kệ khăn trái
const room2Shelf = `
    ${shelf(110, 290, [300, 430])}
    ${towelStack(130, 300)}${jar(215, 300)}${jar(265, 300, '#a9c9b3', 40)}${towelStack(318, 300, ['#f0c6b8', '#ffffff'])}
    ${candles(135, 430)}${towelStack(215, 430, ['#a9c9b3', '#ffffff', '#a9c9b3'])}${jar(300, 430, '#e7b4a6', 44)}`;
const cabinet = (x, w, top, fill = '#e8d2b8', knob = '#8a5f4b') => `
    <g ${OL}>
      <rect x="${x}" y="${top}" width="${w}" height="${BACK - top}" rx="8" fill="${fill}"/>
      <rect x="${x - 6}" y="${top - 10}" width="${w + 12}" height="14" rx="5" fill="#c49a70"/>
      <path d="M${x + w / 2} ${top + 14} V${BACK - 12}" stroke="#c49a70" stroke-width="3" fill="none"/>
      <rect x="${x + 12}" y="${top + 14}" width="${w / 2 - 22}" height="${BACK - top - 28}" rx="6" fill="none" stroke="#c49a70" stroke-width="3"/>
      <rect x="${x + w / 2 + 10}" y="${top + 14}" width="${w / 2 - 22}" height="${BACK - top - 28}" rx="6" fill="none" stroke="#c49a70" stroke-width="3"/>
    </g>
    <circle cx="${x + w / 2 - 12}" cy="${(top + BACK) / 2}" r="5" fill="${knob}"/><circle cx="${x + w / 2 + 12}" cy="${(top + BACK) / 2}" r="5" fill="${knob}"/>`;
roomScene({
  scene: 'S06', title: 'Phòng trị liệu 2 (cấp 2)', room: 2, defs: patStripe('s06-wall', '#f6e3da', '#f0d6ca'),
  bg: papered('s06-wall') + railBand(480, '#ecd2c4') + cornice() + floor('#d4ae86', '#bf9670') + window_(640, 170, 240, 210, '#e7b4a6') + pendant(260, 110, '#f0c6b8') + pendant(560, 90, '#f0c6b8') + runnerRug(80, 900, 800, 80, '#e7b4a6'),
  decor: room2Shelf + art(430, 230, 130, 110) + cabinet(18, 140, 580) + towelStack(56, 570, ['#ffffff', '#f0c6b8']) + potPlant(935, BACK, 1, '#a9c9b3'),
  fg: plant(60, FRONT + 40, 0.95),
});
// S06-L3 – phòng trị liệu 2 cao cấp: tường xanh lá nhạt hoa văn, ốp xanh đậm viền vàng, sàn đá ấm
roomScene({
  scene: 'S06-L3', title: 'Phòng trị liệu 2 (cấp 3 – cao cấp)', room: 2, defs: patDamask('s06l3-wall', '#e9efe3', '#d8e3d2') + glowGrad('glow'),
  bg: papered('s06l3-wall') + panels(480, '#8fb39a', '#7aa588', GOLD, 7) + cornice(GOLD) + `
    <rect x="-4" y="22" width="1008" height="10" fill="#fffaf3" ${ol(3)}/>` + marbleFloor('#f3e8dc', '#e6d4c0', '#d4bea6') + archWindow(650, 150, 220, 260, '#cfe3e6') + drapes(650, 150, 220, 260, '#a9c9b3') + grandChandelier(420, 30, 0.8) + runnerRug(70, 885, 840, 100, '#8fb39a', GOLD),
  decor: shelfLux(110, 290, [300, 430]) + `
    ${towelStack(130, 300, ['#ffffff', '#fffaf3', '#e7b4a6'])}${jar(215, 300, GOLD)}${jar(265, 300, '#fffaf3', 40)}${orchid(345, 300)}
    ${candleTrio(130, 430)}${towelStack(240, 430, ['#a9c9b3', '#ffffff', '#a9c9b3'])}${jar(320, 430, '#e7b4a6', 44)}` + goldArt(440, 220, 120, 150, 'leaf') + cabinet(18, 140, 580, '#f6efe6', GOLD) + orchid(88, 568) + potPlant(935, BACK, 1.1, GOLD),
  fg: potPlant(55, FRONT + 45, 1.05, GOLD) + candleTrio(860, FRONT + 30),
  ambientOp: 0.12,
});

// ---------------------------------------------------------------- wash / foot areas per level
//   wash  L0–1 S04 · L2 S04-L2 · L3 S04-L3   (same slots as S04)
//   foot  L0–1 S05 · L2 S05-L2 · L3 S05-L3   (same slots as S05)
/** splash-wall tiles from y=top to the floor, with a trim rail */
const tileBand = (top, fill, line, trim = '#d8b48c', step = 50) => `
    <rect x="0" y="${top}" width="1000" height="${FLOOR_Y - top}" fill="${fill}"/>
    <path d="${Array.from({ length: Math.ceil((FLOOR_Y - top) / step) }, (_, i) => `M0 ${top + 30 + i * step} H1000`).join(' ')} ${Array.from({ length: Math.ceil(1000 / step) + 1 }, (_, i) => `M${i * step} ${top} V${FLOOR_Y}`).join(' ')}" stroke="${line}" stroke-width="3" fill="none"/>
    <rect x="-4" y="${top - 6}" width="1008" height="14" rx="4" fill="${trim}" ${ol(3)}/>`;
/** marble splash wall (L3): big slabs with soft veins */
const marbleWall = (top, a = '#f6efe6', b = '#efe4d7', vein = '#dccab7') => `
    <rect x="0" y="${top}" width="1000" height="${FLOOR_Y - top}" fill="${a}"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${i * 200}" y="${top}" width="200" height="${FLOOR_Y - top}" fill="${i % 2 ? b : a}" stroke="${vein}" stroke-width="2.5"/>`).join('')}
    <path d="M30 ${top + 60} C 80 ${top + 50} 110 ${top + 90} 170 ${top + 80} M240 ${top + 180} C 300 ${top + 160} 330 ${top + 200} 390 ${top + 190} M450 ${top + 70} C 500 ${top + 90} 540 ${top + 60} 590 ${top + 80} M640 ${top + 200} C 700 ${top + 180} 730 ${top + 220} 790 ${top + 205} M830 ${top + 90} C 880 ${top + 70} 910 ${top + 110} 970 ${top + 95}" stroke="${vein}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <rect x="-4" y="${top - 6}" width="1008" height="14" rx="4" fill="${GOLD}" ${ol(3)}/>`;
/** framed mirror (L2: wood double frame; L3: gold arch) + sconces */
const mirrorL2 = (x, y) => `
    <g ${OL}>
      <rect x="${x - 10}" y="${y - 10}" width="170" height="210" rx="80" fill="#c49a70"/>
      <rect x="${x}" y="${y}" width="150" height="190" rx="70" fill="#e8d2b8"/>
      <rect x="${x + 14}" y="${y + 14}" width="122" height="162" rx="58" fill="#cfe3e6"/>
      <path d="M${x + 40} ${y + 60} L${x + 70} ${y + 30} M${x + 44} ${y + 90} L${x + 96} ${y + 38}" stroke="#ffffff" stroke-width="6" fill="none"/>
    </g>`;
const mirrorLux = (x, y) => `
    <g ${OL}>
      <path d="M${x - 14} ${y + 214} V${y + 75} A89 89 0 0 1 ${x + 164} ${y + 75} V${y + 214} Z" fill="${GOLD}"/>
      <path d="M${x} ${y + 200} V${y + 75} A75 75 0 0 1 ${x + 150} ${y + 75} V${y + 200} Z" fill="#cfe3e6"/>
      <path d="M${x + 36} ${y + 90} L${x + 70} ${y + 56} M${x + 40} ${y + 124} L${x + 100} ${y + 64}" stroke="#ffffff" stroke-width="6" fill="none"/>
    </g>
    <circle cx="${x + 75}" cy="${y - 20}" r="11" fill="${GOLD}" ${ol(3)}/>`;
const wallSconce = (x, y, shade = '#fffaf3', arm = '#c49a70') => `
    <g ${OL}>
      <path d="M${x} ${y + 40} V${y + 18}" stroke="${arm}" stroke-width="5" fill="none"/>
      <rect x="${x - 10}" y="${y + 36}" width="20" height="14" rx="4" fill="${arm}"/>
      <path d="M${x - 18} ${y + 18} H${x + 18} L${x + 12} ${y - 10} H${x - 12} Z" fill="${shade}"/>
    </g>
    <circle cx="${x}" cy="${y + 4}" r="22" fill="#ffe9a8" opacity="0.35"/>`;
/** backing board behind a shelf (L2) / glowing arched niche (L3) */
const shelfBoard = (x, y, w, h) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#e8d2b8" ${OL}/>
    <rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" rx="10" fill="#f6ead9" stroke="#d8b48c" stroke-width="3"/>`;
const shelfNiche = (x, y, w, h) => `
    <g ${OL}>
      <path d="M${x} ${y + h} V${y + 60} A${w / 2} 60 0 0 1 ${x + w} ${y + 60} V${y + h} Z" fill="#fffaf3"/>
      <path d="M${x} ${y + h} V${y + 60} A${w / 2} 60 0 0 1 ${x + w} ${y + 60} V${y + h}" fill="none" ${goldOl(5)}/>
    </g>
    <ellipse cx="${x + w / 2}" cy="${y + h * 0.55}" rx="${w * 0.55}" ry="${h * 0.6}" fill="url(#nicheglow)" opacity="0.6"/>`;
/** towel cabinet variants */
const towelCabinetL3 = x => towelCabinet(x).replace(/fill="#e8d2b8"/, 'fill="#f6efe6"').replace(/fill="#8a5f4b" stroke="none"/g, `fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"`) + `
    <rect x="${x - 6}" y="${BACK - 180}" width="172" height="14" rx="5" fill="${GOLD}" ${ol(3)}/>`;
/** bamboo in a planter of a given colour (L2 wood / L3 gold) */
const bambooIn = (x, planter) => bamboo(x).replace('<rect x="' + (x - 26) + '" y="' + (BACK - 50) + '" width="118" height="50" rx="8" fill="#c49a70"/>',
  `<path d="M${x - 30} ${BACK - 56} H${x + 96} L${x + 86} ${BACK} H${x - 20} Z" fill="${planter}"/><path d="M${x - 26} ${BACK - 40} H${x + 92}" stroke-width="3" fill="none"/>`);
const bathMat = (x, y, w, h, fill, border = '#fffaf3') => runnerRug(x, y, w, h, fill, border);
const pebblesLux = `
    <g ${ol(2)}>${[[30, 12], [80, 9], [128, 11], [180, 8], [232, 12], [300, 9], [360, 11], [430, 10], [500, 12], [570, 9], [640, 11], [710, 10], [780, 12], [850, 9], [920, 11], [975, 9]].map(([x, r], i) => `<ellipse cx="${x}" cy="${FLOOR_Y - 26 + (i % 2) * 3}" rx="${r + 10}" ry="${r - 1}" fill="${['#fffaf3', '#f6efe6', '#e8d2b8'][i % 3]}"/>`).join('')}</g>`;
const goldArtWood = (x, y, w, h, inner) => goldArt(x, y, w, h, inner).replace(new RegExp(GOLD, 'g'), '#c49a70');

// S04-L2 – khu gội cấp 2: giấy dán tường lá, gạch xanh nhạt viền gỗ, đèn mây, gương khung gỗ đôi, bảng sau kệ, thảm
washScene({
  scene: 'S04-L2', title: 'Khu gội đầu (cấp 2)', defs: patLeaf('s04l2-wall', '#f1e9da', '#dfe4cf'),
  bg: papered('s04l2-wall') + tileBand(420, '#dcece2', '#c3dccb', '#c49a70') + cornice('#d8b48c') + floor('#cfa67c', '#b88f66') + domePendant(300, 60) + domePendant(560, 40) + bathMat(400, 905, 420, 70, '#a9c9b3'),
  decor: shelfBoard(628, 196, 304, 152) + shelf(640, 300, [330]) + mirrorL2(420, 160) + wallSconce(392, 210) + wallSconce(608, 210)
    + goldArtWood(205, 205, 130, 110, 'hills') + towelCabinet(810) + towelStack(858, 550, ['#a9c9b3', '#ffffff']) + hangingPlant(960, 60, '#d8b48c'),
  fg: potPlant(960, FRONT + 45, 0.85, '#d8b48c'),
});
// S04-L3 – khu gội cao cấp: giấy hoa văn, ốp đá cẩm thạch viền vàng, sàn đá, đèn chùm, gương vòm vàng, hốc kệ sáng
washScene({
  scene: 'S04-L3', title: 'Khu gội đầu (cấp 3 – cao cấp)', defs: patDamask('s04l3-wall', '#f7ece0', '#efdcc6') + glowGrad('glow') + glowGrad('nicheglow', '#ffe9a8'),
  bg: papered('s04l3-wall') + marbleWall(420) + cornice(GOLD) + `
    <rect x="-4" y="22" width="1008" height="10" fill="#fffaf3" ${ol(3)}/>` + marbleFloor() + grandChandelier(290, 30, 0.7) + runnerRug(400, 905, 420, 70, '#e7b4a6', GOLD),
  decor: shelfNiche(625, 180, 290, 170) + shelfLux(640, 300, [330]) + mirrorLux(420, 150)
    + goldArt(215, 200, 120, 130, 'lotus') + towelCabinetL3(810) + orchid(890, 540) + towelStack(822, 540, ['#ffffff', '#fffaf3', '#e7b4a6']) + hangingPlant(965, 60, GOLD),
  fg: potPlant(960, FRONT + 45, 0.9, GOLD) + candleTrio(800, FRONT + 30),
});
// S05-L2 – khu ngâm chân cấp 2: giấy dán tường lá, ốp gỗ, đèn mây, rèm xanh, trúc chậu gỗ, bảng sau kệ, thảm
footScene({
  scene: 'S05-L2', title: 'Khu ngâm chân (cấp 2)', defs: patLeaf('s05l2-wall', '#f1e9da', '#dfe4cf'),
  bg: papered('s05l2-wall') + panels(470, '#e8d2b8', '#c49a70', '#c49a70', 7) + cornice('#d8b48c') + floor('#cfa67c', '#b88f66') + window_(380, 160, 240, 200, '#8fb39a') + domePendant(250, 50) + domePendant(740, 40) + pebbles + runnerRug(200, 895, 600, 85, '#a9c9b3'),
  decor: shelfBoard(68, 196, 284, 152) + shelf(80, 260, [330]) + bambooIn(860, '#d8b48c') + goldArtWood(660, 210, 140, 150, 'hills') + wallSconce(345, 400) + wallSconce(655, 400),
  fg: potPlant(950, FRONT + 45, 0.9, '#d8b48c'),
});
// S05-L3 – khu ngâm chân cao cấp: giấy hoa văn, ốp viền vàng, sàn đá, đèn chùm, cửa vòm rèm, hốc kệ sáng, trúc chậu vàng
footScene({
  scene: 'S05-L3', title: 'Khu ngâm chân (cấp 3 – cao cấp)', defs: patDamask('s05l3-wall', '#f7ece0', '#efdcc6') + glowGrad('glow') + glowGrad('nicheglow', '#ffe9a8'),
  bg: papered('s05l3-wall') + panels(480, '#efe2d2', '#dcc4a8', GOLD, 7) + cornice(GOLD) + `
    <rect x="-4" y="22" width="1008" height="10" fill="#fffaf3" ${ol(3)}/>` + marbleFloor() + archWindow(400, 150, 200, 250, '#cfe3e6') + drapes(400, 150, 200, 250, '#d98a83') + grandChandelier(760, 30, 0.7) + pebblesLux + runnerRug(190, 890, 620, 92, '#e7b4a6', GOLD),
  decor: shelfNiche(65, 180, 290, 170) + shelfLux(80, 260, [330]) + bambooIn(860, GOLD) + goldArt(665, 225, 130, 140, 'leaf'),
  fg: potPlant(955, FRONT + 45, 1, GOLD) + candleTrio(830, FRONT + 30),
  ambientOp: 0.12,
});
console.log('done');
