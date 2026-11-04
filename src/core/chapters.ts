import type { ChapterDayDef, ChapterDef, ChapterNo, FeatureId, GameState, ItemKey } from "./types";
import { C, chapterDef } from "./content";

export type LearnRef = { kind: "point" | "muscle" | "zone"; id: string };

export function keyOf(r: { kind: string; id: string }): ItemKey {
  const p = r.kind === "point" ? "P" : r.kind === "muscle" ? "M" : r.kind === "zone" ? "Z" : "S";
  return `${p}:${r.id}`;
}

export function examDayNo(ch: ChapterDef): number {
  const ex = ch.days.find((d) => d.kind === "exam");
  return ex ? ex.chapterDay : Math.max(1, ...ch.days.map((d) => d.chapterDay));
}

/** Day definition for the current chapter day (days after the exam reuse the exam day's def). */
export function currentDayDef(s: GameState): ChapterDayDef | undefined {
  const ch = chapterDef(s.chapter);
  if (!ch || s.chapterDay < 1) return undefined;
  const exact = ch.days.find((d) => d.chapterDay === s.chapterDay);
  if (exact) return exact;
  const sorted = ch.days.slice().sort((a, b) => a.chapterDay - b.chapterDay);
  return sorted[sorted.length - 1];
}

export function isExamDay(s: GameState): boolean {
  if (s.freeMode || s.chaptersPassed.includes(s.chapter)) return false;
  const ch = chapterDef(s.chapter);
  if (!ch) return false;
  return s.chapterDay >= examDayNo(ch);
}

/** Items introduced in a chapter (optionally up to a chapter day). */
export function chapterItems(no: number, uptoDay = Infinity): LearnRef[] {
  const ch = chapterDef(no);
  if (!ch) return [];
  const out: LearnRef[] = [];
  for (const d of ch.days) if (d.chapterDay <= uptoDay) for (const it of d.newItems) if (!out.some((o) => o.kind === it.kind && o.id === it.id)) out.push({ kind: it.kind, id: it.id });
  return out;
}

/** All items learned so far (introduced up to today). */
export function learnedItems(s: GameState): LearnRef[] {
  const out: LearnRef[] = [];
  const seen = new Set<string>();
  for (const ch of C().CHAPTERS) {
    let upto: number;
    if (s.freeMode || ch.no < s.chapter) upto = Infinity;
    else if (ch.no === s.chapter) upto = s.chapterDay;
    else continue;
    for (const it of chapterItems(ch.no, upto)) {
      const k = keyOf(it);
      if (!seen.has(k)) { seen.add(k); out.push(it); }
    }
  }
  return out;
}

export function todaysNewItems(s: GameState): LearnRef[] {
  if (s.freeMode) return [];
  const d = currentDayDef(s);
  return d && d.chapterDay === s.chapterDay ? d.newItems.map((x) => ({ kind: x.kind, id: x.id })) : [];
}

/** Chapter in which an item is first introduced (falls back to content def). */
export function itemChapter(key: ItemKey): number {
  for (const ch of C().CHAPTERS.slice().sort((a, b) => a.no - b.no)) for (const d of ch.days) for (const it of d.newItems) if (keyOf(it) === key) return ch.no;
  return 99;
}

/** Recompute unlocked services/features/supplies/equipment for the current chapter day (never removes). */
export function syncUnlocks(s: GameState): void {
  const u = s.unlocked;
  const add = <T>(arr: T[], v: T) => { if (!arr.includes(v)) arr.push(v); };
  const ch = s.chapter;
  const cd = Math.max(0, s.chapterDay);
  for (const sv of C().SERVICES) if (s.freeMode || sv.chapter < ch || (sv.chapter === ch && sv.unlockChapterDay <= cd)) add(u.services, sv.id);
  for (const sp of C().SUPPLIES) if (s.freeMode || sp.unlockChapter <= ch) add(u.supplies, sp.id);
  for (const e of C().EQUIPMENT) if (s.freeMode || e.unlockChapter < ch || (e.unlockChapter === ch && (e.unlockChapterDay ?? 1) <= cd)) add(u.equipment, e.id);
  for (const c of C().CHAPTERS) {
    if (c.no < ch || s.freeMode) {
      for (const d of c.days) for (const f of d.introduce) add(u.features, f);
      for (const f of c.unlocks.features) add(u.features, f);
      for (const sv of c.unlocks.services) add(u.services, sv);
      for (const sp of c.unlocks.supplies) add(u.supplies, sp);
      for (const e of c.unlocks.equipment) add(u.equipment, e);
    } else if (c.no === ch) {
      for (const d of c.days) if (d.chapterDay <= cd) for (const f of d.introduce) add(u.features, f);
    }
  }
  if (s.freeMode) add(u.features, "free-mode" as FeatureId);
}

export function hasFeature(s: GameState, f: FeatureId): boolean { return s.unlocked.features.includes(f); }

export function chapterInfo(no: ChapterNo): ChapterDef {
  const ch = chapterDef(no);
  if (!ch) throw new Error(`Không tìm thấy chương ${no}`);
  return ch;
}
