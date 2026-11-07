import { useRef, useState } from "preact/hooks";
import type { GameState } from "@/core/types";
import { Download, Music, Pencil, RotateCcw, Upload, Volume2, ZoomIn } from "lucide-preact";
import { api } from "../api";
import { Btn, Modal, Section } from "../components/bits";
import { dateVi, vnd } from "../format";
import { dispatch, setGame, toast } from "../store";
import { deleteGame, shareOrDownload } from "@/save/storage";
import { GAME_VERSION } from "@/save/saveFile";

interface SaveSummary { shopName: string; chapter: number; day: number; money: number; exportedAt: string }
import { setUi } from "../ui";
import { Hud } from "./Hud";

export function Settings({ s }: { s: GameState }) {
  const [name, setName] = useState(s.shopName);
  const [pending, setPending] = useState<{ state: GameState; summary: SaveSummary } | null>(null);
  const [restartStep, setRestartStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = "";
    if (!f) return;
    const text = await f.text();
    try {
      const r = api.parseSaveFile(text);
      setPending({ state: r.state, summary: r.summary });
    } catch (err) {
      toast((err as Error).message || "File bị hỏng, không đọc được.", "error");
    }
  };

  return (
    <div class="screen">
      <Hud s={s} />
      <h1 class="screen-title">Cài đặt</h1>
      <Section title={<><Pencil size={18} /> Tên tiệm</>}>
        <div class="card">
          <input class="input" value={name} maxLength={28} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          <Btn block disabled={!name.trim() || name.trim() === s.shopName} onClick={() => dispatch((g) => api.renameShop(g, name.trim())) && toast("Đã đổi tên tiệm", "ok")}>Đổi tên</Btn>
        </div>
      </Section>
      <Section title="Âm thanh">
        <div class="card">
          <Toggle icon={<Volume2 size={18} />} label="Hiệu ứng âm thanh" on={s.settings.sound} onChange={(v) => dispatch((g) => ({ ...g, settings: { ...g.settings, sound: v } }))} />
          <Toggle icon={<Music size={18} />} label="Nhạc nền" on={s.settings.music} onChange={(v) => dispatch((g) => ({ ...g, settings: { ...g.settings, music: v } }))} />
        </div>
      </Section>
      <Section title="Trợ giúp khi làm khách">
        <div class="card">
          <Toggle icon={<ZoomIn size={18} />} label="Tự phóng to tới vị trí huyệt" on={!!s.settings.zoomAssist} onChange={(v) => dispatch((g) => ({ ...g, settings: { ...g.settings, zoomAssist: v } }))} />
          <p class="muted small">Tắt (mặc định): màn hình giữ nguyên cỡ để bạn tự nhận định vị trí như khi làm thật. Nút phóng to vẫn dùng được, nhưng chỉ phóng vào giữa ảnh, bạn tự kéo tới chỗ cần ấn.</p>
        </div>
      </Section>
      <Section title="Sao lưu dữ liệu">
        <div class="card">
          <p class="muted small">Dữ liệu chỉ lưu trên máy này. Xuất file để cất vào Tệp (iCloud), gửi Zalo hay AirDrop sang máy mới.</p>
          <Btn block onClick={async () => { const r = await shareOrDownload(api.exportSave(s), api.saveFileName(s)); if (r === "downloaded") toast("Đã tải file save", "ok"); }}><Download size={18} /> Xuất file</Btn>
          <Btn block kind="secondary" onClick={() => fileRef.current?.click()}><Upload size={18} /> Nhập file</Btn>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
        </div>
      </Section>
      <Section title="Chơi lại">
        <div class="card">
          <p class="muted small">Xóa tiệm hiện tại và bắt đầu lại từ Chương 1. Không thể hoàn tác.</p>
          <Btn block kind="danger" onClick={() => setRestartStep(1)}><RotateCcw size={18} /> Chơi lại từ đầu</Btn>
        </div>
      </Section>
      <p class="muted tiny center">Phiên bản {GAME_VERSION}</p>

      {pending && (
        <Modal title="Nhập file save?" onClose={() => setPending(null)}>
          <dl class="facts">
            <dt>Tên tiệm</dt><dd>{pending.summary.shopName}</dd>
            <dt>Tiến độ</dt><dd>Chương {pending.summary.chapter} · Ngày {pending.summary.day}</dd>
            <dt>Số dư</dt><dd>{vnd(pending.summary.money)}</dd>
            {pending.summary.exportedAt && <><dt>Ngày xuất file</dt><dd>{dateVi(pending.summary.exportedAt)}</dd></>}
          </dl>
          <p class="warn-line">Tiệm đang chơi trên máy này sẽ bị ghi đè.</p>
          <Btn block onClick={() => { setGame(pending.state); setPending(null); setUi({ tab: "home", summary: undefined, bill: undefined, exam: undefined }); toast("Đã nhập file save", "ok"); }}>Ghi đè & nhập</Btn>
          <Btn block kind="ghost" onClick={() => setPending(null)}>Hủy</Btn>
        </Modal>
      )}
      {restartStep > 0 && (
        <Modal title={restartStep === 1 ? "Chơi lại từ đầu?" : "Chắc chắn chưa?"} onClose={() => setRestartStep(0)}>
          <p>{restartStep === 1 ? `Toàn bộ tiến độ của “${s.shopName}” sẽ bị xóa.` : "Lần xác nhận cuối: xóa save và đặt tên tiệm mới. Nên xuất file trước nếu muốn giữ lại."}</p>
          <Btn block kind="danger" onClick={async () => {
            if (restartStep === 1) return setRestartStep(2);
            await deleteGame();
            setRestartStep(0);
            setUi({ tab: "home", summary: undefined, bill: undefined, exam: undefined, treatment: undefined });
            setGame(null, false);
          }}>{restartStep === 1 ? "Tiếp tục" : "Xóa và chơi lại"}</Btn>
          <Btn block kind="ghost" onClick={() => setRestartStep(0)}>Hủy</Btn>
        </Modal>
      )}
    </div>
  );
}

function Toggle({ label, on, onChange, icon }: { label: string; on: boolean; onChange: (v: boolean) => void; icon?: preact.ComponentChildren }) {
  return (
    <button class="toggle-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      {icon}<span class="grow">{label}</span><span class={`switch${on ? " on" : ""}`}><span /></span>
    </button>
  );
}
