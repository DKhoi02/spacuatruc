// Chạy lại sau khi tạo lại V01, V03 hoặc V05 bằng script: đổi nhãn trái/phải từ "bên màn hình" sang "bên của khách".
// Cách chạy: node art/_src/normalize-sides.mjs V01 V03 V05
import fs from "node:fs";
import path from "node:path";
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "views");
const sw = s => (s === "left" ? "right" : s === "right" ? "left" : s);
for (const v of process.argv.slice(2)) {
  const f = path.join(dir, v + ".json");
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const k of ["points", "muscles", "forbidden", "zones"])
    for (const e of j[k] || []) {
      if (e.side) e.side = sw(e.side);
      if (k === "forbidden" && e.id) e.id = e.id.replace(/-(left|right)$/, (m, s) => "-" + sw(s));
    }
  j.sideConvention = 'customer: "left"/"right" = bên trái/phải CỦA KHÁCH (giải phẫu), không phải bên màn hình';
  j.screenLeftIs = "customer-right";
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
  console.log("Đã chuẩn hóa", v);
}
