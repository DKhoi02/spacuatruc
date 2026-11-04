/** Formatting helpers (Vietnamese). */
export function vnd(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}${Math.abs(Math.round(n)).toLocaleString("vi-VN")}đ`;
}
/** Compact "560k" / "3.120k" for summary columns (as in GAME_DESIGN §7.9). */
export function k(n: number): string {
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(Math.round(n));
  if (a >= 1000) return `${sign}${(a / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k`;
  return `${sign}${a}đ`;
}
export function rep(n: number): string {
  return n.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}
export function signed(n: number, digits = 2): string {
  const s = Math.abs(n).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: digits });
  return n < 0 ? `−${s}` : `+${s}`;
}
export function dateVi(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
/** Game minute of the day → "9:05". */
export function hhmm(min: number): string {
  const m = Math.max(0, Math.round(min));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}
export const sideLabel: Record<string, string> = { left: "trái", right: "phải", center: "", front: "trước", back: "sau" };
