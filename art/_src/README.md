# Script tạo hình

Các script dùng để tạo ra hình trong `art/`. Muốn sửa hình thì **sửa script rồi chạy lại**, không sửa tay file SVG/JSON (sẽ bị ghi đè lần tạo sau).

| Thư mục | Tạo ra | Chạy |
|---|---|---|
| `v01/` | V01.svg, V01.json, V13.svg | `python3 gen.py` |
| `v02-v04/` | V02–V04 (.svg + .json), V14.svg | `gen_v02.py`, `gen_v03.py`, `gen_v04.py`, rồi `gen_v14.py` |
| `v05-v06/` | V05, V06 (.svg + .json), V15.svg | `gen_v05.py`, `gen_v06.py`, `gen_v15.py` |
| `limbs/` | V07–V12 (.svg + .json) | `gen_v07.py` … `gen_v12.py` |
| `shop/` | Cảnh tiệm S01–S05 + slots.json, hình hướng dẫn cài, huy hiệu | `node build-scenes.mjs`, `build-install.mjs`, `build-ui.mjs` |
| `../characters/` | Nhân vật | `node art/characters/build.mjs` |

**Lưu ý:**
- Một số script còn ghi ảnh xem thử ra thư mục tạm của phiên làm việc cũ. Đường dẫn đó có thể không còn, nên sửa lại trước khi chạy.
- Đồ dùng (`equipment/`), vật tư (`items/`) và biểu tượng app được viết trực tiếp, không có script.
- **Sau khi tạo lại V01, V03 hoặc V05**, phải chạy `node art/_src/normalize-sides.mjs V01 V03 V05`, để nhãn trái/phải trong JSON theo **bên của khách**.
