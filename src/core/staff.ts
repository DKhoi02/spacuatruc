import type { Candidate, GameState, ServiceId, Staff, StaffRole, StaffTier } from "./types";
import { C, characterName, serviceDef, tierDef } from "./content";
import { hasFeature, keyOf } from "./chapters";
import { getMastery } from "./mastery";
import { learnedPool, poolRefs } from "./tickets";
import { makeRng, hashString, type Rng } from "./rng";
import { clone, clamp, vErr } from "./util";
import { newUid } from "./equipment";

export function staffCanPerform(s: GameState, serviceId: ServiceId): boolean {
  const svc = serviceDef(serviceId);
  if (!svc || !s.unlocked.services.includes(serviceId)) return false;
  const pool = poolRefs(svc);
  const learned = learnedPool(s, svc);
  if (pool.length > 0 && learned.length === 0) return false;
  return learned.every((r) => getMastery(s, keyOf(r)).level >= 3);
}

function rolesOpen(s: GameState): StaffRole[] {
  const r: StaffRole[] = [];
  if (hasFeature(s, "hire-ktv")) r.push("ktv");
  if (hasFeature(s, "hire-receptionist")) r.push("receptionist");
  if (hasFeature(s, "hire-cleaner")) r.push("cleaner");
  return r;
}

function maxTier(s: GameState, role: StaffRole): number {
  if (role === "ktv" && s.chapter === 1 && !s.freeMode) return 2;
  return 3;
}

export function genCandidates(s: GameState, rng: Rng): Candidate[] {
  const roles = rolesOpen(s);
  if (!roles.length) return [];
  const hired = new Set(s.staff.map((x) => x.characterId));
  const used = new Set<string>();
  const out: Candidate[] = [];
  const n = rng.int(2, 3);
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const role: StaffRole = rng.pick(roles.includes("ktv") ? [...roles, "ktv" as StaffRole] : roles);
    const tiers = C().STAFF_TIERS.filter((t) => t.role === role && t.tier <= maxTier(s, role));
    const ids = (C().STAFF_CANDIDATE_IDS[role] ?? []).filter((id) => !hired.has(id) && !used.has(id));
    if (!tiers.length || !ids.length) continue;
    const t = rng.pick(tiers);
    const characterId = rng.pick(ids);
    used.add(characterId);
    out.push({ characterId, name: characterName(characterId), role, tier: t.tier, wage: t.baseWage, commissionPct: t.commissionPct });
  }
  return out;
}

/** Auto refresh every CONFIG.candidatesRefreshDays (mutates). */
export function autoRefreshCandidates(s: GameState): void {
  if (!rolesOpen(s).length) return;
  if (s.day < s.candidatesRefreshDay && s.candidates.length) return;
  s.candidates = genCandidates(s, makeRng(hashString(`${s.seed}|${s.day}|cand`)));
  s.candidatesRefreshDay = s.day + C().CONFIG.candidatesRefreshDays;
}

export function refreshCandidates(s0: GameState, paid: boolean): GameState {
  if (!rolesOpen(s0).length) throw vErr("Bảng tuyển dụng chưa mở.");
  const fee = paid ? C().CONFIG.postJobFee : 0;
  if (!paid && s0.day < s0.candidatesRefreshDay && s0.candidates.length) throw vErr(`Bảng tuyển dụng sẽ làm mới sau ${s0.candidatesRefreshDay - s0.day} ngày.`);
  if (fee > 0 && s0.money < fee) throw vErr("Không đủ tiền đăng tin.");
  const s = clone(s0);
  s.money -= fee;
  s.today.ledger.other += fee;
  const salt = `${s.seed}|${s.day}|cand|${s0.money}|${s0.candidates.map((c) => c.characterId).join(",")}|${s.staff.length}`;
  s.candidates = genCandidates(s, makeRng(hashString(salt)));
  s.candidatesRefreshDay = s.day + C().CONFIG.candidatesRefreshDays;
  return s;
}

export function ktvLimit(s: GameState): number {
  // one KTV per station (bed / chair) the shop owns
  return Math.max(1, s.equipment.filter((e) => ["E01", "E01-upgraded", "E06", "E10", "vip-room"].includes(e.id)).length);
}

export function hire(s0: GameState, candidateIndex: number): GameState {
  const c = s0.candidates[candidateIndex];
  if (!c) throw vErr("Không tìm thấy ứng viên.");
  const count = s0.staff.filter((x) => x.role === c.role).length;
  if (c.role === "ktv" && count >= ktvLimit(s0)) throw vErr("Mỗi KTV cần 1 giường. Mua thêm giường trước khi thuê thêm.");
  if (c.role !== "ktv" && count >= 1) throw vErr(c.role === "receptionist" ? "Tiệm đã có lễ tân." : "Tiệm đã có tạp vụ.");
  const s = clone(s0);
  const st: Staff = {
    uid: newUid(s, "st"), characterId: c.characterId, name: c.name, role: c.role, tier: c.tier, wage: c.wage, commissionPct: c.commissionPct,
    satisfaction: 70, exp: 0, servicesToday: 0, promotionRequested: false, unpaidDays: 0, hiredDay: s.day,
  };
  s.staff.push(st);
  s.candidates.splice(candidateIndex, 1);
  return s;
}

function findStaff(s: GameState, uid: string): Staff {
  const st = s.staff.find((x) => x.uid === uid);
  if (!st) throw vErr("Không tìm thấy nhân viên.");
  return st;
}

export function fire(s0: GameState, staffUid: string): GameState {
  findStaff(s0, staffUid);
  const s = clone(s0);
  const st = findStaff(s, staffUid);
  const sev = st.wage * C().CONFIG.severanceDays;
  s.money -= sev;
  s.today.ledger.severance += sev;
  s.staff = s.staff.filter((x) => x.uid !== staffUid);
  return s;
}

function retainCheck(st: Staff) {
  if (st.quitNoticeDaysLeft !== undefined && st.satisfaction >= 40 && st.unpaidDays < 2) delete st.quitNoticeDaysLeft;
}

export function giveRaise(s0: GameState, staffUid: string, amount: number): GameState {
  if (!(amount > 0)) throw vErr("Mức tăng lương không hợp lệ.");
  findStaff(s0, staffUid);
  const s = clone(s0);
  const st = findStaff(s, staffUid);
  const gain = clamp(Math.round((amount / Math.max(1, st.wage)) * 60), 3, 30);
  st.wage += Math.round(amount);
  st.satisfaction = clamp(st.satisfaction + gain, 0, 100);
  retainCheck(st);
  return s;
}

export function giveBonus(s0: GameState, staffUid: string, amount: number): GameState {
  if (!(amount > 0)) throw vErr("Số tiền thưởng không hợp lệ.");
  if (s0.money < amount) throw vErr("Không đủ tiền.");
  findStaff(s0, staffUid);
  const s = clone(s0);
  const st = findStaff(s, staffUid);
  s.money -= Math.round(amount);
  s.today.ledger.bonuses += Math.round(amount);
  st.satisfaction = clamp(st.satisfaction + clamp(Math.round((amount / Math.max(1, st.wage)) * 25), 2, 30), 0, 100);
  st.unpaidDays = 0;
  retainCheck(st);
  return s;
}

export function answerPromotion(s0: GameState, staffUid: string, accept: boolean): GameState {
  const st0 = findStaff(s0, staffUid);
  if (!st0.promotionRequested) throw vErr("Nhân viên này chưa xin lên trình độ.");
  const s = clone(s0);
  const st = findStaff(s, staffUid);
  st.promotionRequested = false;
  const cur = tierDef(st.role, st.tier);
  const next = tierDef(st.role, st.tier + 1);
  if (accept && next) {
    st.tier = next.tier as StaffTier;
    st.wage = Math.max(st.wage, next.baseWage);
    st.commissionPct = next.commissionPct;
    st.satisfaction = clamp(st.satisfaction + 15, 0, 100);
    st.exp = 0;
  } else {
    st.satisfaction = clamp(st.satisfaction - 15, 0, 100);
    st.exp = Math.floor((cur?.expToPromote ?? 10) * 0.7);
  }
  retainCheck(st);
  return s;
}

/** Day off (stored in `sickToday`): the staff member doesn't work today; reset next morning. */
export function setDayOff(s0: GameState, staffUid: string, off: boolean): GameState {
  findStaff(s0, staffUid);
  const s = clone(s0);
  findStaff(s, staffUid).sickToday = off;
  return s;
}

export const STAFF_STAR_BIAS = 0.3;
export const STAFF_STAR_SPREAD = 1.4;

/** Simulated stars for a KTV service around the tier's average. */
export function staffStars(s: GameState, st: Staff, rng: Rng): 1 | 2 | 3 {
  const avg = tierDef(st.role, st.tier)?.avgStars ?? 2;
  // Balance: slight upward bias + narrower spread (was avg ± 0.8, i.e. a Tập sự gave 1★ — and a complaint — half the time).
  // Balance pass 04/11/2026: bias 0.15 → 0.3 so a KTV + extra bed pays off (fewer 1★ complaints).
  // Tập sự ≈ 29% 1★ / 71% 2★ · Thạo việc ≈ 64% 2★ / 36% 3★ · Lành nghề ≈ 29% 2★ / 71% 3★.
  return clamp(Math.round(avg + STAFF_STAR_BIAS + (rng.next() - 0.5) * STAFF_STAR_SPREAD), 1, 3) as 1 | 2 | 3;
}

/** End-of-day staff processing: wages, satisfaction, quits, promotion requests. Mutates; returns notes. */
export function staffEndOfDay(s: GameState, commissionBase: Record<string, number>): string[] {
  const notes: string[] = [];
  const cfg = C().CONFIG;
  const upgrades = s.equipment.some((e) => (e.tier ?? 1) > 1 || e.id === "E05");
  const leaving: string[] = [];
  for (const st of s.staff) {
    const base = st.wage;
    const comm = Math.round(((commissionBase[st.uid] ?? 0) * st.commissionPct) / 100);
    const owed = base + comm;
    if (s.money >= owed) {
      s.money -= owed;
      s.today.ledger.wagesBase += base;
      s.today.ledger.wagesCommission += comm;
      st.unpaidDays = 0;
      st.satisfaction += 1;
    } else {
      st.unpaidDays += 1;
      st.satisfaction -= 15;
      notes.push(`Không đủ tiền trả lương cho ${st.name}.`);
    }
    if (st.servicesToday > 6) st.satisfaction -= 5 * (st.servicesToday - 6);
    if (s.reputation < 2.5) st.satisfaction -= 3;
    if (upgrades) st.satisfaction += 1;
    if (st.sickToday && st.servicesToday === 0) st.satisfaction += 2;
    st.satisfaction = clamp(Math.round(st.satisfaction), 0, 100);

    if (st.quitNoticeDaysLeft !== undefined) {
      retainCheck(st);
      if (st.quitNoticeDaysLeft !== undefined) {
        st.quitNoticeDaysLeft -= 1;
        if (st.quitNoticeDaysLeft <= 0) { leaving.push(st.uid); notes.push(`${st.name} đã nghỉ việc.`); continue; }
        notes.push(`${st.name} sẽ nghỉ sau ${st.quitNoticeDaysLeft} ngày nữa nếu không được giữ chân.`);
      }
    } else if (st.satisfaction < cfg.quitSatisfaction || st.unpaidDays >= 2) {
      st.quitNoticeDaysLeft = cfg.quitNoticeDays;
      notes.push(`${st.name} xin nghỉ việc (báo trước ${cfg.quitNoticeDays} ngày). Tăng lương hoặc thưởng để giữ chân.`);
    }
    const t = tierDef(st.role, st.tier);
    if (t && !st.promotionRequested && tierDef(st.role, st.tier + 1) && st.exp >= t.expToPromote && !(st.role === "ktv" && st.tier + 1 > (s.chapter === 1 && !s.freeMode ? 2 : 3))) {
      st.promotionRequested = true;
      notes.push(`${st.name} xin lên trình độ.`);
    }
  }
  s.staff = s.staff.filter((x) => !leaving.includes(x.uid));
  return notes;
}
