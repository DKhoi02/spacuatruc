# Spa của Trúc – game học ấn huyệt

Web app cài lên màn hình chính iPhone (PWA). Dữ liệu chỉ lưu trên máy, có xuất/nhập file save.
Thiết kế: thư mục `docs/`. Hình vẽ: thư mục `art/` (script tạo hình trong `art/_src/`).

## Chạy trên máy
```bash
npm install
npm run dev        # mở http://localhost:5173 (thử trên iPhone cùng Wi-Fi: http://<IP máy>:5173)
npm test           # chạy bài kiểm tra tự động
npm run build      # build bản chính thức vào dist/
npm run preview    # xem thử bản build (có service worker)
```
Trang thử riêng màn trị liệu: `http://localhost:5173/treatment-dev.html` (chỉ khi chạy dev).

## Đưa lên Netlify
1. Đẩy thư mục dự án lên một kho Git riêng tư (GitHub/GitLab).
2. Netlify → Add new site → Import from Git → chọn kho. Cấu hình đã có sẵn trong `netlify.toml` (lệnh `npm run build`, thư mục `dist`).
3. Đặt tên site là **spacuatruc** (Site configuration → Change site name) → địa chỉ game: https://spacuatruc.netlify.app
4. Trên iPhone: mở link bằng **Safari** → Chia sẻ → **Thêm vào Màn hình chính** → mở game từ biểu tượng.

Đổi tên hiển thị của app (đang là "Spa của Trúc"): sửa `vite.config.ts` (manifest) và `index.html`; hình hướng dẫn cài đặt tạo lại bằng `node art/_src/shop/build-install.mjs`.

## Cấu trúc code
- `src/core/` – bộ máy game (thuần TypeScript, có test): ngày chơi, khách, chấm điểm, độ thành thạo, kinh tế, nhân viên, chương, bài kiểm tra, save.
- `src/data/` – nội dung: huyệt, cơ, vùng phản xạ, dịch vụ, vật tư, đồ dùng, chương.
- `src/ui/treatment/` – màn trị liệu (chạm, giữ, thanh lực, vuốt cơ, vùng phản xạ, các bước chăm sóc).
- `src/ui/` – các màn hình còn lại; `src/save/` – lưu IndexedDB, xuất/nhập file.
# spa_web_game
