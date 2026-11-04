/**
 * DEV ONLY (?mock): crude stand-ins for src/core/api.ts so every screen can be clicked through
 * before the core agent lands. Never imported in production builds (guarded by import.meta.env.DEV).
 */
import type { Api, Bill } from "@/ui/api";
import type { Customer, GameState, ItemKey, ServiceRecord, TaskItem, TreatmentResult, ChapterNo, DaySummary } from "@/core/types";
import { ACUPOINTS, CHAPTERS, EQUIPMENT, MOCK_CONFIG as CFG, SERVICES, STAFF_TIERS, SUPPLIES } from "./mockContent";
import { emptyLedger, mockArrivals, mockCustomer, mockGameState } from "./mockState";

const clone = <T,>(x: T): T => structuredClone(x);
const svc = (id: string) => SERVICES.find((s) => s.id === id)!;
const key = (i: TaskItem | { kind: string; id: string }) => (i.kind === "point" ? "P:" : i.kind === "muscle" ? "M:" : i.kind === "zone" ? "Z:" : "S:") + i.id;
const fail = (msg: string): never => { throw new Error(msg); };
const seats = (s: GameState) => 2 + s.equipment.filter((e) => e.id === "E02" || e.id === "chair-extra").length;

function score(r: TreatmentResult) {
  const items = r.items.filter((i) => !i.skipped);
  const avg = items.length ? items.reduce((a, i) => a + i.positionScore, 0) / items.length : 100;
  const safetyErrors = r.items.reduce((a, i) => a + i.safetyErrors, 0);
  const sc = Math.max(0, Math.round(avg - safetyErrors * 30));
  const stars: 1 | 2 | 3 = safetyErrors ? 1 : sc >= 90 ? 3 : sc >= 70 ? 2 : 1;
  return { score: sc, stars, safetyErrors };
}

function updateMastery(s: GameState, r: TreatmentResult) {
  for (const it of r.items) {
    if (it.item.kind === "step") continue;
    const k = key(it.item);
    const m = s.mastery[k] ?? { level: 0, streak: 0, attempts: 0, correct: 0, lastSeenDay: s.day, dueDay: s.day + 1, intervalIdx: 0 };
    const ok = it.positionScore >= 70 && it.attempts === 1;
    s.mastery[k] = { ...m, attempts: m.attempts + 1, correct: m.correct + (ok ? 1 : 0), lastSeenDay: s.day, level: Math.min(4, Math.max(0, m.level + (ok ? (m.streak >= 2 ? 1 : 0) : -1))) as 0, streak: ok ? (m.streak >= 2 ? 0 : m.streak + 1) : 0 };
  }
}

export const mockApi: Partial<Api> = {
  newGame: (name) => {
    const s = mockGameState(name);
    return { ...s, day: 1, chapterDay: 1, money: CFG.startMoney, reputation: 3, mastery: {}, staff: [], history: [], seenTips: [],
      inventory: { I01: 10, I02: 10, I03: 0, I04: 0, I05: 0, I06: 0, I07: 0, I08: 0 },
      equipment: s.equipment.slice(0, 1).map((e) => ({ ...e, usesLeft: EQUIPMENT.find((d) => d.id === e.id)!.maxUses })),
      unlocked: { services: ["ch1-basic"], features: ["billing"], supplies: ["I01", "I02"], equipment: [] } };
  },
  migrateSave: (raw) => raw as GameState,
  getMorningBrief: (s) => {
    const day = CHAPTERS[0].days.find((d) => d.chapterDay === s.chapterDay) ?? CHAPTERS[0].days[5];
    return { expectedCustomers: day.customers, likelyServices: s.unlocked.services, tips: day.tips, rentDueInDays: s.rent.nextDueDay - s.day,
      event: s.day % 3 === 0 ? { title: "Mất điện buổi sáng", description: "Máy xông mặt không dùng được đến trưa." } : undefined };
  },
  openShop: (s) => { const n = clone(s); n.today.phase = "open"; n.today.arrivals = mockArrivals();
    if (s.chapterDay >= 7 && !s.chaptersPassed.includes(s.chapter)) n.today.arrivals.unshift(mockCustomer("anh-khoi", "Anh Khôi", "ch1-eye", [], { special: "examiner", patience: 9999, checkedIn: true })); n.today.reputationStart = s.reputation; return n; },
  processArrivals: (s) => {
    const n = clone(s);
    const arrived = n.today.arrivals.filter((c) => c.arriveAt <= n.today.clock);
    n.today.arrivals = n.today.arrivals.filter((c) => c.arriveAt > n.today.clock);
    if (!n.today.queue.length && !n.today.inService.length && n.today.arrivals.length && !arrived.length) arrived.push(n.today.arrivals.shift()!);
    for (const c of arrived) {
      if (n.today.queue.length >= Math.max(2, seats(n))) { n.today.walkouts.push(c.name); n.reputation -= 0.05; } else n.today.queue.push(c);
    }
    return n;
  },
  canServe: (s, id) => {
    const c = s.today.queue.find((q) => q.id === id);
    if (!c) return { ok: false, reason: "Khách không còn trong hàng chờ." };
    if (s.today.inService.length) return { ok: false, reason: "Không còn giường trống." };
    const d = svc(c.serviceId);
    for (const [sid, n] of Object.entries(d.supplies)) if ((s.inventory as Record<string, number>)[sid] < (n ?? 0)) return { ok: false, reason: `Hết ${SUPPLIES.find((x) => x.id === sid)?.name}.` };
    return { ok: true, bedSlot: "bed-1" };
  },
  startPlayerService: (s, id) => {
    const n = clone(s); const c = n.today.queue.find((q) => q.id === id)!;
    for (const [sid, k] of Object.entries(svc(c.serviceId).supplies)) (n.inventory as Record<string, number>)[sid] -= k ?? 0;
    n.today.inService.push({ customerId: id, performer: "player", bedSlot: "bed-1", startAt: n.today.clock, endsAt: n.today.clock + c.durationMin });
    return n;
  },
  completePlayerService: (s, r) => {
    const n = clone(s); const c = n.today.queue.find((q) => q.id === r.customerId)!;
    n.today.queue = n.today.queue.filter((q) => q.id !== c.id);
    n.today.inService = n.today.inService.filter((x) => x.customerId !== c.id);
    n.today.clock += c.durationMin;
    n.today.servicesCompleted++;
    const { score: sc, stars, safetyErrors } = score(r);
    const d = svc(c.serviceId); const mult = CFG.starMultiplier[stars];
    const price = Math.round(d.basePrice * (n.priceMultiplier[d.id] ?? 1) * mult); const tip = stars === 3 ? 20000 : stars === 2 ? 10000 : 0;
    const bill: Bill = { serviceName: d.name, basePrice: d.basePrice, starMultiplier: mult, price, tip, discount: 0, total: price + tip, stars, score: sc };
    n.money += bill.total; n.today.ledger.revenuePlayer += price; n.today.ledger.tips += tip;
    n.reputation = Math.min(5, n.reputation + (stars === 3 ? 0.05 : stars === 1 ? -0.05 : 0) - safetyErrors * 0.2);
    updateMastery(n, r);
    const record: ServiceRecord = { customerId: c.id, customerName: c.name, serviceId: d.id, performer: "player", stars, score: sc, price, tip, discount: 0, safetyErrors };
    n.today.records.push(record);
    let complaint: { reason: string } | undefined;
    if (safetyErrors || stars === 1) {
      complaint = { reason: safetyErrors ? "Ui, chị ấn vào mắt em!" : "Làm chưa kỹ lắm em ơi." };
      n.today.complaints.push({ id: `cp${Date.now()}`, customerId: c.id, customerName: c.name, reason: complaint.reason, refundIfApologize: Math.round(price * 0.3) });
    }
    return { state: n, record, bill, complaint };
  },
  assignToStaff: (s, id, uid) => {
    const n = clone(s); const c = n.today.queue.find((q) => q.id === id)!; const st = n.staff.find((x) => x.uid === uid)!;
    n.today.queue = n.today.queue.filter((q) => q.id !== id); st.servicesToday++; st.exp++;
    const service = { customerId: c.id, performer: uid, bedSlot: "bed-2", startAt: n.today.clock, endsAt: n.today.clock + c.durationMin };
    n.today.inService.push(service);
    return { state: n, service };
  },
  sendAway: (s, id) => { const n = clone(s); const c = n.today.queue.find((q) => q.id === id); n.today.queue = n.today.queue.filter((q) => q.id !== id); if (c) n.today.walkouts.push(c.name); n.reputation -= 0.05; return n; },
  resolveComplaint: (s, id, choice) => {
    const n = clone(s); const c = n.today.complaints.find((x) => x.id === id)!;
    n.today.complaints = n.today.complaints.filter((x) => x.id !== id);
    if (choice === "apologize-refund") { n.money -= c.refundIfApologize; n.today.ledger.refunds += c.refundIfApologize; n.reputation -= 0.05; } else n.reputation -= 0.1;
    return n;
  },
  isDayOver: (s) => s.today.phase === "open" && !s.today.arrivals.length && !s.today.queue.length && !s.today.inService.length,
  closeDay: (s) => {
    const n = clone(s); const L = n.today.ledger;
    L.electricity += CFG.baseDailyElectricity; L.supplies += 15000 * n.today.records.length; L.depreciation += 5000 * n.today.records.length;
    for (const st of n.staff) { L.wagesBase += st.wage; L.wagesCommission += Math.round(L.revenueStaff * st.commissionPct / 100); }
    if (n.day >= n.rent.nextDueDay) { L.rent = n.rent.amount; n.rent.nextDueDay += 7; }
    const cash = L.electricity + L.wagesBase + L.wagesCommission + L.rent; n.money -= cash;
    const revenue = L.revenuePlayer + L.revenueStaff + L.tips + L.rewards;
    const profit = revenue - (L.supplies + L.electricity + L.repairs + L.refunds + L.rent + L.wagesBase + L.wagesCommission + L.severance + L.bonuses) - L.depreciation;
    const practiced = new Map<ItemKey, { correct: number; total: number }>();
    const summary: DaySummary = {
      day: n.day, chapter: n.chapter, chapterDay: n.chapterDay, served: n.today.records.length,
      servedByStaff: n.today.records.filter((r) => r.performer !== "player").length, walkouts: n.today.walkouts.length, complaints: 1,
      reputationDelta: Math.round((n.reputation - n.today.reputationStart) * 100) / 100, ledger: L, profit, moneyEnd: n.money,
      itemsPracticed: [...practiced].map(([k, v]) => ({ key: k, ...v })).concat([{ key: "P:GB1", correct: 4, total: 4 }, { key: "P:ST2", correct: 2, total: 4 }]),
      toReview: ["P:ST2", "P:BL2"], notes: [`Tiền thuê đến hạn sau ${n.rent.nextDueDay - n.day} ngày`],
    };
    n.today.phase = "summary"; n.history = [...n.history, summary].slice(-30);
    return { state: n, summary };
  },
  startNextDay: (s) => { const n = clone(s); n.day++; n.chapterDay++; n.today = { phase: "prep", clock: 540, servicesCompleted: 0, arrivals: [], queue: [], inService: [], cleaning: [], records: [], walkouts: [], complaints: [], ledger: emptyLedger(), reputationStart: n.reputation }; n.staff.forEach((x) => (x.servicesToday = 0)); return n; },
  itemKey: (i) => key(i),
  getMastery: (s, k) => s.mastery[k] ?? { level: 0, streak: 0, attempts: 0, correct: 0, lastSeenDay: 0, dueDay: 0, intervalIdx: 0 },
  hintLevelFor: (s, k, exam) => (exam ? 3 : (s.mastery[k]?.level ?? 0)),
  buildTreatmentConfig: (s, c) => ({ customer: c, service: svc(c.serviceId), chapter: s.chapter, useForceBar: s.chapter >= 2, usePatience: s.chapter >= 2, hintLevel: (k) => s.mastery[k]?.level ?? 0, examMode: c.special === "examiner" }),
  dueItems: (s, n) => Object.keys(s.mastery).slice(0, n),
  buySupply: (s, id, packs) => { const d = SUPPLIES.find((x) => x.id === id)!; const cost = d.packPrice * packs; if (s.money < cost) fail("Không đủ tiền."); const n = clone(s); n.money -= cost; n.inventory[id] += d.packSize * packs; n.today.ledger.purchases += cost; return n; },
  buyEquipment: (s, id, slot) => { const d = EQUIPMENT.find((x) => x.id === id)!; if (s.money < d.price) fail("Không đủ tiền."); const n = clone(s); n.money -= d.price; n.equipment.push({ uid: `eq${Date.now()}`, id, usesLeft: d.maxUses, slot }); return n; },
  repairEquipment: (s, uid) => { const n = clone(s); const e = n.equipment.find((x) => x.uid === uid)!; const d = EQUIPMENT.find((x) => x.id === e.id)!; const cost = d.price * 0.3; if (n.money < cost) fail("Không đủ tiền."); n.money -= cost; e.usesLeft = d.maxUses; n.today.ledger.repairs += cost; return n; },
  setPriceMultiplier: (s, id, m) => ({ ...s, priceMultiplier: { ...s.priceMultiplier, [id]: m } }),
  buyExpansion: (s) => ({ ...s, shopLevel: s.shopLevel + 1, money: s.money - (CFG.shopLevels[s.shopLevel + 1]?.cost ?? 0) }),
  upgradeEquipment: (s, uid) => { const n = clone(s); const e = n.equipment.find((x) => x.uid === uid)!; e.tier = Math.min(3, (e.tier ?? 1) + 1) as 2 | 3; return n; },
  buyAds: (s, d) => ({ ...s, adsDaysLeft: s.adsDaysLeft + d, money: s.money - d * CFG.adsCostPerDay }),
  createCombo: (s, name, services, price) => ({ ...s, combos: [...s.combos, { id: `cb${Date.now()}`, name, services, price }] }),
  refreshCandidates: (s, paid) => ({ ...s, money: s.money - (paid ? CFG.postJobFee : 0), candidates: [{ characterId: "ktv-vy", name: "Vy", role: "ktv", tier: 1, wage: 100000, commissionPct: 10 }, { characterId: "ktv-hung", name: "Hùng", role: "ktv", tier: 2, wage: 150000, commissionPct: 15 }] }),
  hire: (s, i) => { const c = s.candidates[i]; return { ...s, candidates: s.candidates.filter((_, j) => j !== i), staff: [...s.staff, { uid: `st${Date.now()}`, ...c, satisfaction: 70, exp: 0, servicesToday: 0, promotionRequested: false, unpaidDays: 0, hiredDay: s.day }] }; },
  fire: (s, uid) => { const st = s.staff.find((x) => x.uid === uid)!; return { ...s, money: s.money - st.wage * 3, staff: s.staff.filter((x) => x.uid !== uid) }; },
  giveRaise: (s, uid, a) => ({ ...s, staff: s.staff.map((x) => (x.uid === uid ? { ...x, wage: x.wage + a, satisfaction: Math.min(100, x.satisfaction + 10) } : x)) }),
  giveBonus: (s, uid, a) => ({ ...s, money: s.money - a, staff: s.staff.map((x) => (x.uid === uid ? { ...x, satisfaction: Math.min(100, x.satisfaction + 8) } : x)) }),
  answerPromotion: (s, uid, ok) => ({ ...s, staff: s.staff.map((x) => (x.uid === uid ? { ...x, promotionRequested: false, tier: ok ? (Math.min(3, x.tier + 1) as 1) : x.tier } : x)) }),
  setDayOff: (s, uid, off) => ({ ...s, staff: s.staff.map((x) => (x.uid === uid ? { ...x, sickToday: off } : x)) }),
  staffCanPerform: (s, id) => (svc(id).pool.points ?? []).filter((p) => s.mastery[`P:${p}`]).every((p) => (s.mastery[`P:${p}`]?.level ?? 0) >= 3) && id !== "ch1-eye",
  isExamDay: (s) => s.chapterDay >= 7 && !s.chaptersPassed.includes(s.chapter),
  buildExam: () => [mockCustomer("anh-khoi", "Anh Khôi", "ch1-eye", ACUPOINTS.flatMap((a) => a.sides.map((side) => ({ kind: "point" as const, id: a.id, side }))), { special: "examiner" })],
  finishExam: (s, results) => {
    const sc = Math.round(results.reduce((a, r) => a + score(r).score, 0) / Math.max(1, results.length));
    const passed = sc >= 80 && results.every((r) => score(r).safetyErrors === 0);
    const n = clone(s);
    n.today.queue = n.today.queue.filter((c) => c.special !== "examiner");
    if (passed) { n.chaptersPassed.push(s.chapter); n.money += 500000; n.reputation += 0.2; n.chapter = Math.min(8, s.chapter + 1) as ChapterNo; n.chapterDay = 1; }
    return { state: n, passed, score: sc, weakItems: passed ? [] : ["P:ST1", "P:BL1"] };
  },
  dailyChallenge: (s) => mockCustomer("khach-linh", "Linh", "ch1-eye", ACUPOINTS.slice(0, 5).map((a) => ({ kind: "point", id: a.id, side: a.sides[0] })), { id: `ch-${s.day}` }),
  finishChallenge: (s, r) => { const sc = score(r).score; const n = { ...s, challenge: { lastDay: s.day, streak: s.challenge.streak + 1 }, money: s.money + 50000 }; return { state: n, score: sc, streak: n.challenge.streak, reward: 50000 }; },
  renameShop: (s, name) => ({ ...s, shopName: name }),
  serviceById: (id) => svc(id),
};

export { STAFF_TIERS };
