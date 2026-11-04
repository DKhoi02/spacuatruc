import { useEffect, useState } from "preact/hooks";
import { BookOpen, House, RefreshCw, Settings as SettingsIcon, Store, Users } from "lucide-preact";
import type { GameState } from "@/core/types";
import { api, mockMode } from "./api";
import { Btn } from "./components/bits";
import { getGame, setGame, useGame, useToasts } from "./store";
import { setUi, useUi, type Tab } from "./ui";
import { deleteGame, loadGame, requestPersistentStorage, saveGame } from "@/save/storage";
import { Home } from "./screens/Home";
import { Shop } from "./screens/Shop";
import { StaffScreen } from "./screens/Staff";
import { Notebook } from "./screens/Notebook";
import { Settings } from "./screens/Settings";
import { FirstRun } from "./screens/FirstRun";
import { BillModal, ChallengeResult, ComplaintModal, ExamOverlay, FeatureIntro, SummaryScreen, TreatmentHost } from "./screens/Overlays";

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "home", label: "Sảnh", icon: House },
  { id: "shop", label: "Cửa hàng", icon: Store },
  { id: "staff", label: "Nhân viên", icon: Users },
  { id: "book", label: "Sổ tay", icon: BookOpen },
  { id: "settings", label: "Cài đặt", icon: SettingsIcon },
];

let updateSW: ((reload?: boolean) => Promise<void>) | undefined;

export function App({ boot }: { boot?: () => Promise<GameState | null> }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const s = useGame();
  const ui = useUi();

  useEffect(() => {
    (async () => {
      try {
        if (boot) {
          setGame(await boot(), false);
        } else {
          const raw = await loadGame();
          setGame(raw ? api.migrateSave(raw) : null, false);
        }
        setStatus("ready");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    })();
    void requestPersistentStorage();
    const onHide = () => { const g = getGame(); if (document.visibilityState === "hidden" && g) void saveGame(g); };
    document.addEventListener("visibilitychange", onHide);
    if (!mockMode) {
      import("virtual:pwa-register")
        .then(({ registerSW }) => { updateSW = registerSW({ onNeedRefresh: () => setUi({ updateReady: true }) }); })
        .catch(() => {});
    }
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  if (status === "loading") return <div class="boot"><div class="spinner" /></div>;
  if (status === "error") {
    return (
      <div class="screen center-card card boot-error">
        <h2>Không đọc được dữ liệu tiệm</h2>
        <p class="muted">Dữ liệu trên máy có thể bị hỏng hoặc từ bản game khác. Thử tải lại trang. Nếu vẫn lỗi, bạn có thể chơi lại từ đầu.</p>
        <Btn block onClick={() => location.reload()}>Tải lại</Btn>
        <Btn block kind="danger" onClick={async () => { if (confirm("Xóa dữ liệu và chơi lại từ đầu?")) { await deleteGame(); location.reload(); } }}>Chơi lại từ đầu</Btn>
      </div>
    );
  }

  if (!s) return (<><FirstRun /><Toasts /></>);

  const summary = s.today.phase === "summary" ? ui.summary ?? s.history.at(-1) : undefined;
  const inTreatment = !!ui.treatment;
  const modalOpen = !!(ui.bill || ui.billQueue?.length || ui.exam || ui.challengeResult || inTreatment);

  return (
    <div class={`app${inTreatment ? " in-treatment" : ""}`}>
      {ui.updateReady && !inTreatment && (
        <div class="update-banner">
          <RefreshCw size={16} /> <span class="grow">Có bản mới</span>
          <button class="btn btn-sm btn-primary" onClick={() => (updateSW ? updateSW(true) : location.reload())}>Tải lại</button>
        </div>
      )}
      <main class="app-main" style={inTreatment ? { display: "none" } : undefined}>
        {ui.tab === "home" && (summary ? <SummaryScreen s={s} summary={summary} /> : <Home s={s} />)}
        {ui.tab === "shop" && <Shop s={s} />}
        {ui.tab === "staff" && <StaffScreen s={s} />}
        {ui.tab === "book" && <Notebook s={s} />}
        {ui.tab === "settings" && <Settings s={s} />}
      </main>
      {!inTreatment && (
        <nav class="tabbar">
          {TABS.map((t) => (
            <button key={t.id} class={`tab${ui.tab === t.id ? " on" : ""}`} onClick={() => setUi({ tab: t.id })}>
              <t.icon size={22} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
      <TreatmentHost ui={ui} />
      {!inTreatment && <BillModal ui={ui} s={s} />}
      {!modalOpen && <ComplaintModal s={s} />}
      {!inTreatment && <ExamOverlay ui={ui} s={s} />}
      {!inTreatment && <ChallengeResult ui={ui} />}
      {!modalOpen && s.today.complaints.length === 0 && s.today.phase !== "summary" && <FeatureIntro s={s} />}
      {mockMode && <div class="mock-flag">MOCK</div>}
      <Toasts />
    </div>
  );
}

function Toasts() {
  const toasts = useToasts();
  return (
    <div class="toasts">
      {toasts.map((t) => <div key={t.id} class={`toast toast-${t.kind}`}>{t.text}{t.count > 1 && <span class="toast-count"> ×{t.count}</span>}</div>)}
    </div>
  );
}
