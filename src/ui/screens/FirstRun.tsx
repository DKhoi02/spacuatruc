import { useRef, useState } from "preact/hooks";
import { Sparkles } from "lucide-preact";
import { api } from "../api";
import { Btn } from "../components/bits";
import { SceneView } from "../components/Scene";
import { setGame, toast } from "../store";

export function FirstRun() {
  const [name, setName] = useState("");
  const shown = name.trim() || "Tiệm của bạn";
  const fileRef = useRef<HTMLInputElement>(null);
  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = "";
    if (!f) return;
    try {
      const r = api.parseSaveFile(await f.text());
      const m = r.summary;
      if (confirm(`Nhập tiệm “${m.shopName}” – Chương ${m.chapter}, ngày ${m.day}, số dư ${m.money.toLocaleString("vi-VN")}đ?`)) setGame(r.state);
    } catch (err) {
      toast((err as Error).message || "File bị hỏng, không đọc được.", "error");
    }
  };
  const start = () => {
    const n = name.trim();
    if (!n) return;
    try {
      setGame(api.newGame(n));
    } catch (e) {
      toast(`Chưa tạo được tiệm: ${(e as Error).message}`, "error");
    }
  };
  return (
    <div class="screen first-run">
      <SceneView scene="S01" shopName={shown} placements={[{ slot: "chair-1", art: "E02" }, { slot: "chair-2", art: "E02" }]} actors={[]} class="lobby-scene" />
      <div class="card fr-card">
        <h1><Sparkles size={22} /> Đặt tên tiệm</h1>
        <p>Chào mừng bạn! Hãy đặt tên cho tiệm spa trị liệu của mình. Bạn sẽ vừa quản lý tiệm vừa học thuộc vị trí huyệt và cơ.</p>
        <input class="input big" placeholder="Ví dụ: Tiệm Hoa Sen" value={name} maxLength={28} autoFocus
          onInput={(e) => setName((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === "Enter" && start()} />
        <Btn block disabled={!name.trim()} onClick={start}>Mở tiệm</Btn>
        <Btn block kind="ghost" onClick={() => fileRef.current?.click()}>Đã có file save? Nhập file</Btn>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
        <ul class="tips small">
          <li>Dữ liệu được lưu ngay trên máy này, không cần đăng nhập.</li>
          <li>Nên thỉnh thoảng vào <b>Cài đặt → Xuất file</b> để sao lưu hoặc chuyển sang máy khác.</li>
          <li>Đổi tên tiệm lúc nào cũng được trong Cài đặt.</li>
        </ul>
      </div>
    </div>
  );
}
