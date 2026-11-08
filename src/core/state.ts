import type { GameState, ServiceDef } from "./types";
import { C, serviceDef } from "./content";
import { syncUnlocks, chapterInfo } from "./chapters";
import { addOwned, startEquipmentIds, startInventory } from "./day";
import { autoRefreshCandidates } from "./staff";
import { CURRENT_SCHEMA_VERSION } from "./version";
import { clone, emptyLedger, newDayState, vErr } from "./util";
import { validLastExamReview } from "./exam";

export function newGame(shopName: string, seed?: number): GameState {
  const cfg = C().CONFIG;
  const s: GameState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    shopName: shopName.trim() || "Tiệm Spa",
    seed: (seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0,
    day: 1, chapter: 1, chapterDay: 1, chaptersPassed: [], freeMode: false,
    money: cfg.startMoney, reputation: cfg.startReputation,
    rent: { amount: cfg.rentPerWeek, nextDueDay: cfg.rentPeriodDays, missedPayments: 0 },
    inventory: startInventory(),
    equipment: [], staff: [], candidates: [], candidatesRefreshDay: 0,
    priceMultiplier: {}, combos: [], mastery: {},
    unlocked: { services: [], features: [], supplies: [], equipment: [] },
    seenTips: [], shopLevel: 0, adsDaysLeft: 0, regulars: [], challenge: { lastDay: 0, streak: 0 },
    today: newDayState(cfg.startReputation), history: [], settings: { sound: true, music: true },
  };
  for (const id of startEquipmentIds()) addOwned(s, id);
  syncUnlocks(s);
  autoRefreshCandidates(s);
  return s;
}

export function renameShop(s0: GameState, name: string): GameState {
  const n = name.trim();
  if (!n) throw vErr("Tên tiệm không được để trống.");
  if (n.length > 40) throw vErr("Tên tiệm dài quá (tối đa 40 ký tự).");
  return { ...clone(s0), shopName: n };
}

export function serviceById(id: string): ServiceDef {
  const s = serviceDef(id);
  if (!s) throw new Error(`Không tìm thấy dịch vụ ${id}`);
  return s;
}

export { chapterInfo };

// ───────────── save migration ─────────────

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Upgrades from version N to N+1. */
const MIGRATIONS: Record<number, (o: Record<string, unknown>) => Record<string, unknown>> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
};

/**
 * v2 → v3 (GAME_DESIGN §12): `expanded` → `shopLevel` (true → 1); equipment gets a tier; the old "nệm êm" bed
 * (E01-upgraded, bought with the E04 kit) becomes a tier-2 bed (durability scaled to the longer tier-2 life).
 */
function migrateV2toV3(o: Record<string, unknown>): Record<string, unknown> {
  o.shopLevel = o.expanded === true ? 1 : typeof o.shopLevel === "number" ? o.shopLevel : 0;
  delete o.expanded;
  if (Array.isArray(o.equipment)) {
    o.equipment = o.equipment.filter((e) => isObj(e) && e.id !== "E04").map((raw) => {
      const e = raw as Record<string, unknown>;
      if (e.id === "E01-upgraded") {
        e.id = "E01";
        e.tier = 2;
        if (typeof e.usesLeft === "number") e.usesLeft = Math.round(e.usesLeft * C().CONFIG.equipmentTiers.durability[1]);
      } else if (e.tier !== 2 && e.tier !== 3) e.tier = 1;
      return e;
    });
  }
  if (isObj(o.unlocked) && Array.isArray(o.unlocked.equipment)) o.unlocked.equipment = o.unlocked.equipment.filter((x) => x !== "E04" && x !== "E01-upgraded");
  return o;
}

/**
 * v1 → v2 (day clock, GAME_DESIGN §11): customers get arrival minutes, patience in minutes and a duration;
 * services in progress get start/end minutes; stations start clean. Pending arrivals keep their order,
 * spaced ~40 game minutes per old "ca"; customers already waiting count as greeted.
 */
function migrateV1toV2(o: Record<string, unknown>): Record<string, unknown> {
  const cfg = C().CONFIG;
  const today = o.today;
  if (!isObj(today)) return o;
  const done = typeof today.servicesCompleted === "number" ? today.servicesCompleted : 0;
  const clock = today.phase === "open" ? Math.min(cfg.clock.open + done * 40, cfg.clock.lastArrival - 30) : cfg.clock.open;
  today.clock = clock;
  today.cleaning = [];
  const fix = (raw: unknown, arriving: boolean) => {
    if (!isObj(raw)) return raw;
    const c = raw as Record<string, unknown>;
    const exam = c.special === "examiner" || String(c.id ?? "").startsWith("exam-");
    const after = typeof c.arriveAfter === "number" ? c.arriveAfter : 0;
    const wait = typeof c.waitPatience === "number" ? c.waitPatience : 2;
    c.arriveAt = arriving ? Math.min(cfg.clock.lastArrival, clock + Math.max(0, after - done) * 40) : clock;
    c.patience = exam ? 9999 : Math.max(15, Math.round((cfg.patience.baseMin * wait) / 2));
    c.durationMin = serviceDef(String(c.serviceId ?? ""))?.durationMin ?? 30;
    if (!arriving || exam) c.checkedIn = true;
    delete c.arriveAfter;
    delete c.waitPatience;
    return c;
  };
  if (Array.isArray(today.arrivals)) {
    today.arrivals = today.arrivals.map((c) => fix(c, true));
    (today.arrivals as { arriveAt: number }[]).sort((a, b) => a.arriveAt - b.arriveAt);
  }
  if (Array.isArray(today.queue)) today.queue = today.queue.map((c) => fix(c, false));
  const m = today.meta;
  const servingMap = isObj(m) && isObj(m.serving) ? (m.serving as Record<string, unknown>) : {};
  for (const k of Object.keys(servingMap)) servingMap[k] = fix(servingMap[k], false);
  if (Array.isArray(today.inService)) {
    today.inService = today.inService.filter(isObj).map((x) => {
      const c = servingMap[String(x.customerId)] as { durationMin?: number } | undefined;
      return { ...x, startAt: clock, endsAt: clock + (c?.durationMin ?? 30) };
    });
  }
  return o;
}

export function migrateSave(raw: unknown): GameState {
  let obj: unknown = raw;
  if (typeof obj === "string") {
    try { obj = JSON.parse(obj); } catch { throw vErr("File lưu bị hỏng, không đọc được."); }
  }
  if (isObj(obj) && "save" in obj && "app" in obj) obj = obj.save;
  if (!isObj(obj)) throw vErr("Dữ liệu lưu không hợp lệ.");
  let v = obj.schemaVersion;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1) throw vErr("Dữ liệu lưu không hợp lệ: thiếu phiên bản.");
  if (v > CURRENT_SCHEMA_VERSION) throw vErr("Bản lưu được tạo bởi phiên bản game mới hơn. Hãy cập nhật game trước.");
  let o = clone(obj);
  while (v < CURRENT_SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw vErr(`Không chuyển đổi được bản lưu phiên bản ${v}.`);
    o = m(o);
    v++;
    o.schemaVersion = v;
  }
  const check = (cond: boolean, field: string) => { if (!cond) throw vErr(`Dữ liệu lưu bị hỏng (${field}).`); };
  check(typeof o.shopName === "string", "tên tiệm");
  check(typeof o.day === "number" && (o.day as number) >= 1, "ngày");
  check(typeof o.chapter === "number" && Number.isInteger(o.chapter) && (o.chapter as number) >= 1 && (o.chapter as number) <= 8, "chương");
  check(typeof o.money === "number" && Number.isFinite(o.money), "số dư");
  check(typeof o.seed === "number", "seed");
  check(isObj(o.mastery), "độ thành thạo");
  check(isObj(o.inventory), "vật tư");
  check(Array.isArray(o.equipment), "đồ dùng");
  check(Array.isArray(o.staff), "nhân viên");
  check(isObj(o.today), "ngày hiện tại");
  const today = o.today as Record<string, unknown>;
  check(["prep", "open", "summary"].includes(today.phase as string), "trạng thái ngày");

  // Fill any missing optional parts with defaults.
  const def = newGameSkeleton(o.shopName as string, o.seed as number);
  const out = { ...def, ...o } as unknown as GameState;
  out.unlocked = { ...def.unlocked, ...(isObj(o.unlocked) ? (o.unlocked as object) : {}) } as GameState["unlocked"];
  out.today = { ...def.today, ...(today as object) } as GameState["today"];
  out.today.ledger = { ...def.today.ledger, ...(isObj(today.ledger) ? (today.ledger as object) : {}) } as GameState["today"]["ledger"];
  out.inventory = { ...def.inventory, ...(o.inventory as object) } as GameState["inventory"];
  out.rent = { ...def.rent, ...(isObj(o.rent) ? (o.rent as object) : {}) } as GameState["rent"];
  out.challenge = { ...def.challenge, ...(isObj(o.challenge) ? (o.challenge as object) : {}) } as GameState["challenge"];
  out.settings = { ...def.settings, ...(isObj(o.settings) ? (o.settings as object) : {}) } as GameState["settings"];
  out.history = Array.isArray(o.history)
    ? (o.history as GameState["history"]).slice(-30).map((h) => (isObj(h) && isObj(h.ledger) ? { ...h, ledger: { ...emptyLedger(), ...h.ledger } } : h))
    : [];
  out.today.clock ??= cfgOpen();
  out.today.cleaning ??= [];
  // optional exam review (added without a schema bump): older saves lack it, a malformed one is dropped
  if (!validLastExamReview(out.lastExamReview)) delete out.lastExamReview;
  // optional decorations (added without a schema bump): drop a malformed one, keep only well-formed placements
  if (out.decor !== undefined) {
    const d = out.decor as unknown as Record<string, unknown>;
    if (!isObj(d) || !isObj(d.owned) || !Array.isArray(d.placed)) delete out.decor;
    else out.decor = { owned: { ...(d.owned as Record<string, number>) }, placed: (d.placed as unknown[]).filter((p): p is NonNullable<GameState["decor"]>["placed"][number] =>
      isObj(p) && typeof (p as Record<string, unknown>).uid === "string" && typeof (p as Record<string, unknown>).id === "string" && ((p as Record<string, unknown>).area === "lobby" || (p as Record<string, unknown>).area === "room1")
      && typeof (p as Record<string, unknown>).x === "number" && typeof (p as Record<string, unknown>).y === "number") };
  }
  out.schemaVersion = CURRENT_SCHEMA_VERSION;
  syncUnlocks(out); // features moved/added by content updates (only ever adds)
  return out;
}

const cfgOpen = () => C().CONFIG.clock.open;

function newGameSkeleton(shopName: string, seed: number): GameState {
  const cfg = C().CONFIG;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION, createdAt: new Date(0).toISOString(), shopName, seed,
    day: 1, chapter: 1, chapterDay: 1, chaptersPassed: [], freeMode: false, money: cfg.startMoney, reputation: cfg.startReputation,
    rent: { amount: cfg.rentPerWeek, nextDueDay: cfg.rentPeriodDays, missedPayments: 0 }, inventory: startInventory(),
    equipment: [], staff: [], candidates: [], candidatesRefreshDay: 0, priceMultiplier: {}, combos: [], mastery: {},
    unlocked: { services: [], features: [], supplies: [], equipment: [] }, seenTips: [], shopLevel: 0, adsDaysLeft: 0,
    regulars: [], challenge: { lastDay: 0, streak: 0 }, today: newDayState(cfg.startReputation), history: [], settings: { sound: true, music: true },
  };
}
