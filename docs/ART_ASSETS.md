# Danh sách hình vẽ 2D

> Cập nhật: 04/11/2026
> Liên quan: [GAME_DESIGN.md](GAME_DESIGN.md), [CHAPTERS.md](CHAPTERS.md), [CONTENT_ACUPOINTS.md](CONTENT_ACUPOINTS.md)

---

## 0. Nguồn hình (đã chốt)

| Loại hình | Nguồn | Ghi chú |
|---|---|---|
| **Hình trị liệu V01–V15** | **AI tự vẽ bằng code (SVG)** | Tọa độ huyệt, ranh giới cơ, vùng cấm tính luôn từ mốc giải phẫu khi vẽ. |
| **Nhân vật** (khách, anh Khôi, nhân viên) | **AI tự vẽ bằng code (SVG)**, ghép bộ phận: khuôn mặt, tóc, màu da, áo, nét mặt | Cùng phong cách với hình trị liệu. Ghép bộ phận nên tạo được nhiều khách khác nhau |
| **Tiệm, đồ dùng, vật tư** | **AI tự vẽ bằng code (SVG)** | Phong cách phẳng, đơn giản |
| **Biểu tượng giao diện** | Bộ icon miễn phí **Lucide** (giấy phép ISC, dùng tự do) | Không cần vẽ |
| **Tài liệu tham khảo khi vẽ cơ** | Gray's Anatomy (phạm vi công cộng), OpenStax Anatomy & Physiology (CC BY 4.0) | Chỉ để đối chiếu hình dạng và vị trí cơ, không đưa vào game |

**Giới hạn cần biết:**
- Hình do AI vẽ bằng code sẽ **đơn giản, phẳng**, không đẹp bằng họa sĩ vẽ. Xem mẫu để đánh giá.
- Tọa độ huyệt tính theo **tỉ lệ giải phẫu chuẩn** (thốn, mốc xương) trên hình đã vẽ. Sau khi vẽ mỗi góc nhìn, cần chạy thử trên iPhone để kiểm tra lại.
- Sau này muốn thay bằng hình đẹp hơn (thuê vẽ hoặc tạo bằng công cụ AI tạo ảnh), thì phải tính lại tọa độ cho hình mới.

---

## 0b. Phong cách chung (đã chốt)

| Thành phần | Cách vẽ |
|---|---|
| **Nét và màu** | Nét viền **nâu ấm** (không dùng đen), bo tròn. Bảng màu pastel "spa thư giãn": kem, xanh xô thơm, hồng đất, gỗ sáng, xanh nước nhạt. Dùng chung cho mọi hình, kể cả hình trị liệu |
| **Cửa tiệm** | **Nhìn ngang dạng mặt cắt** (như nhìn vào sân khấu), hợp với màn hình iPhone dọc. Biển hiệu hiện **tên tiệm người chơi đặt** (chữ thật, không vẽ chết). Mua đồ hoặc nâng cấp thì đồ trong cảnh thay đổi theo |
| **Nhân vật** | **Chân dung bán thân**, mặt đơn giản (mắt chấm, má hồng), dựng theo **cùng cấu trúc khuôn mặt** với hình trị liệu V01. **Ghép bộ phận**: dáng mặt, kiểu tóc, màu da, áo, nét mặt |
| **Vai trò qua màu áo** | Anh Khôi: đồng phục **xanh đậm**, kính, bảng tên. KTV: **xanh nhạt**. Lễ tân và tạp vụ: đổi màu áo, tạp vụ có tạp dề. Khách: quần áo thường nhiều màu |
| **Nét mặt** | Thư giãn, bình thường, vui, khó chịu, đau (quá lực), mệt (nhân viên hài lòng thấp) |
| **Đồ dùng** | Vẽ phẳng, nhìn ngang hoặc chính diện. Đồ hỏng hiện bằng biểu tượng cảnh báo đặt lên, không vẽ riêng |
| **Vật tư** | Biểu tượng vuông khoảng 64–96px, hình bao bì đơn giản (chai, tuýp, gói, khăn xếp chồng) |
| **Chuyển động** | Hoạt ảnh nhẹ bằng CSS: nhân vật chớp mắt, hơi nước bốc lên, đèn sáng, khách nhún khi vui |

## 1. Nguyên tắc chung

| Vấn đề | Quyết định |
|---|---|
| **Phong cách** | Phẳng, nét mềm, màu pastel trang nhã. **Tỉ lệ cơ thể thật**, không vẽ kiểu chibi (đầu to, mắt to), vì vị trí huyệt dựa trên tỉ lệ giải phẫu |
| **Định dạng** | **SVG** cho hình trị liệu (nét vẫn sắc khi phóng to). Ảnh nền tiệm và chân dung có thể dùng **WebP** |
| **Khung hình** | Thiết kế cho **iPhone dọc**. Hình trị liệu vẽ trên khung **1000 × 1400** đơn vị SVG |
| **Mô hình khách** | **1 mô hình cơ thể chuẩn cho mỗi góc nhìn** (nữ, trưởng thành). Tọa độ huyệt chỉ cần đặt **1 lần** cho mỗi hình |
| **Khách khác nhau** | Chỉ khác **màu da, kiểu tóc, phụ kiện** (lớp phủ lên mô hình chuẩn). Không đổi hình dáng, nên tọa độ huyệt vẫn đúng |
| **Hình đối xứng** | Góc nghiêng chỉ vẽ **1 bên**, bên kia lật ngược bằng code |

### Các lớp trong mỗi hình trị liệu (SVG có nhóm riêng, bật/tắt bằng code)
| Lớp | Nội dung | Khi nào hiện |
|---|---|---|
| `base` | Cơ thể khách | Luôn hiện |
| `skin`, `hair` | Màu da, tóc của từng khách | Luôn hiện |
| `landmarks` | Mốc giải phẫu: bờ xương hốc mắt, xương gò má, góc hàm, mỏm gai đốt sống, mắt cá... (nét mờ) | Mức gợi ý thấp |
| `muscles` | Hình các cơ (bán trong suốt) | Chương 3, 5 và sổ tay |
| `guides` | Đường "thẳng đồng tử", đường giữa cơ thể, thước thốn | Mức gợi ý thấp |
| `state` | Biến thể: mắt nhắm/mở, miệng ngậm/cắn/há, nét mặt | Theo tình huống |

> **Vị trí huyệt, ranh giới cơ, vùng cấm KHÔNG vẽ cố định trong hình.** Chúng được tính từ các mốc giải phẫu **ngay khi tạo hình** và lưu thành dữ liệu (JSON). Không cần công cụ Editor.

---

## 2. Hình trị liệu (quan trọng nhất)

| Mã | Góc nhìn | Huyệt / cơ dùng | Biến thể cần vẽ | Cần từ |
|---|---|---|---|---|
| **V01** | **Mặt chính diện** (từ đỉnh đầu đến cằm, có tai) | 20 huyệt mặt (trừ Thính Cung, Ế Phong), Thần Đình, Đầu Duy; 12 cơ mặt | Mắt mở / mắt nhắm; miệng ngậm / cắn chặt răng / há miệng; nét mặt thư giãn / bình thường / nhăn đau | **Chương 1** |
| **V02** | **Mặt nghiêng** (1 bên, lật cho bên kia) | Thái Dương, Hạ Quan, Thính Cung, Ế Phong, Giáp Xa, Đại Nghinh, Đồng Tử Liêu; cơ thái dương, cơ cắn | Miệng ngậm / há (Hạ Quan, Thính Cung); có tai rõ | Chương 1 (Thái Dương), chủ yếu Chương 2 |
| **V03** | **Đỉnh đầu** (nhìn từ trên) | Bách Hội, Tứ Thần Thông, Thần Đình, Đầu Duy | Đường chân tóc, đường nối 2 đỉnh tai | Chương 4 |
| **V04** | **Sau đầu và gáy** | Phong Phủ, Phong Trì, Thiên Trụ, Đại Chùy | Tóc buộc gọn để thấy chân tóc gáy, ụ chẩm ngoài | Chương 4 |
| **V05** | **Cổ trước và nghiêng** | Cơ ức đòn chũm, cơ bám da cổ | Vị trí động mạch cảnh (cho vùng cấm) | Chương 5 |
| **V06** | **Lưng (nằm sấp)**, từ gáy đến hông | Kiên Tỉnh, Đại Trữ, Phong Môn, Phế Du, Cách Du, Can Du, Tỳ Du, Thận Du, Mệnh Môn; cơ thang, cơ nâng vai | Lớp cột sống có mỏm gai C7–L5, xương bả vai, mào chậu | Chương 5, 7 |
| **V07** | **Mu bàn tay** | Hợp Cốc | Thấy rõ xương bàn tay 1–2 | Chương 6 |
| **V08** | **Lòng bàn tay và cổ tay mặt trong** | Lao Cung, Nội Quan, Thần Môn | Nếp gấp cổ tay, 2 gân cổ tay | Chương 6 |
| **V09** | **Cẳng chân mặt trước** | Túc Tam Lý | Xương bánh chè, mào xương chày | Chương 8 |
| **V10** | **Cẳng chân mặt trong** | Tam Âm Giao, Thái Khê | Mắt cá trong, bờ xương chày, gân gót | Chương 8 |
| **V11** | **Mu bàn chân** | Thái Xung | Xương bàn chân 1–2 | Chương 8 |
| **V12** | **Lòng bàn chân** | Dũng Tuyền, 15 vùng phản xạ | Các ngón, ụ bàn chân, vòm, gót | Chương 8 |

**Tổng:** 12 góc nhìn. Đã đối chiếu: mọi huyệt và cơ trong CONTENT_ACUPOINTS.md đều có góc nhìn để làm.

### Hình phụ cho các dịch vụ không phải ấn huyệt
| Mã | Hình | Dùng cho | Cần từ |
|---|---|---|---|
| V13 | Mặt đắp mặt nạ, mặt có bọt rửa mặt (lớp phủ lên V01) | Chăm sóc da mặt | Chương 1 |
| V14 | Đầu ngả trên ghế gội, tóc ướt và có bọt (lớp phủ lên V03/V04) | Gội đầu thường, gội dưỡng sinh | Chương 2 |
| V15 | Đá nóng đặt trên lưng (lớp phủ lên V06) | Chườm đá nóng | Chương 7 |

---

## 3. Nhân vật

| Mã | Hình | Số lượng | Biến thể | Cần từ |
|---|---|---|---|---|
| C01 | **Chân dung khách** (thẻ khách) | 12 khách thường + 4 khách quen | Bình thường / vui / khó chịu | Chương 1 (bắt đầu với 4) |
| C02 | **Khách đặc biệt**: khách mang thai, khách VIP, khách đoàn văn phòng | 3 | Như trên | Chương 3–5 |
| C03 | **Anh Khôi**, trưởng KTV | 1 | Bình thường / khen / nhận xét | Chương 1 |
| C04 | **KTV** (ứng viên tuyển dụng) | 6 | Bình thường / vui / mệt (hài lòng thấp) | Chương 1 |
| C05 | **Lễ tân**, **Tạp vụ** | 2 + 2 | Như C04 | Chương 2 |

---

## 4. Tiệm spa

| Mã | Hình | Biến thể | Cần từ |
|---|---|---|---|
| S01 | **Sảnh tiệm** (nhìn từ trước): quầy, ghế chờ, cửa, biển hiệu (để chèn tên tiệm do người chơi đặt) | Có tiệm cơ bản và tiệm mở rộng (Chương 5) | Chương 1 |
| S02 | **Phòng trị liệu**: giường, kệ đồ | Giường cơ bản / có nệm êm; đèn & tinh dầu bật/tắt | Chương 1 |
| S03 | Phòng VIP | | Chương 3 |
| S04 | Khu gội đầu: ghế gội | | Chương 2 |
| S05 | Khu ngâm chân: ghế ngâm chân | | Chương 8 |

### Đồ dùng (đặt vào cảnh, có độ bền)
| Mã | Đồ | Cần từ |
|---|---|---|
| E01 | Giường spa cơ bản | Chương 1 |
| E02 | Ghế chờ | Chương 1 |
| E03 | Máy xông mặt | Chương 1 |
| E04 | Nệm giường êm (nâng cấp) | Chương 1 |
| E05 | Đèn & tinh dầu thơm phòng (nâng cấp) | Chương 1 |
| E06 | Ghế gội đầu | Chương 2 |
| E07 | Bộ đá gua sha | Chương 3 |
| E08 | Bình nước nóng | Chương 4 |
| E09 | Đá nóng + máy hâm đá | Chương 7 |
| E10 | Ghế ngâm chân | Chương 8 |

Đồ hỏng hoặc độ bền thấp **không cần vẽ riêng**: hiện bằng biểu tượng cảnh báo đặt lên hình.

---

## 5. Vật tư (biểu tượng)

| Mã | Vật tư | Cần từ |
|---|---|---|
| I01 | Khăn sạch | Chương 1 |
| I02 | Dầu massage thường | Chương 1 |
| I03 | Dầu massage cao cấp | Chương 3 |
| I04 | Sữa rửa mặt | Chương 1 |
| I05 | Tẩy tế bào chết | Chương 1 |
| I06 | Mặt nạ giấy | Chương 1 |
| I07 | Dầu gội | Chương 2 |
| I08 | Dầu xả | Chương 2 |

---

## 6. Giao diện

| Mã | Hình | Cần từ |
|---|---|---|
| U01 | Biểu tượng: tiền, uy tín (sao), kiên nhẫn, đồng hồ, độ bền, hài lòng nhân viên | Chương 1 |
| U02 | Biểu tượng: sổ tay, cài đặt, cửa hàng, nhân viên, tổng kết, xuất/nhập file | Chương 1 |
| U03 | Biểu tượng trạng thái: đúng ✓, sai ✗, Hoàn hảo, lỗi an toàn ⚠, phàn nàn | Chương 1 |
| U04 | **Hiệu ứng ấn:** vòng tròn đếm giờ quanh ngón tay, gợn sóng khi chạm | Chương 1 |
| U05 | **Vùng gợi ý:** chấm vị trí, vùng mờ lớn, vùng mờ nhỏ | Chương 1 |
| U06 | **Thanh lực** 3 vùng nhẹ / vừa / mạnh + kim | Chương 2 |
| U07 | **Hiệu ứng vuốt:** vệt vuốt, mũi tên hướng đúng | Chương 3 |
| U08 | Con trỏ đá gua sha (thay ngón tay khi làm gua sha) | Chương 3 |
| U09 | Thẻ khách, phiếu liệu trình, hóa đơn, bảng tổng kết ngày (khung nền) | Chương 1 |
| U10 | Huy hiệu qua chương, danh hiệu "Kỹ thuật viên trị liệu" | Chương 1 / 8 |

---

## 7. Biểu tượng app và màn hình cài đặt

| Mã | Hình | Kích thước |
|---|---|---|
| A01 | Biểu tượng app (màn hình chính iPhone) | 180 × 180 (apple-touch-icon), 192 × 192, 512 × 512 |
| A02 | Hình minh họa hướng dẫn "Chia sẻ → Thêm vào Màn hình chính" | 2–3 hình |

---

## 8. Thứ tự ưu tiên

### Đợt 1: đủ cho bản chơi thử Chương 1
- **Hình trị liệu:** V01 (mặt chính diện + biến thể mắt, nét mặt), V02 (mặt nghiêng, để làm Thái Dương), V13.
- **Nhân vật:** C01 (4 khách), C03 (anh Khôi), C04 (2 KTV).
- **Tiệm:** S01, S02, E01–E05.
- **Vật tư:** I01, I02, I04–I06.
- **Giao diện:** U01–U05, U09.
- **App:** A01, A02.

### Đợt 2 trở đi
Vẽ theo chương, dựa vào cột "Cần từ" của từng bảng.

---

## 9. Thư mục và quy ước kỹ thuật

```
art/
├─ views/        Hình trị liệu V01–V12 (.svg + .json tọa độ), lớp phủ V13–V15 (.svg)
├─ characters/   Hệ thống ghép bộ phận: parts/, characters.json, build.mjs → out/
├─ shop/         Cảnh tiệm S01–S05 (.svg + .slots.json vị trí đặt đồ)
├─ equipment/    Đồ dùng E01–E10, biểu tượng cảnh báo độ bền
├─ items/        Biểu tượng vật tư I01–I08
├─ app/          Biểu tượng app (svg + png 180/192/512), hình hướng dẫn cài
├─ ui/           Huy hiệu chương, danh hiệu
└─ _src/         Script tạo hình (sửa script rồi chạy lại)
```

**Hình trị liệu:**
- Khung chung `viewBox 0 0 1000 1400`. Chia lớp bằng nhóm SVG: `base`, `skin-detail`, `hair`, `features`, `landmarks`, `muscles`, `guides`, các nhóm biến thể (`state-…`, `expr-…`). Game bật/tắt từng lớp theo mức gợi ý.
- Màu da và tóc dùng biến CSS (`--skin`, `--skin-shade`, `--hair`), nên mỗi khách tô màu khác mà vẫn dùng chung hình.
- **Không vẽ chấm huyệt vào hình.** Huyệt, cơ, vùng cấm, vùng phản xạ nằm trong file `.json` cùng tên.
- **Tọa độ chuẩn hóa 0–1:** x = svgX / 1000, y = svgY / 1400.
- **Bán kính sai số** `r` chia theo chiều rộng khung.
- **Quy ước bên trái/phải (thống nhất):** `"left"`/`"right"` trong JSON luôn là **bên trái/phải của khách**, không phải bên màn hình. Trường `screenLeftIs` cho biết bên trái màn hình ứng với bên nào của khách.
- Hình mặt nghiêng (V02) và tay, chân (V07–V12) chỉ vẽ 1 bên (`"mirrorable": true`). Game lật ngang hình, đổi x thành 1 − x và đổi nhãn bên để có bên còn lại.
- Vùng cấm có thể là hình elip, hình tròn hoặc **đa giác** (động mạch cảnh ở V05).
- Script tạo hình nằm trong `art/_src/` (xem README trong đó).

---

## 10. Hình theo cấp (04/11/2026)
- **Thiết bị:** mỗi thiết bị có 3 hình: `<ID>.svg` (Thường), `<ID>-t2.svg` (Tốt), `<ID>-t3.svg` (Cao cấp). Áp dụng cho E01, E02, E03, E05, E06, E07, E08, E09, E10. Các hình cùng khung và chỗ đặt nên thay nhau được. Phòng VIP không có cấp.
- **Sảnh theo cấp mặt bằng:** S01 (cấp 0), S01-expanded (cấp 1), S01-L2 (cấp 2), S01-L3 (cấp 3).
- **Phòng trị liệu 1:** S02 (cấp 0), S02-L1, S02-L2, S02-L3. Các phiên bản có chỗ đặt đồ y hệt nhau.
- **Phòng trị liệu 2:** S06 (cấp 2), S06-L3 (cấp 3), giường 5–8.
- **Khu gội đầu:** S04 (cấp 0–1), S04-L2, S04-L3. **Khu ngâm chân:** S05 (cấp 0–1), S05-L2, S05-L3. Hiện thành tab khi đã có ghế gội / ghế ngâm chân.
- **Kệ vật tư:** hiện theo tồn kho (đầy: 3 món, vừa: 2, sắp hết: 1 + dấu "!", hết: trống).
- Cảnh tạo bằng `art/_src/shop/build-scenes.mjs`. Hình thiết bị theo cấp được vẽ tay.
