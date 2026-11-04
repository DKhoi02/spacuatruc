import { useMemo, useState } from "preact/hooks";
import type { ChapterNo, GameState, ItemKey, ViewId } from "@/core/types";
import { BookOpen, Lock, ShieldAlert, Trophy } from "lucide-preact";
import { Btn, Chip, Empty, Modal, Section } from "../components/bits";
import { ViewMarker } from "../components/ViewMarker";
import { chapterDef, itemByKey, type LearnItem } from "../content";
import * as flow from "../flow";
import { api } from "../api";
import { query } from "../store";
import { Portrait } from "../components/Svg";
import { sideLabel } from "../format";
import { Hud } from "./Hud";

const levelLabel = ["Mới gặp", "Đang học", "Khá", "Nhớ tốt", "Thành thạo"];
const forceLabel = { light: "Nhẹ", medium: "Vừa", strong: "Mạnh" } as const;

function chapterOf(it: LearnItem): ChapterNo | 0 {
  return it.kind === "zone" ? 8 : it.def.chapter;
}

export function Notebook({ s }: { s: GameState }) {
  const [open, setOpen] = useState<ItemKey | null>(null);
  const keys = Object.keys(s.mastery).filter((k) => /^[PMZ]:/.test(k));
  const groups = new Map<number, { key: ItemKey; it: LearnItem }[]>();
  for (const key of keys) {
    const it = itemByKey(key);
    if (!it) continue;
    const ch = chapterOf(it);
    groups.set(ch, [...(groups.get(ch) ?? []), { key, it }]);
  }
  const sorted = [...groups].sort((a, b) => a[0] - b[0]);
  return (
    <div class="screen">
      <Hud s={s} />
      <h1 class="screen-title">Sổ tay</h1>
      <ChallengeCard s={s} />
      <LastExamCard s={s} />
      {sorted.length === 0 && <Empty>Chưa học huyệt nào. Mở cửa đón khách để bắt đầu học nhé!</Empty>}
      {sorted.map(([ch, items]) => (
        <Section key={ch} title={`Chương ${ch}${chapterDef(ch as ChapterNo) ? ` – ${chapterDef(ch as ChapterNo)!.title}` : ""}`} right={<span class="muted small">{items.length} mục</span>}>
          <div class="list nb-list">
            {items.map(({ key, it }) => {
              const m = s.mastery[key];
              return (
                <button class="card nb-item" key={key} onClick={() => setOpen(key)}>
                  <div class="grow">
                    <b>{it.def.name}</b>
                    <span class="muted small"> {it.kind === "point" ? it.def.id : it.kind === "muscle" ? it.def.latin : it.def.bodyArea}</span>
                    {it.kind === "point" && it.def.sensitive && <ShieldAlert size={14} class="warn-ic" />}
                  </div>
                  <Mastery level={m.level} />
                </button>
              );
            })}
          </div>
        </Section>
      ))}
      {open && <NotebookDetail s={s} k={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Mastery({ level }: { level: number }) {
  return (
    <span class="mastery" title={levelLabel[level]}>
      {[1, 2, 3, 4].map((i) => <span key={i} class={`pip${i <= level ? " on" : ""}`} />)}
    </span>
  );
}

function NotebookDetail({ s, k, onClose }: { s: GameState; k: ItemKey; onClose: () => void }) {
  const it = itemByKey(k);
  if (!it) return null;
  const m = s.mastery[k];
  const view: ViewId = it.kind === "zone" ? "V12" : it.def.views[0];
  return (
    <Modal title={it.def.name} onClose={onClose} class="nb-detail">
      <div class="nb-view">{view && <ViewMarker view={view} kind={it.kind} id={it.def.id} variant={it.kind === "point" ? it.def.variant : undefined} />}</div>
      <div class="chips">
        <Chip tone="sage">{levelLabel[m?.level ?? 0]}</Chip>
        {m && <Chip>Đúng {m.correct}/{m.attempts}</Chip>}
        {it.kind === "point" && <Chip>{it.def.id}{it.def.altName ? ` · ${it.def.altName}` : ""}</Chip>}
      </div>
      {it.kind === "point" && (
        <dl class="facts">
          <dt>Vị trí</dt><dd>{it.def.location}</dd>
          <dt>Bên</dt><dd>{it.def.sides.includes("center") ? "Giữa (1 huyệt)" : it.def.sides.map((x) => sideLabel[x]).join(", ")}</dd>
          <dt>Lực · thời gian</dt><dd>{forceLabel[it.def.force]} · {it.def.seconds} giây</dd>
          <dt>Kỹ thuật</dt><dd>{it.def.technique}</dd>
          <dt>Tác dụng</dt><dd>{it.def.effects} <span class="muted small">(tham khảo)</span></dd>
          {(it.def.safetyNote || it.def.pregnancy) && (
            <><dt class="danger-t">An toàn</dt><dd class="danger-t">{it.def.safetyNote}{it.def.pregnancy ? `${it.def.safetyNote ? " · " : ""}${it.def.pregnancy === "contraindicated" ? "Chống chỉ định với thai phụ" : "Thận trọng với thai phụ"}` : ""}</dd></>
          )}
        </dl>
      )}
      {it.kind === "muscle" && (
        <dl class="facts">
          <dt>Tên Latin</dt><dd>{it.def.latin}</dd>
          <dt>Vị trí</dt><dd>{it.def.location}</dd>
          <dt>Hướng thớ</dt><dd>{it.def.fiberDirection}</dd>
          <dt>Hướng vuốt</dt><dd>{it.def.strokeDirection}</dd>
          {it.def.safetyNote && <><dt class="danger-t">An toàn</dt><dd class="danger-t">{it.def.safetyNote}</dd></>}
        </dl>
      )}
      {it.kind === "zone" && (
        <dl class="facts">
          <dt>Vùng phản xạ</dt><dd>{it.def.bodyArea}</dd>
          <dt>Bàn chân</dt><dd>{it.def.onlyFoot ? `Chỉ chân ${sideLabel[it.def.onlyFoot]}` : "Cả 2 chân"}</dd>
        </dl>
      )}
    </Modal>
  );
}

/** "Bài kiểm tra gần nhất": reopen anh Khôi's review of the latest exam (saved in the game state). */
function LastExamCard({ s }: { s: GameState }) {
  const last = s.lastExamReview;
  const n = useMemo(() => (last ? query(() => api.reviewOf(last).entries.length, 0) : 0), [last]);
  if (!last) return null;
  return (
    <Section title="Bài kiểm tra gần nhất">
      <div class="card nb-exam">
        <Portrait id="anh-khoi" expr={last.passed ? "happy" : "neutral"} size={56} />
        <div class="grow">
          <b>Chương {last.chapter} · ngày {last.day}</b>{" "}
          {last.passed ? <Chip tone="sage">Đạt</Chip> : <Chip tone="danger">Chưa đạt</Chip>}
          <p class="muted small">{Math.round(last.score)}/100 điểm · {n ? `${n} mục cần xem lại` : "không có mục nào cần xem lại"}</p>
        </div>
        <Btn small kind="secondary" onClick={flow.openLastReview}>Xem lại nhận xét</Btn>
      </div>
    </Section>
  );
}

function ChallengeCard({ s }: { s: GameState }) {
  const done = s.challenge.lastDay === s.day;
  return (
    <div class={`card challenge-card${s.freeMode ? "" : " locked"}`}>
      {s.freeMode ? <Trophy size={28} /> : <Lock size={28} />}
      <div class="grow">
        <b>Thử thách hôm nay</b>
        <p class="muted small">{s.freeMode ? `10 mục ngẫu nhiên, không gợi ý. Chuỗi: ${s.challenge.streak} ngày.` : "Mở khi hoàn thành Chương 8 (Khách tự do)."}</p>
      </div>
      {s.freeMode && <Btn small disabled={done} onClick={() => flow.startChallenge()}>{done ? "Đã xong" : "Bắt đầu"}</Btn>}
    </div>
  );
}

export { BookOpen };
