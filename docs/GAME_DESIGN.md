# Thiết kế game – Spa trị liệu (tên tạm)

> Cập nhật: 04/11/2026
> Trạng thái: đã chốt định hướng. Bước tiếp theo là chi tiết cách chơi và từng màn.
> Tài liệu liên quan: [TECH_NOTES.md](TECH_NOTES.md) (công nghệ), [CONTENT_ACUPOINTS.md](CONTENT_ACUPOINTS.md) (dữ liệu huyệt và cơ, đã chốt), [ART_ASSETS.md](ART_ASSETS.md) (hình vẽ).

---

## 1. Ý tưởng

Game quản lý tiệm spa chạy trên trình duyệt. Trọng tâm là **trị liệu cho khách**, đặc biệt là **ấn huyệt trên mặt**, sau đó đến huyệt trên cơ thể và các nhóm cơ cần xả.

**Mục tiêu:** người chơi vừa chơi vừa **ghi nhớ chính xác vị trí huyệt và cơ**. Game dùng cho **cá nhân** tự học.

---

## 2. Quyết định đã chốt

| # | Vấn đề | Quyết định |
|---|---|---|
| 2 | Nguồn kiến thức | Soạn theo **tên Hán Việt + mã quốc tế WHO** (ví dụ Hợp Cốc = LI4). **Đã chốt** (CONTENT_ACUPOINTS.md) |
| 3 | Thao tác | **Ấn huyệt:** chạm đúng điểm trên hình, có vùng sai số cho phép. **Xả cơ và gua sha:** vuốt theo hướng thớ cơ |
| 4 | Đồ họa | **2D**, nhiều góc nhìn (mặt trước, mặt nghiêng, đầu, cổ vai sau lưng, tay, bàn chân) |
| 5 | Tỉ lệ nội dung | **Trị liệu khoảng 70%, quản lý tiệm khoảng 30%** |
| 6 | Cơ chế ghi nhớ | Sổ tay huyệt + gợi ý mờ dần + ôn lại theo chu kỳ (mục 6) |
| 7 | Thiết bị | **iPhone dọc** (web app cài lên màn hình chính), phóng to được vùng đang làm |
| 8 | Cấu trúc màn chơi | **Chơi theo ngày**, mỗi **chương** mở khóa một vùng cơ thể và dịch vụ mới |

---

## 3. Menu dịch vụ

| Dịch vụ | Vùng / nội dung học | Vai trò |
|---|---|---|
| **Ấn huyệt mặt** ⭐ | Huyệt vùng mặt | **Dịch vụ chủ lực** |
| **Xả cơ mặt** ⭐ | Cơ trán, cơ thái dương, cơ cắn, cơ gò má, cơ vòng mắt... | **Dịch vụ chủ lực**, thao tác vuốt |
| Gua sha mặt | Hướng vuốt theo thớ cơ và đường dẫn lưu | Thao tác vuốt, đổi nhịp chơi |
| Gội đầu thường | Các bước gội cơ bản | Ca nhẹ, ít kiến thức (Chương 2) |
| Gội đầu dưỡng sinh | Huyệt da đầu: Bách Hội, Thái Dương, Phong Trì... | Kết hợp gội và ấn huyệt |
| Massage cổ vai gáy | Phong Trì, Kiên Tỉnh; cơ thang, cơ ức đòn chũm | Dịch vụ phổ biến |
| Massage body | Huyệt và cơ vùng lưng | Chỉ hiển thị lưng, vai |
| Massage tay | Hợp Cốc, Nội Quan, Lao Cung | Dịch vụ ngắn, cho người mới |
| Bấm huyệt bàn chân | Dũng Tuyền, Thái Xung; vùng phản xạ | Dịch vụ cao cấp |
| Chăm sóc da mặt cơ bản | Các bước làm sạch, tẩy tế bào chết, đắp mặt nạ | Ca "thư giãn", ít kiến thức |
| Chườm đá nóng / thảo dược | Vị trí đặt đá | Thêm sau, không bắt buộc |

---

## 4. Thao tác trị liệu

### Ấn huyệt (chạm)
- Hình 2D của khách ở góc nhìn phù hợp. Người chơi chạm vào vị trí huyệt được yêu cầu.
- **Vùng sai số:** mỗi huyệt có bán kính cho phép. Bán kính nhỏ dần theo độ khó hoặc mức thành thạo.
- **Chấm điểm theo khoảng cách:** trúng tâm được điểm tối đa, lệch trong vùng cho phép thì được ít điểm hơn, ngoài vùng là sai.
- **Huyệt đối xứng** (có hai bên mặt, ví dụ Thái Dương): yêu cầu rõ ấn bên trái, bên phải hay cả hai.
- Khi sai: hiện vị trí đúng và **mốc giải phẫu để tìm huyệt** (ví dụ "chỗ lõm ở đầu trong lông mày"), để người chơi học cách tìm chứ không chỉ nhớ một chấm trên hình.

### Giữ để ấn (đã chốt: tăng dần theo chương)
Sau khi chạm đúng vị trí, huyệt được **khóa**. Người chơi phải giữ ấn, và yêu cầu tăng dần theo chương:

| Giai đoạn | Yêu cầu | Giao diện |
|---|---|---|
| **Chương 1** | Chỉ **giữ đủ thời gian** | Vòng tròn đếm ngược quanh huyệt. Nhấc ngón sớm thì chưa đạt, phải ấn lại (trừ điểm nhẹ) |
| **Từ chương 2** | **Thời gian + lực** | Thanh lực chia 3 vùng **nhẹ / vừa / mạnh**. **Giữ ngón thì lực tăng, thả ngón thì lực giảm.** Thời gian chỉ được tính khi kim nằm trong vùng lực đúng, cộng dồn đến khi đủ số giây |

- **Lực là mô phỏng:** trình duyệt trên hầu hết điện thoại không đo được lực ngón tay thật, nên không dùng cảm biến lực.
- Sau khi huyệt đã khóa, người chơi giữ/thả ngón **ở bất kỳ đâu trên màn hình**, không cần chạm lại đúng chấm huyệt. Như vậy ngón tay không che mất hình trên điện thoại.
- **Mỗi huyệt có mức lực và số giây riêng**, do người chuyên môn quy định trong dữ liệu (xem CONTENT_ACUPOINTS.md).
- **Phản hồi của khách:**
  - Đúng lực: khách thư giãn 😌.
  - Quá lực: khách nhăn mặt 😣, giảm hài lòng.
  - Thiếu lực: không có tác dụng, thời gian không được tính.
- **Lỗi an toàn:** huyệt nhạy cảm (sát mắt, sát động mạch) mà quá lực thì **phạt nặng**, hiện lời nhắc an toàn.

### Xả cơ / Gua sha (vuốt)
- Người chơi vuốt theo **hướng thớ cơ**, ví dụ cơ trán vuốt từ dưới lên, cơ cắn vuốt theo chiều dọc của cơ.
- Chấm điểm theo: **vuốt đúng cơ**, **đúng hướng** (lệch góc trong phạm vi cho phép) và **đủ độ dài**.

### Còn mở, bàn ở bước sau
- ~~Có bắt buộc đúng thứ tự không?~~ **Đã chốt: chưa cần.** Giai đoạn này chỉ tập trung học thuộc vị trí huyệt và cơ. Người chơi làm các huyệt trong phiếu theo thứ tự tùy ý. Có thể thêm chế độ "liệu trình đúng quy trình" sau.

---

## 5. Một ca trị liệu

### Luồng
```
1. KHÁCH ĐẾN        Thẻ khách: tên, dịch vụ, phiếu liệu trình
       ↓
2. MỜI VÀO PHÒNG    Chọn giường trống (phần quản lý)
       ↓
3. TRỊ LIỆU         Lần lượt làm từng mục trong phiếu, thứ tự tùy ý
       ↓
4. CHẤM ĐIỂM        Vị trí, lực, thời gian, lỗi an toàn → 1–3 sao
       ↓
5. THANH TOÁN       Tiền dịch vụ + tiền tip, cập nhật độ thành thạo
```

### Quyết định đã chốt
| Vấn đề | Quyết định |
|---|---|
| Chạm sai vị trí | **Hiện chỗ đúng kèm mốc giải phẫu, người chơi phải tự chạm lại đúng chỗ** mới đi tiếp. Mục đó bị tính điểm vị trí thấp. Vuốt sai cơ hoặc sai hướng cũng xử lý như vậy (hiện mũi tên đúng, vuốt lại) |
| Áp lực thời gian | **Chương 1 không đếm giờ.** Từ chương 2 có thanh kiên nhẫn, **chỉ ảnh hưởng tiền tip**. Hết kiên nhẫn thì mất tip, **khách không bỏ đi** |
| Phiếu liệu trình | **Ghi thẳng tên huyệt/cơ** cần làm (kèm "2 bên", "trái", "phải" nếu cần). **Sau này** thêm kiểu khách chỉ nói triệu chứng, người chơi tự chọn huyệt (cần phần tác dụng đã được duyệt) |
| Góc nhìn | **Game tự chuyển** sang góc nhìn phù hợp với từng huyệt/cơ. Mặc định **không tự phóng to**: người chơi tự nhận định vị trí; nút phóng to chỉ phóng vào giữa ảnh rồi tự kéo. Bật "Tự phóng to tới vị trí huyệt" trong Cài đặt (trợ giúp) để game tự phóng tới gần huyệt như trước |
| Khuôn mặt khách | Mỗi khách có **khuôn mặt riêng** ở góc nhìn mặt chính diện: nam/nữ, trẻ/già (nếp nhăn theo tuổi), dáng mặt (trái xoan, tròn, vuông, dài, trái tim), vóc (bình thường, mập, ốm, hóp má), mặt to/nhỏ, kiểu tóc và màu tóc riêng, râu/ria cho nam. Huyệt và cơ dịch theo đúng giải phẫu của khuôn mặt đó (src/ui/treatment/faces.ts); bài kiểm tra và Sổ tay vẫn dùng mặt chuẩn |

### Phiếu liệu trình (ví dụ)
Dịch vụ "Ấn huyệt mặt – thư giãn mắt":
```
☐ Toản Trúc     (2 bên)
☐ Ngư Yêu       (2 bên)
☐ Thái Dương    (2 bên)
☐ Tứ Bạch       (2 bên) – ấn nhẹ
☐ Ấn Đường
```
Mỗi mục: chạm vị trí → khóa → giữ đủ thời gian (từ chương 2 thêm đúng lực) → ✓.

### Độ thành thạo và gợi ý
Mỗi huyệt và mỗi cơ có độ thành thạo riêng, quyết định mức gợi ý người chơi thấy:

| Mức | Người chơi thấy gì |
|---|---|
| 0 – Mới gặp | **Thẻ giới thiệu ngắn** trước khi làm (vị trí, mốc giải phẫu), chấm vị trí hiện sẵn |
| 1 | Vùng gợi ý lớn, mờ |
| 2 | Vùng gợi ý nhỏ |
| 3 | Chỉ có tên huyệt |
| 4 – Thành thạo | Chỉ có tên huyệt, vùng sai số hẹp hơn |

Đề xuất (cân bằng lại khi chơi thử): **đúng 3 lần liên tiếp** ở mức hiện tại thì lên 1 mức, **sai 1 lần** thì xuống 1 mức.

### Chấm điểm (đề xuất, cân bằng lại khi chơi thử)
**Điểm mỗi mục (0–100):**
- **Vị trí** theo khoảng cách tới tâm huyệt, với `r` là bán kính sai số:
  - ≤ r/3: **Hoàn hảo**, 100 điểm.
  - ≤ r: **Tốt**, 70 điểm.
  - > r: **Sai**, 0 điểm và phải chạm lại.
- **Chương 1:** điểm mục = điểm vị trí.
- **Từ chương 2:** điểm mục = 60% điểm vị trí + 40% điểm lực. Điểm lực = tỉ lệ thời gian kim nằm trong vùng lực đúng so với tổng thời gian giữ.
- **Vuốt (xả cơ, gua sha):** chấm theo đúng cơ, đúng hướng, đủ độ dài.

**Kết quả cả ca:**
- Trung bình điểm các mục: ≥ 90 được ⭐⭐⭐, ≥ 70 được ⭐⭐, còn lại ⭐.
- **Mỗi lỗi an toàn trừ 30 điểm, và cả ca tối đa chỉ được ⭐.**
- **Tiền** = giá dịch vụ × hệ số theo sao (⭐ 0,6 / ⭐⭐ 0,8 / ⭐⭐⭐ 1,0) + **tip** (theo sao và thanh kiên nhẫn).

### Một ngày trong game
- Khoảng **3–6 khách** mỗi ngày, tăng dần theo chương.
- **Tổng kết cuối ngày:** doanh thu, chi phí, độ chính xác của từng huyệt, và **danh sách huyệt cần ôn**. Những huyệt này sẽ được khách quen yêu cầu ở các ngày sau.

---

## 6. Hệ thống ghi nhớ

1. **Sổ tay huyệt:** mở khóa dần. Mỗi huyệt có tên Hán Việt, mã WHO, hình vị trí, mốc giải phẫu, cách xác định (theo thốn), tác dụng và **lưu ý an toàn**. Mỗi nhóm cơ có hình, hướng thớ và cách xả.
2. **Gợi ý mờ dần:** 5 mức theo độ thành thạo từng huyệt, xem mục 5.
3. **Ôn lại theo chu kỳ:** game theo dõi độ thành thạo từng huyệt. **Khách quen** quay lại yêu cầu những huyệt người chơi hay làm sai hoặc lâu chưa làm.

---

## 7. Quản lý tiệm và kinh tế (khoảng 30%)

> **Chương chỉ áp dụng cho phần trị liệu** (huyệt và cơ nào được học, dịch vụ nào mở). Các hệ thống quản lý dưới đây chạy xuyên suốt game, được **giới thiệu dần** trong những ngày đầu để người chơi không bị ngợp.
> Số liệu cụ thể của từng chương nằm trong file chương, ví dụ [CHAPTER_1.md](CHAPTER_1.md).

### 7.0 Tên tiệm
- Lần đầu mở game, người chơi **tự đặt tên tiệm spa**. Tên hiện trên biển hiệu, hóa đơn và bảng tổng kết.
- Đổi tên được trong Cài đặt.

### 7.1 Một ngày trong tiệm
```
SÁNG – CHUẨN BỊ     Xem dự báo khách, nhập vật tư, sửa/mua/nâng cấp đồ, xếp nhân viên
       ↓
MỞ CỬA              Khách đến theo đợt → chọn khách → chọn giường
                    → tự trị liệu HOẶC giao cho kỹ thuật viên → tính tiền
       ↓
ĐÓNG CỬA            Trả lương, tính tiền điện, khấu hao → bảng tổng kết ngày
       ↓
(mỗi 7 ngày)        Trả tiền thuê mặt bằng
```

### 7.2 Tiền: số dư và lãi/lỗ
- **Số dư** là tiền mặt đang có. Mua hàng và trả chi phí thì trừ vào số dư.
- **Lãi/lỗ trong ngày** = Doanh thu − Chi phí vận hành − Lương nhân viên − Khấu hao. **Có thể âm (lỗ).**
  - **Doanh thu:** tiền dịch vụ + tiền tip, tách riêng phần người chơi làm và phần nhân viên làm.
  - **Chi phí vận hành:** vật tư đã dùng, tiền điện, sửa chữa, đền bù khi xử lý phàn nàn, tiền thuê (ngày đến hạn).
  - **Lương nhân viên:** dòng **riêng**, gồm lương cứng + hoa hồng (mục 7.5). Lương cứng phải trả kể cả ngày ít khách, nên thuê nhiều mà khách ít thì **lỗ**.
  - **Khấu hao:** dòng **riêng**, là phần giá trị đồ dùng bị hao mòn trong ngày. Không trừ vào số dư, nhưng làm giảm lãi, để người chơi thấy kiếm được tiền thật hay không.
- **Tính tiền:** sau mỗi ca hiện **hóa đơn**: giá dịch vụ × hệ số sao + tip − giảm giá (nếu có). Người chơi bấm "Thu tiền".

### 7.3 Chi phí
| Khoản | Cách tính |
|---|---|
| **Thuê mặt bằng** | Trả **mỗi 7 ngày** vào cuối ngày thứ 7. Có thông báo trước 2 ngày |
| **Tiền điện** | Mức cố định mỗi ngày (đèn, điều hòa) + **theo số lần dùng máy** (máy xông mặt...) |
| **Vật tư tiêu hao** | Khăn sạch, dầu massage, sữa rửa mặt, mặt nạ... Mua theo gói. Mỗi dịch vụ dùng một số phần nhất định |
| **Lương nhân viên** | Lương cứng theo trình độ + hoa hồng theo doanh thu nhân viên mang lại. Trả cuối mỗi ngày (mục 7.5) |
| **Khấu hao đồ dùng** | Mỗi lần dùng, đồ mất một phần độ bền, tương đương (giá mua ÷ số lần dùng tối đa) |
| **Sửa chữa** | Đưa độ bền về 100%, giá bằng 30% giá mua |

### 7.4 Đồ dùng: mua, độ bền, nâng cấp
- Mỗi đồ dùng (giường, máy xông, ghế chờ...) có **độ bền %**.
  - Độ bền **dưới 20%**: khách kém thoải mái, dễ phàn nàn hơn.
  - Độ bền **0%**: hỏng, không dùng được đến khi sửa hoặc thay.
- **Nâng cấp:** đồ tốt hơn thì tăng tip, giảm khả năng phàn nàn, bền hơn.
- **Mua thêm:** thêm giường thì phục vụ song song được (cần kỹ thuật viên), thêm ghế chờ thì hàng chờ dài hơn.

### 7.5 Nhân viên

#### Vị trí
| Vị trí | Tác dụng | Mở |
|---|---|---|
| **Kỹ thuật viên (KTV)** | Tự làm dịch vụ cho khách, mỗi KTV cần 1 giường. Chỉ làm được dịch vụ mà **mọi huyệt/cơ trong đó người chơi đã đạt thành thạo mức 3 trở lên** | Chương 1 |
| **Lễ tân** | Khách chờ lâu hơn trước khi bỏ đi, báo trước khi vật tư sắp hết | Chương 2 |
| **Tạp vụ** | Giảm chi phí khăn, giữ phòng sạch, ít phàn nàn hơn | Chương 2 |

Điều kiện "người chơi phải thành thạo" **là cố ý**: muốn tiệm lớn thì người chơi phải học thuộc huyệt.

#### Tuyển dụng: người chơi chủ động
- **Bảng tuyển dụng** có 2–3 ứng viên, làm mới mỗi 3 ngày (hoặc trả phí đăng tin để làm mới ngay).
- Mỗi ứng viên hiện: tên, **trình độ**, lương cứng, % hoa hồng, chất lượng làm việc dự kiến.
- Người chơi **tự quyết định** có thuê hay không, thuê ai, thuê bao nhiêu người. Game chỉ gợi ý, không tự thuê.
- Số nhân viên tối đa bị giới hạn bởi số giường (KTV) và cấp tiệm.

#### Lương: theo trình độ và doanh thu mang lại
**Lương mỗi ngày = Lương cứng (theo trình độ) + Hoa hồng (% doanh thu của các ca nhân viên đó làm).**

| Trình độ KTV | Lương cứng / ngày | Hoa hồng | Chất lượng (sao trung bình) |
|---|---|---|---|
| ★ Tập sự | 100.000đ | 10% | khoảng 1,5 ★ |
| ★★ Thạo việc | 150.000đ | 15% | khoảng 2 ★ |
| ★★★ Lành nghề | 220.000đ | 20% | khoảng 2,5 ★ |

- Nhân viên giỏi thì **mang lại nhiều tiền hơn** (khách hài lòng, nhiều tip, ít phàn nàn) nhưng **lương cao hơn**.
- Ngày nhiều khách: hoa hồng tăng nhưng doanh thu tăng nhiều hơn → **tổng thu nhập tiệm tăng**.
- Ngày ít khách: vẫn phải trả lương cứng → **có thể lỗ**.
- Lương được ghi thành **dòng riêng** trong tổng kết, tách khỏi chi phí vận hành và khấu hao.

#### Lên trình độ
- Nhân viên tích lũy kinh nghiệm theo số ca đã làm. Đủ kinh nghiệm thì **xin lên trình độ**.
- Người chơi chọn:
  - **Đồng ý:** chất lượng tăng, lương theo trình độ mới.
  - **Từ chối:** giữ lương cũ, nhưng nhân viên giảm hài lòng.

#### Hài lòng của nhân viên (0–100)
| Làm giảm | Làm tăng |
|---|---|
| Nợ lương (số dư âm, không trả được) | Trả lương đầy đủ |
| Làm quá nhiều ca trong ngày | Được thưởng (người chơi tự thưởng) |
| Bị từ chối lên trình độ | Được lên trình độ |
| Tiệm nhiều phàn nàn, uy tín thấp | Tiệm có nâng cấp tốt (phòng nghỉ, đồ mới) |

#### Nghỉ việc: 2 chiều
- **Người chơi cho nghỉ:** bất cứ lúc nào, nhưng phải **trả trợ cấp thôi việc** bằng 3 ngày lương cứng. Đây là quyết định có giá, không thuê bừa rồi đuổi.
- **Nhân viên tự xin nghỉ:** khi hài lòng **dưới 20**, hoặc **nợ lương 2 ngày liên tiếp**.
  - Nhân viên báo trước **2 ngày**.
  - Trong 2 ngày đó người chơi có thể **giữ chân** bằng tăng lương hoặc thưởng.
  - Không giữ được thì nhân viên nghỉ, tiệm mất người và giường đó trống.

### 7.6 Khách: hàng chờ, bỏ đi, phàn nàn
- **Hàng chờ:** khách đến ngồi ghế chờ, số ghế có hạn.
- **Kiên nhẫn chờ** tính theo **số ca**, ví dụ "còn chờ được 2 ca". Mỗi ca hoàn thành (của người chơi hoặc KTV) trừ 1. Cách này vẫn đúng khi chương 1 không đếm giờ.
- **Khách bỏ đi khi:**
  - hết kiên nhẫn chờ,
  - hàng chờ đã đầy lúc khách đến,
  - **hết vật tư** cho dịch vụ khách muốn,
  - không có giường dùng được (giường hỏng).
- **Khách đang trị liệu không bao giờ bỏ đi.** Thanh kiên nhẫn trong ca (từ chương 2) chỉ ảnh hưởng tiền tip.
- **Khách phàn nàn khi:**
  - có lỗi an toàn (luôn luôn),
  - ca chỉ được 1 sao,
  - đồ dùng độ bền thấp,
  - chờ gần hết kiên nhẫn.
- **Xử lý phàn nàn** (người chơi chọn):
  - **Xin lỗi + giảm 30%:** mất tiền, uy tín giảm ít.
  - **Chỉ xin lỗi:** không mất tiền, uy tín giảm nhiều hơn.
- Thẻ phàn nàn **luôn ghi rõ lý do** (ví dụ "Chị ấn vào mắt em đau quá"), nên đây cũng là một bài học.

### 7.7 Uy tín tiệm
- Thang 0–5 sao, bắt đầu 3,0.
- Uy tín cao thì nhiều khách hơn mỗi ngày và tip cao hơn.

| Sự kiện | Uy tín |
|---|---|
| Ca 3 sao | +0,05 |
| Ca 1 sao | −0,05 |
| Khách bỏ đi | −0,05 |
| Phàn nàn, chỉ xin lỗi | −0,10 |
| Phàn nàn, xin lỗi + giảm giá | −0,05 |
| Lỗi an toàn | −0,20 (cộng thêm phần phàn nàn) |

### 7.8 Hết tiền
Đây là game học tập nên **không có thua mất hết**:
- Số dư âm thì không mua được gì.
- Đến hạn mà không trả được tiền thuê thì nhận **cảnh báo của chủ nhà**.
- Tuần sau vẫn không trả được thì **tiệm làm lại từ đầu chương** (tiền, đồ, nhân viên về như lúc bắt đầu chương). **Độ thành thạo huyệt và cơ được giữ nguyên.**

### 7.9 Bảng tổng kết ngày
Ví dụ một ngày có 1 KTV:
```
NGÀY 6 – TỔNG KẾT
Khách: phục vụ 6 (bạn 4 · KTV Lan 2) · bỏ đi 1 · phàn nàn 1   Uy tín: 3,1 ★ (−0,05)
──────────────────────────────────────────
Doanh thu        bạn làm 560k   KTV làm 220k   tip 60k     840k
Chi phí vận hành vật tư −150k   điện −45k                 −195k
Lương nhân viên  KTV Lan: cứng −100k  hoa hồng −22k       −122k
Khấu hao         giường −30k   máy xông −8k               −38k
──────────────────────────────────────────
Lãi hôm nay                                               485k
Số dư                                                   3.120k
Tiền thuê đến hạn ngày mai: 700k
──────────────────────────────────────────
Nhân viên: KTV Lan – hài lòng 72 · 18/30 ca để lên Thạo việc
Huyệt hôm nay: Đồng Tử Liêu 4/4 ✓ · Tứ Bạch 2/4 ⚠
Cần ôn: Tứ Bạch, Toản Trúc
```
Ngày ít khách mà vẫn phải trả lương cứng thì dòng "Lãi hôm nay" có thể **âm (lỗ)**, hiện màu đỏ.

---

## 8. Chương (dự kiến; chi tiết từng chương ở file riêng, ví dụ [CHAPTER_1.md](CHAPTER_1.md))

Chi tiết: Chương 1 ở [CHAPTER_1.md](CHAPTER_1.md), Chương 2–8 và chế độ Khách tự do ở [CHAPTERS.md](CHAPTERS.md).

| Chương | Vùng | Dịch vụ mở khóa |
|---|---|---|
| 1 | Mắt, trán (10 huyệt) | Ấn huyệt thư giãn cơ bản, Chăm sóc da mặt, Ấn huyệt mắt chuyên sâu |
| 2 | Má, mũi, miệng, hàm, tai (12 huyệt) | Gội đầu thường, Ấn huyệt mặt toàn diện |
| 3 | Cơ mặt (12 cơ) | Xả cơ mặt, Gua sha mặt |
| 4 | Đầu, da đầu (7 huyệt) | Gội đầu dưỡng sinh |
| 5 | Cổ, vai (2 huyệt + 4 cơ) | Massage cổ vai gáy (+ hồ sơ khách, chống chỉ định) |
| 6 | Tay (4 huyệt) | Massage tay |
| 7 | Lưng (8 huyệt) | Massage body, Chườm đá nóng |
| 8 | Cẳng chân, bàn chân (5 huyệt) | Bấm huyệt chân |
| ⭐ | Toàn bộ | Khách tự do: ôn tập theo lịch lặp lại ngắt quãng |

---

## 9. Nội dung và độ chính xác

- Dữ liệu huyệt và cơ lưu thành file dữ liệu (JSON), không viết cứng trong code. Nội dung đã chốt, xem CONTENT_ACUPOINTS.md.
- **Tọa độ huyệt, ranh giới cơ, vùng cấm** được tạo cùng lúc với hình vẽ (xem ART_ASSETS.md) và lưu thành dữ liệu.
- Mỗi huyệt có ghi chú **chống chỉ định / lưu ý an toàn** (ví dụ phụ nữ mang thai).
---

## 10. Việc tiếp theo

- [x] Duyệt [CONTENT_ACUPOINTS.md](CONTENT_ACUPOINTS.md) (04/11/2026), đã điền đủ lực, thời gian, hướng vuốt, tác dụng, phản xạ bàn chân
- [x] Một ca trị liệu: luồng, xử lý chạm sai, thời gian, phiếu, góc nhìn (mục 5)
- [ ] Cân bằng con số chấm điểm, tiền, độ thành thạo khi có bản chơi thử
- [x] Hệ thống quản lý và kinh tế dùng chung (mục 7)
- [x] Duyệt [CHAPTER_1.md](CHAPTER_1.md) (04/11/2026)
- [x] Thiết kế Chương 2–8 và Khách tự do ([CHAPTERS.md](CHAPTERS.md))
- [x] Duyệt [CHAPTERS.md](CHAPTERS.md) (04/11/2026)
- [x] Chốt thao tác "giữ để ấn": tăng dần theo chương (mục 4)
- [x] Chốt thao tác "đúng thứ tự": chưa cần, làm theo thứ tự tùy ý
- [ ] Đặt tên game

---

## 11. Cập nhật 04/11/2026: đồng hồ trong ngày, lễ tân/tạp vụ, thời gian làm khách, combo, uy tín

> Các quyết định dưới đây **thay thế** phần tương ứng ở mục 5 và 7 (hàng chờ tính theo "ca", KTV làm xong ngay lập tức, mức trừ uy tín cũ).

### 11.1 Đồng hồ trong ngày
- Tiệm mở **9:00–19:00** (600 phút trò chơi). Khách đến theo giờ, khách cuối cùng đến trước 17:30.
- **Đồng hồ chạy theo hành động, không theo thời gian thật:**

| Hành động | Thời gian trò chơi |
|---|---|
| Người chơi tự làm 1 ca | Bằng **thời lượng dịch vụ** (dù ngoài đời làm nhanh hay chậm) |
| Đón khách (khi chưa có lễ tân) | 5 phút |
| Dọn giường sau ca (khi chưa có tạp vụ) | 10 phút |
| Nút **"Chờ"** | Tua đến sự kiện kế tiếp: khách đến, KTV làm xong, tạp vụ dọn xong |

- Người chơi vẫn học thong thả: thời gian thật khi ấn huyệt không làm đồng hồ chạy (riêng thanh kiên nhẫn trong ca chỉ ảnh hưởng tip, như cũ).
- Có thể **đóng cửa sớm** khi không còn khách.

### 11.2 Thời lượng và giá dịch vụ
Giá tỉ lệ với thời gian, khoảng 3.300–4.400đ/phút; dịch vụ cần kỹ năng cao có giá mỗi phút cao hơn. Con số cuối cùng do mô phỏng cân bằng chốt.

| Dịch vụ | Phút (đề xuất) | Giá |
|---|---|---|
| Gội đầu thường | 25 | 60k |
| Ấn huyệt thư giãn – cơ bản | 30 | 100k |
| Massage tay | 30 | 100k |
| Chăm sóc da mặt cơ bản | 40 | 120k |
| Ấn huyệt mắt chuyên sâu | 45 | 180k |
| Gua sha mặt | 45 | 180k |
| Gội đầu dưỡng sinh | 45 | 150k |
| Xả cơ mặt | 50 | 200k |
| Massage cổ vai gáy | 50 | 200k |
| Massage phản xạ bàn chân | 50 | 220k |
| Ấn huyệt mặt toàn diện | 60 | 220k |
| Chườm đá nóng | 60 | 250k |
| Bấm huyệt chân | 60 | 250k |
| Massage body | 75 | 300k |

### 11.3 Lễ tân và tạp vụ: người chơi tự làm nếu chưa thuê
- **Lễ tân:** khách đến phải được **đón** (check-in) trước khi phục vụ. Chưa đón thì khách mất kiên nhẫn nhanh gấp 1,5 lần. Có lễ tân: tự đón ngay, khách chờ lâu hơn thêm 20 phút.
- **Tạp vụ:** sau mỗi ca, giường chuyển sang **"cần dọn"**, chưa dọn thì không phục vụ được. Có tạp vụ: tự dọn (mất 10 phút của tạp vụ, không tốn thời gian người chơi), ít phàn nàn hơn.
- Lễ tân và tạp vụ **mở tuyển cùng lúc với KTV** (Chương 1, ngày 5), người chơi tự quyết có thuê hay không.
- Kiên nhẫn chờ của khách tính theo **phút** (mặc định 60 phút, đã chỉnh từ 45 sau mô phỏng) thay cho "số ca".

### 11.4 KTV làm khách có thời gian
- KTV phục vụ mất thời gian = thời lượng dịch vụ × hệ số bậc: **Tập sự 1,2 · Thạo việc 1,0 · Lành nghề 0,9**.
- Trong lúc đó giường bận. Xong ca thì giường cần dọn (người chơi hoặc tạp vụ).
- Nhờ vậy **giường thêm = phục vụ song song thật**.

### 11.5 Combo
- Khách có thể gọi **combo** người chơi đã tạo: phiếu gồm phần việc của từng dịch vụ trong combo (mỗi dịch vụ ít mục hơn khi làm lẻ).
- **Trả tiền theo giá combo** (× hệ số sao + tip). Vật tư và đồ dùng cần = tổng các dịch vụ. Thời lượng = 90% tổng thời lượng.
- Giá combo người chơi đặt trong khoảng 70–100% tổng giá lẻ. Combo càng rẻ so với giá lẻ thì càng nhiều khách gọi.

### 11.6 Uy tín (giảm mức trừ)
| Sự kiện | Cũ | Mới (đề xuất, mô phỏng chốt) |
|---|---|---|
| Ca 3 sao | +0,05 | +0,03 |
| Ca 1 sao | −0,05 | −0,02 |
| Khách bỏ đi | −0,05 | −0,02 |
| Phàn nàn, chỉ xin lỗi | −0,10 | −0,04 |
| Phàn nàn, xin lỗi + giảm giá | −0,05 | −0,02 |
| Lỗi an toàn | −0,20 | −0,06 |
| Ngày không có phàn nàn, uy tín dưới 3,0 | – | **+0,02 (tự hồi)** |

### 11.7 Mở rộng mặt bằng
Mua mở rộng được **tặng sẵn 2 ghế chờ** (đặt vào chỗ chair-3, chair-4).

### 11.8 Số liệu sau mô phỏng cân bằng (04/11/2026, thay các số đề xuất ở trên)
- **Kiên nhẫn chờ:** 90 phút (lễ tân +20). Khách chưa được đón mất kiên nhẫn ×1,5.
- **Uy tín tự hồi:** mỗi tối, nếu dưới 3★ thì tăng max(0,02; 8% khoảng cách tới 3★). Ngày có phàn nàn thì hồi một nửa.
- **Giá đã chỉnh:** Gội đầu thường 80k, Chăm sóc da mặt 130k, Gội đầu dưỡng sinh 170k, Ấn huyệt mặt toàn diện 240k (mọi dịch vụ ≥ 3.200đ/phút).
- **Lương:** Lễ tân 70k / 90k / 110k mỗi ngày. Tạp vụ 50k / 65k / 80k mỗi ngày.
- **Chi phí đầu tư:** Mở rộng mặt bằng 5,5 triệu (hoàn vốn ~18 ngày), Phòng VIP 4,5 triệu (~26 ngày), Quảng cáo 120k/ngày.
- **KTV tự nhận khách:** trong lúc người chơi đang làm ca, KTV rảnh tự đón và nhận khách đang chờ mà họ làm được (tối đa 6 khách/ngày), có thông báo.
- **Giám khảo anh Khôi** đến vào lúc tiệm vắng nhất trong ngày.

---

## 12. Nhiều cấp mở rộng và nhiều cấp thiết bị (04/11/2026)

> Mục tiêu: cuối game vẫn có chỗ đầu tư. Đầu tư càng cao thì **khách trả càng nhiều**, nhưng **tiền thuê và chi phí sửa chữa cũng càng cao**. Con số dưới đây là đề xuất, mô phỏng cân bằng sẽ chốt.

### 12.1 Cấp mặt bằng
| Cấp | Mở từ | Chi phí | Tiền thuê/tuần | Giường tối đa | Ghế chờ tặng | Khách |
|---|---|---|---|---|---|---|
| 0 – Tiệm nhỏ | đầu game | – | 700k | 2 | 2 (có sẵn) | – |
| 1 – Mở rộng | Chương 5 | 5,5 triệu | 1,2 triệu | 4 | +2 | + khách |
| 2 – Thêm phòng trị liệu thứ 2 | Chương 6 | khoảng 12 triệu | khoảng 1,8 triệu | 6 | +2 | + khách, khách sang hơn (giá +5%) |
| 3 – Tiệm cao cấp | Chương 8 | khoảng 25 triệu | khoảng 2,6 triệu | 8 | +2 | + khách, giá +10% |

- Cấp 2 và 3 dùng lại hình phòng trị liệu có sẵn làm **phòng thứ 2** (chuyển phòng bằng tab).
- Không thể hạ cấp mặt bằng.

### 12.2 Cấp thiết bị
Mỗi thiết bị (giường, máy xông, ghế gội, bộ gua sha, bình nước nóng, đá nóng, ghế ngâm chân, ghế chờ, đèn tinh dầu) có **3 cấp: Thường → Tốt → Cao cấp**.

| | Thường | Tốt | Cao cấp |
|---|---|---|---|
| Nâng cấp | – | khoảng 60% giá gốc | khoảng 120% giá gốc |
| **Khách trả thêm** (dịch vụ dùng thiết bị đó) | – | +8% giá | +18% giá |
| Tip | – | +5% | +10% |
| Phàn nàn do đồ cũ | bình thường | giảm | giảm nhiều |
| Độ bền (số lần dùng) | gốc | ×1,2 | ×1,4 |
| **Chi phí sửa** | 30% giá trị cấp hiện tại | **đắt hơn** | **đắt nhất** |
| Tiền điện (máy) | gốc | ×1,1 | ×1,2 |

- "Giá trị cấp hiện tại" = giá gốc + tổng tiền đã nâng cấp. Nên thiết bị cao cấp **hư thì sửa đắt hơn**.
- **Nệm êm (E04)** trước đây trở thành **giường cấp Tốt**.
- Thiết bị cấp cao hiện **huy hiệu cấp** (1–2 ngôi sao vàng) trên hình. Giường cấp Tốt dùng hình giường nệm êm có sẵn.
- Một dịch vụ dùng nhiều thiết bị thì giá được cộng theo **giường + thiết bị chính** của dịch vụ.

### 12.3 Số liệu sau mô phỏng cân bằng (thay các số đề xuất ở 12.1, 12.2)
| Cấp mặt bằng | Mở | Chi phí | Thuê/tuần | Giường tối đa | Ghế chờ | Thêm khách/ngày | Giá |
|---|---|---|---|---|---|---|---|
| 0 | đầu game | – | 700k | 2 | 4 chỗ | – | – |
| 1 | Chương 5 | 5,5 triệu | 1,2 triệu | 4 | 6 chỗ (+2 tặng) | +1–2 | – |
| 2 | Chương 6 | 12 triệu | 2,2 triệu | 6 | 8 chỗ (+2 tặng) | +2–3 | +5% |
| 3 | Chương 8 | 25 triệu | 3,4 triệu | 8 | 10 chỗ (+2 tặng) | +3–5 | +10% |

| Cấp thiết bị | Chi phí nâng | Khách trả thêm | Tip | Phàn nàn | Độ bền | Điện | Ghế chờ |
|---|---|---|---|---|---|---|---|
| Tốt | 0,8 × giá nâng cấp | +6% | +4% | −0,05 | ×1,2 | ×1,1 | khách chờ thêm 3 phút |
| Cao cấp | 1,2 × giá nâng cấp | +15% | +8% | −0,10 | ×1,4 | ×1,2 | khách chờ thêm 6 phút |

- **Giá nâng cấp riêng:** máy xông 500k, ghế gội 900k, gua sha 800k, bình nước nóng 700k, đá nóng 1 triệu, ghế ngâm chân 2,5 triệu. Giường, ghế chờ, đèn tinh dầu dùng giá mua.
- **Ví dụ giường Cao cấp:** giá trị 4,5 triệu, sửa 1,35 triệu (giường Thường: 450k).
- **Phòng VIP không có cấp**, vì đã là phòng cao cấp (khách VIP trả ×1,5).
- Phần trả thêm cộng theo cấp của **giường + thiết bị chính tốt nhất** của dịch vụ, áp dụng cả khi KTV làm.
- Nâng cấp **giữ nguyên % hao mòn**, không dùng để sửa rẻ được.
- **Kết quả mô phỏng:** người chơi trung bình kết thúc khoảng 32 triệu (trước đây 55 triệu). Nâng cấp giường hoàn vốn 3–5 tuần, mặt bằng cấp 2 khoảng 16–28 ngày, cấp 3 khoảng 46 ngày.
