import type { GameState, RandomEventDef } from "./types";
import { C } from "./content";
import { hasFeature } from "./chapters";
import { rngFor } from "./rng";

export function activeEventEffect(s: GameState): RandomEventDef["effect"] | undefined {
  const ev = s.today.event;
  if (!ev) return undefined;
  return C().EVENTS.find((e) => e.id === ev.id)?.effect;
}

/** Roll today's random event (~1/week from chapter 4 or when the "events" feature is unlocked). Mutates. */
export function rollEvent(s: GameState): void {
  s.today.event = undefined;
  if (!(s.chapter >= 4 || s.freeMode || hasFeature(s, "events"))) return;
  const rng = rngFor(s, "event");
  if (!rng.chance(1 / 7)) return;
  const pool = C().EVENTS.filter((e) => e.minChapter <= s.chapter || s.freeMode)
    .filter((e) => e.effect !== "staff-sick" || s.staff.length > 0)
    .filter((e) => e.effect !== "hygiene-check" || hasFeature(s, "hygiene") || s.chapter >= 7);
  if (!pool.length) return;
  const ev = rng.pick(pool);
  s.today.event = { id: ev.id, title: ev.title, description: ev.description };
  if (ev.effect === "staff-sick") {
    const st = rng.pick(s.staff);
    st.sickToday = true;
  }
}
