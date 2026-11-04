// usage: node sheet.mjs out.html cellW cellH cols file1.svg file2.svg ...
import fs from 'fs'; import path from 'path';
const [out, cw, ch, cols, ...files] = process.argv.slice(2);
const cells = files.map(f => `<div class="c"><div class="i"><img src="file://${path.resolve(f)}"></div><div class="l">${path.basename(f)}</div></div>`).join('');
fs.writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#fbf6f0;font:13px Helvetica;display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:8px;padding:8px}
.c{background:#fff;border:1px solid #e0d0c0}.i{width:${cw}px;height:${ch}px;display:flex;align-items:center;justify-content:center;
background-image:linear-gradient(45deg,#f2eee9 25%,transparent 25%,transparent 75%,#f2eee9 75%),linear-gradient(45deg,#f2eee9 25%,transparent 25%,transparent 75%,#f2eee9 75%);background-size:16px 16px;background-position:0 0,8px 8px}
img{max-width:${cw-10}px;max-height:${ch-10}px}.l{padding:2px 4px;color:#3d2c25}</style></head><body>${cells}</body></html>`);
