# Ghi chú kỹ thuật – Web game spa trị liệu

> Cập nhật: 04/11/2026
> Trạng thái: **đã chốt**.
>
> **Hướng đã chốt:** game là **web app cài lên màn hình chính iPhone (PWA)**, **chạy và lưu hoàn toàn trên máy người chơi**.
> - **Không có server, không có database, không có đăng nhập.** Không có kế hoạch mở server.
> - **Bắt buộc có xuất/nhập file save** để chuyển máy không phải chơi lại từ đầu.
>
> **Các hướng đã bỏ:** server Windows (Node, Hono, SQLite, Caddy), đăng nhập username/mật khẩu, đồng bộ lên server, bảng xếp hạng, nhiều hồ sơ, nhắc sao lưu, bản dự phòng trên máy, báo cáo cho người hướng dẫn, kỷ lục cá nhân, chặn chơi khi chưa cài, phát hiện Zalo/Facebook, checksum file save, tiếng Anh, thống kê/bản đồ nhiệt, công cụ Editor.
> **Game dùng cho cá nhân.** Tên miền trên Netlify và tên thư mục dự án do chủ dự án tự đặt. Tên tiệm spa trong game do người chơi đặt.

---

## 1. Tham khảo: Tiệm Trà Nhỏ (tiemtranho.com)

Đây là game quản lý tiệm trà sữa chạy trên trình duyệt. Thông tin dưới đây có được từ việc phân tích HTML/JS của trang (11/2026).

| Hạng mục | Họ dùng |
|---|---|
| Build | Vite (ES modules, file có hash, `import()` tải dần) |
| UI | JavaScript/TypeScript thuần, không framework, tạo HTML bằng template string |
| Hiển thị | DOM + CSS. Canvas 2D chỉ dùng để xuất ảnh chia sẻ và mã QR |
| Âm thanh | Web Audio API (`AudioContext`, oscillator), không dùng file âm thanh |
| Lưu game | localStorage, có xuất/nhập file JSON và mã `TTN1:...` |
| Backend | Cloudflare: Pages, Workers, D1 (cho chế độ online) |
| PWA | Có manifest nhưng không có service worker |

**Bài học:** giữ phạm vi nhỏ thì dễ ra mắt. Lưu tại máy thì không cần đăng ký, người chơi vào chơi ngay. Có xuất/nhập save để không mất tiến độ.

---

## 2. Công nghệ đã chốt

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Build | **Vite + TypeScript** | |
| UI | **Preact** | Game nhiều màn hình, framework nhẹ dễ bảo trì |
| Logic game | **Module TS thuần, tách khỏi UI** | Viết test bằng **Vitest** |
| Hiển thị | DOM + CSS animation, hình 2D (SVG/WebP) | Chỉ chuyển sang PixiJS nếu cần nhiều sprite chuyển động |
| Âm thanh | **Howler.js** hoặc Web Audio thuần | iPhone chỉ phát sau lần chạm đầu tiên |
| PWA, chơi offline | **vite-plugin-pwa** (Workbox) | Cache toàn bộ file game. **Bắt buộc** |
| Lưu game | **IndexedDB** qua **idb-keyval** | Bọc trong lớp `storage.ts` |
| Xuất/nhập save | File JSON + bảng Chia sẻ của iPhone | Mục 5 |
| Host file game | **Netlify** (miễn phí, cho phép kho code riêng tư) | Hoặc GitHub Pages nếu chấp nhận kho code công khai |
| Ngôn ngữ | Tiếng Việt | Chỉ tiếng Việt |

**Không dùng:** server, database, đăng nhập, công cụ thống kê bên ngoài.

---

## 3. Thiết bị chính: iPhone

### Cài đặt cho người chơi
1. Mở link game bằng **Safari**.
2. Bấm **Chia sẻ → Thêm vào Màn hình chính**.
3. Mở game từ biểu tượng trên màn hình chính. Game chạy toàn màn hình, **chơi offline được**.

### Game phải tự xử lý
| Tình huống | Cách xử lý |
|---|---|
| Có bản cập nhật mới | Service worker tải ngầm, hiện "Có bản mới – Tải lại" ở màn hình chính của game (không làm gián đoạn ca trị liệu) |
| Âm thanh | Mở khóa âm thanh ở lần chạm đầu tiên ("Chạm để bắt đầu") |
| Tai thỏ, thanh Home | `viewport-fit=cover` + `env(safe-area-inset-*)` |
| Màn hình | Thiết kế **dọc**, đơn vị `dvh`. Chặn phóng to bằng 2 ngón và kéo dãn trang ngoài ý muốn (`touch-action`, `overscroll-behavior`). Game tự có nút phóng to vùng đang làm |
| Rung | iPhone không hỗ trợ rung cho web app, nên dùng hiệu ứng hình và âm thanh thay thế |

### ⚠️ Lưu ý về dữ liệu trên iPhone
- **Chơi thẳng trong Safari** (không cài) thì iPhone có thể **tự xóa dữ liệu** sau khoảng 7 ngày không vào trang. App đã cài lên màn hình chính không bị xóa kiểu này. Vì vậy **bắt buộc cài trước khi chơi**.
- Dữ liệu trong Safari và trong app ở màn hình chính **tách biệt nhau**.
- **Xóa app khỏi màn hình chính = mất save.** Chưa chắc dữ liệu loại này có được iCloud sao lưu hay không, nên phải dựa vào **xuất file save** (mục 5).
- Gọi `navigator.storage.persist()` (nếu iPhone hỗ trợ) để xin giữ dữ liệu bền vững.

---

## 4. Lưu game tại máy

### Một tiệm duy nhất (thay cho đăng nhập)
- Game dùng cho cá nhân: **mỗi máy chỉ có 1 save**, không có hồ sơ, không có đăng nhập.
- Lần đầu mở game: người chơi **đặt tên tiệm spa** rồi bắt đầu Chương 1. Có thể đổi tên tiệm trong Cài đặt.
- **Chơi lại từ đầu:** Cài đặt → Chơi lại từ đầu, xác nhận 2 lần, xóa save hiện tại.

### Khi nào tự lưu
- Sau mỗi mốc quan trọng: phục vụ xong khách, mua đồ, thuê hoặc cho nghỉ nhân viên.
- Cuối mỗi ngày trong game (bắt buộc).
- Khi người chơi rời app (`visibilitychange` → hidden).

### Cấu trúc save
```ts
{
  schemaVersion: number,   // tăng khi đổi cấu trúc save
  gameVersion: string,
  updatedAt: string,
  data: { /* tên tiệm, tiền, đồ, nhân viên, chương, độ thành thạo từng huyệt/cơ... */ }
}
```
- **Hàm chuyển đổi save** theo `schemaVersion` phải có **ngay từ bản đầu tiên**, để khi cập nhật game, save cũ vẫn dùng được.

---

## 5. Xuất/nhập file save (bắt buộc)

**Mục đích:** chuyển sang máy mới, hoặc sao lưu phòng khi xóa app, **mà không phải chơi lại từ đầu**.

### Xuất
- Vào **Cài đặt → Sao lưu dữ liệu → Xuất file**.
- Tạo file `spa-<tên tiệm>-<ngày>.json`. Nội dung:
  ```ts
  {
    app: "spa-game",
    schemaVersion, gameVersion, exportedAt,
    save: { ... toàn bộ save ... }
  }
  ```
- Trên iPhone, mở **bảng Chia sẻ** (`navigator.share` kèm file) để người chơi chọn:
  - **Lưu vào Tệp** (iCloud Drive),
  - gửi qua **Zalo** hoặc **AirDrop** sang máy mới.
- Nếu máy không hỗ trợ chia sẻ file thì tải file xuống bình thường.

### Nhập
- Vào **Cài đặt → Sao lưu dữ liệu → Nhập file**, chọn file `.json` (từ Tệp, Zalo...).
- Game kiểm tra theo thứ tự:
  1. Đúng file của game (`app`).
  2. Đúng cấu trúc save. Nếu không đọc được thì báo file bị hỏng và từ chối nhập.
  3. `schemaVersion`: file cũ thì chuyển đổi lên bản mới. File mới hơn bản game thì báo "Hãy cập nhật game trước".
- Hiện **tóm tắt** trước khi nhập (tên tiệm, chương, ngày trong game, số dư, ngày xuất file).
- Xác nhận thì **ghi đè save đang chơi** trên máy.

### Chỉ có 2 thao tác với save
| Thao tác | Kết quả |
|---|---|
| **Nhập file** | Ghi đè save hiện tại bằng save trong file |
| **Chơi lại từ đầu** | Xóa save hiện tại, đặt tên tiệm mới, bắt đầu từ Chương 1 |

---

## 6. Đưa game lên mạng

- Code đặt trong kho Git riêng tư. **Netlify** tự build (`vite build`) và tự đăng mỗi khi đẩy code lên.
- HTTPS có sẵn. Có thể dùng tên miền phụ miễn phí của Netlify, hoặc gắn tên miền riêng sau.
- Người chơi chỉ cần **1 đường link** để cài. Bản cập nhật tự đến lần mở app sau (mục 3).
- Phát triển: chạy `vite` trên máy, thử trên iPhone thật qua cùng mạng Wi-Fi. Riêng service worker cần HTTPS, nên thử PWA đầy đủ bằng bản xem trước của Netlify.

---

## 7. Đánh đổi và rủi ro

1. **Mất dữ liệu** khi xóa app hoặc mất máy mà chưa xuất file. Người chơi tự chủ động xuất file.
2. **Không có bảng xếp hạng.** Game dùng cho cá nhân.
3. **Có thể sửa file save** để gian lận. Không quan trọng với game cá nhân.
4. **Nâng cấp cấu trúc save:** phải có `schemaVersion` và hàm chuyển đổi ngay từ bản đầu.
5. **Hành vi của Safari** có thể thay đổi theo phiên bản iOS. Cần thử lại trên iPhone thật mỗi lần iOS cập nhật lớn.

---

## 8. Lộ trình

1. **Khung dự án:** Vite + TS + Preact + PWA, đặt tên tiệm, lưu IndexedDB, **xuất/nhập file save**, chơi lại từ đầu. Đăng lên Netlify.
2. **Bản chơi thử Chương 1:** một ngày trong tiệm, ca trị liệu, chấm điểm, tổng kết ngày.
3. **Hoàn thiện Chương 1** rồi lần lượt các chương sau, chế độ Khách tự do.

---

## 9. Việc tiếp theo

- [x] Chốt chủ đề và thiết kế game: [GAME_DESIGN.md](GAME_DESIGN.md), [CHAPTER_1.md](CHAPTER_1.md), [CHAPTERS.md](CHAPTERS.md)
- [x] Chốt nội dung huyệt và cơ: [CONTENT_ACUPOINTS.md](CONTENT_ACUPOINTS.md)
- [x] Danh sách hình vẽ 2D: [ART_ASSETS.md](ART_ASSETS.md)
- [x] Vẽ toàn bộ hình (04/11/2026): thư mục `art/`
- [x] Dựng game hoàn chỉnh (04/11/2026): xem README.md ở thư mục gốc
- [x] Tên game: không cần. Tên tiệm do người chơi đặt, tên miền do chủ dự án tự đặt
