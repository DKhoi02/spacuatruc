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

## Đưa lên GitHub Pages (đang dùng)
Địa chỉ game: **https://dkhoi02.github.io/spa_web_game/**

- Mỗi lần `git push` lên nhánh `main`, GitHub Actions (`.github/workflows/deploy.yml`) tự chạy test, build với đường dẫn `/<tên repo>/` rồi đăng lên GitHub Pages.
- Lần đầu: vào repo trên GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Repo phải để **Public** nếu dùng gói GitHub miễn phí.
- Xem tiến trình ở tab **Actions** của repo.
- Nếu đổi tên repo, địa chỉ đổi theo và workflow tự dùng tên mới. Nhớ sửa địa chỉ trong `art/_src/shop/build-install.mjs` rồi chạy `node art/_src/shop/build-install.mjs`.

Trên iPhone: mở địa chỉ bằng **Safari** → Chia sẻ → **Thêm vào Màn hình chính**.

## Cấu trúc code
- `src/core/` – bộ máy game (thuần TypeScript, có test): ngày chơi, khách, chấm điểm, độ thành thạo, kinh tế, nhân viên, chương, bài kiểm tra, save.
- `src/data/` – nội dung: huyệt, cơ, vùng phản xạ, dịch vụ, vật tư, đồ dùng, chương.
- `src/ui/treatment/` – màn trị liệu (chạm, giữ, thanh lực, vuốt cơ, vùng phản xạ, các bước chăm sóc).
- `src/ui/` – các màn hình còn lại; `src/save/` – lưu IndexedDB, xuất/nhập file.
# spa_web_game
