import type { GameState } from "@/core/types";
import { CalendarDays, Clock, Coins, House, Star } from "lucide-preact";
import { Stars } from "../components/bits";
import { hhmm, rep, vnd } from "../format";

export function Hud({ s }: { s: GameState }) {
  const rentIn = s.rent.nextDueDay - s.day;
  // Long balances (≥ 10 triệu) or the highlighted rent pill don't fit 390px next to 5 stars: show one star + number.
  const compact = Math.abs(s.money) >= 10_000_000 || rentIn <= 2;
  return (
    <header class="hud">
      <div class="hud-row">
        <div class="hud-shop"><House size={16} /> <span>{s.shopName}</span></div>
        {s.today.phase === "open" && <div class="hud-clock" aria-label="Giờ trong tiệm"><Clock size={14} /> {hhmm(s.today.clock)}</div>}
        <div class="hud-day">Ngày {s.day} · Ch.{s.chapter}{s.freeMode ? " · Tự do" : ""}</div>
      </div>
      <div class="hud-row">
        <div class={`hud-money${s.money < 0 ? " neg" : ""}`}><Coins size={18} /> {vnd(s.money)}</div>
        <div class="hud-rep">{compact ? <Star size={15} class="hud-star" /> : <Stars value={s.reputation} size={14} />} <span>{rep(s.reputation)}</span></div>
        <div class={`hud-rent${rentIn <= 2 ? " soon" : ""}`}><CalendarDays size={15} /> {rentIn <= 0 ? "Thuê: hôm nay" : `Thuê: ${rentIn} ngày`}</div>
      </div>
    </header>
  );
}
