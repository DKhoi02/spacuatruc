/** Save file export/import helpers (pure). Used by the settings screen. */
import type { ChapterNo, GameState } from "./types";
import { migrateSave } from "./state";
import { CURRENT_SCHEMA_VERSION, GAME_VERSION } from "./version";

export const SAVE_APP_ID = "spa-game";

export interface SaveFile { app: typeof SAVE_APP_ID; schemaVersion: number; gameVersion: string; exportedAt: string; save: GameState }

export function exportSave(state: GameState, now: Date = new Date()): string {
  const file: SaveFile = { app: SAVE_APP_ID, schemaVersion: state.schemaVersion ?? CURRENT_SCHEMA_VERSION, gameVersion: GAME_VERSION, exportedAt: now.toISOString(), save: state };
  return JSON.stringify(file);
}

/** Suggested file name: spa-<tên tiệm>-<yyyy-mm-dd>.json */
export function saveFileName(state: GameState, now: Date = new Date()): string {
  const slug = state.shopName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tiem";
  return `spa-${slug}-${now.toISOString().slice(0, 10)}.json`;
}

export function parseSaveFile(text: string): { state: GameState; summary: { shopName: string; chapter: ChapterNo; day: number; money: number; exportedAt: string } } {
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { throw new Error("File bị hỏng hoặc không phải file JSON, không đọc được."); }
  if (typeof obj !== "object" || obj === null) throw new Error("File bị hỏng, không đọc được.");
  const f = obj as Partial<SaveFile>;
  if (f.app !== SAVE_APP_ID) throw new Error("Đây không phải file lưu của game Tiệm Spa.");
  if (typeof f.schemaVersion !== "number") throw new Error("File lưu bị hỏng (thiếu phiên bản).");
  if (f.schemaVersion > CURRENT_SCHEMA_VERSION) throw new Error("File này được tạo bởi bản game mới hơn. Hãy cập nhật game trước.");
  if (typeof f.save !== "object" || f.save === null) throw new Error("File lưu bị hỏng (không có dữ liệu).");
  const state = migrateSave(f.save);
  return { state, summary: { shopName: state.shopName, chapter: state.chapter, day: state.day, money: state.money, exportedAt: typeof f.exportedAt === "string" ? f.exportedAt : "" } };
}
