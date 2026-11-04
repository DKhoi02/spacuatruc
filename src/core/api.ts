/**
 * CORE API — implemented in modules under src/core/ and re-exported here.
 * All functions are PURE: they never mutate the input state; they return a new state.
 * UI calls these and persists the returned state.
 *
 * Invalid actions (not enough money, feature locked, wrong phase...) throw an Error with a Vietnamese message
 * that the UI can show directly.
 */
import type {
  GameState, ChapterNo, Customer, ItemKey, MasteryRecord, ServiceId, SupplyId, EquipmentId,
  TreatmentResult, TaskItem, DaySummary, ServiceRecord, TreatmentConfig, ServiceDef, ChapterDef, InService, Bill, LastExamReview,
} from "./types";
import * as St from "./state";
import * as Day from "./day";
import * as Sc from "./scoring";
import * as Ma from "./mastery";
import * as Ec from "./economy";
import * as Sf from "./staff";
import * as Ch from "./chapters";
import * as Tk from "./tickets";
import * as Ex from "./exam";

// ── Lifecycle ──
export function newGame(shopName: string, seed?: number): GameState { return St.newGame(shopName, seed); }
export function migrateSave(raw: unknown): GameState { return St.migrateSave(raw); }

// ── Day flow ──
/** Morning: forecast + tips + random event. Phase must be "prep". */
export function getMorningBrief(s: GameState): { expectedCustomers: [number, number]; likelyServices: ServiceId[]; tips: string[]; rentDueInDays: number; event?: { title: string; description: string } } { return Day.getMorningBrief(s); }
/** prep → open: generates today's arrivals (tickets from learned items, review items, regulars, specials, exam examiner). */
export function openShop(s: GameState): GameState { return Day.openShop(s); }
/** Processes everything due at the current game minute (arrivals, KTV/cleaner done, walkouts). No time passes. */
export function processArrivals(s: GameState): GameState { return Day.processArrivals(s); }
/** "Chờ": jump the clock to the next event (arrival, KTV finished, cleaner finished). Throws when nothing is pending. */
export function advanceTime(s: GameState): GameState { return Day.advanceTime(s); }
/** The event "Chờ" would jump to, with a Vietnamese label ("khách tiếp theo", "KTV Lan làm xong"...). */
export function nextEvent(s: GameState): { at: number; kind: "arrival" | "staff" | "cleaning"; label: string } | undefined { return Day.nextEvent(s); }
/** Player greets a waiting customer (5 game minutes). Needed before serving unless a receptionist works today. */
export function checkIn(s: GameState, customerId: string): GameState { return Day.checkIn(s, customerId); }
/** Player cleans a dirty station (10 game minutes). */
export function cleanStation(s: GameState, stationUid: string): GameState { return Day.cleanStation(s, stationUid); }
/** Nobody waiting or in service (later arrivals would just not come): "Đóng cửa sớm" allowed. */
export function canCloseEarly(s: GameState): boolean { return Day.canCloseEarly(s); }
/** Can a customer be served now? Returns reason if not (not checked in, no free clean bed, missing supplies/equipment, ...). bedSlot = OwnedEquipment.uid of the station. */
export function canServe(s: GameState, customerId: string): { ok: true; bedSlot: string } | { ok: false; reason: string } { return Day.canServe(s, customerId); }
/** Player starts serving a queued customer: consumes supplies, marks bed busy. */
export function startPlayerService(s: GameState, customerId: string): GameState { return Day.startPlayerService(s, customerId); }
/** Assign a checked-in customer to a free KTV: supplies used now, bed busy for duration × tier factor; the record/bill appear when the KTV finishes (as the clock passes). */
export function assignToStaff(s: GameState, customerId: string, staffUid: string): { state: GameState; service: InService } { return Day.assignToStaff(s, customerId, staffUid); }
/** Game minutes a KTV of this tier needs for the customer. */
export function staffMinutes(c: Customer, tier: 1 | 2 | 3): number { return Day.staffMinutes(c, tier); }
/** Bill of a service finished today (player or KTV), by customer id. */
export function billOf(s: GameState, customerId: string): Bill | undefined { return Day.billOf(s, customerId); }
/** Player finished a treatment: the clock jumps by the service duration (events processed), then scoring → stars → bill, mastery, reputation, complaint; the bed needs cleaning. */
export function completePlayerService(s: GameState, result: TreatmentResult): { state: GameState; record: ServiceRecord; bill: Bill; complaint?: { reason: string } } { return Day.completePlayerService(s, result); }
/** Player declines / sends away a queued customer (counts as walkout). */
export function sendAway(s: GameState, customerId: string): GameState { return Day.sendAway(s, customerId); }
export function resolveComplaint(s: GameState, complaintId: string, choice: "apologize-refund" | "apologize"): GameState { return Day.resolveComplaint(s, complaintId, choice); }
/** True when no arrivals left, queue empty and nothing in service. */
export function isDayOver(s: GameState): boolean { return Day.isDayOver(s); }
/** open → summary: wages, electricity, depreciation, rent (on due day), staff satisfaction/quit, summary. */
export function closeDay(s: GameState): { state: GameState; summary: DaySummary } { return Day.closeDay(s); }
/** summary → next day prep: day++, chapterDay++, candidates refresh, events roll, chapter reset-on-bankrupt rule. */
export function startNextDay(s: GameState): GameState { return Day.startNextDay(s); }

export type { Bill };

// ── Scoring (also used live by the treatment UI) ──
/** distance and r in the same normalized units. */
export function scorePosition(distance: number, r: number): { score: number; grade: "perfect" | "good" | "miss" } { return Sc.scorePosition(distance, r); }
export function itemScore(r: { positionScore: number; forceScore?: number; swipeScore?: number }): number { return Sc.itemScore(r); }
export function serviceScore(result: TreatmentResult): { score: number; stars: 1 | 2 | 3; safetyErrors: number } { return Sc.serviceScore(result); }
/** Tolerance radius after mastery scaling (level 4 → ×0.7). */
export function toleranceRadius(r: number, level: number): number { return Sc.toleranceRadius(r, level); }

// ── Mastery / learning ──
export function itemKey(item: TaskItem | { kind: "point" | "muscle" | "zone"; id: string }): ItemKey { return Ma.itemKey(item); }
export function getMastery(s: GameState, key: ItemKey): MasteryRecord { return Ma.getMastery(s, key); }
export function hintLevelFor(s: GameState, key: ItemKey, examMode: boolean): 0 | 1 | 2 | 3 | 4 { return Ma.hintLevelFor(s, key, examMode); }
export function buildTreatmentConfig(s: GameState, customer: Customer): TreatmentConfig { return Ma.buildTreatmentConfig(s, customer); }
/** Items due for review (free mode SRS + weak items). */
export function dueItems(s: GameState, limit: number): ItemKey[] { return Ma.dueItems(s, limit); }

// ── Store ──
export function buySupply(s: GameState, id: SupplyId, packs: number): GameState { return Ec.buySupply(s, id, packs); }
export function buyEquipment(s: GameState, id: EquipmentId, slot?: string): GameState { return Ec.buyEquipment(s, id, slot); }
export function repairEquipment(s: GameState, uid: string): GameState { return Ec.repairEquipment(s, uid); }
/** GAME_DESIGN §12.2: raise an owned item one tier (Thường → Tốt → Cao cấp). Cost: upgradeCost(e). */
export function upgradeEquipment(s: GameState, uid: string): GameState { return Ec.upgradeEquipment(s, uid); }
export function setPriceMultiplier(s: GameState, serviceId: ServiceId, mult: number): GameState { return Ec.setPriceMultiplier(s, serviceId, mult); }
/** Buys the next shop level (GAME_DESIGN §12.1). */
export function buyExpansion(s: GameState): GameState { return Ec.buyExpansion(s); }
/** Next shop level and whether it can be bought now (undefined: already at the top level). */
export function nextShopLevel(s: GameState): ReturnType<typeof Ec.nextShopLevel> { return Ec.nextShopLevel(s); }
export function buyAds(s: GameState, days: number): GameState { return Ec.buyAds(s, days); }
export function createCombo(s: GameState, name: string, services: ServiceId[], price: number): GameState { return Ec.createCombo(s, name, services, price); }

// ── Staff ──
export function refreshCandidates(s: GameState, paid: boolean): GameState { return Sf.refreshCandidates(s, paid); }
export function hire(s: GameState, candidateIndex: number): GameState { return Sf.hire(s, candidateIndex); }
export function fire(s: GameState, staffUid: string): GameState { return Sf.fire(s, staffUid); }
export function giveRaise(s: GameState, staffUid: string, amount: number): GameState { return Sf.giveRaise(s, staffUid, amount); }
export function giveBonus(s: GameState, staffUid: string, amount: number): GameState { return Sf.giveBonus(s, staffUid, amount); }
export function answerPromotion(s: GameState, staffUid: string, accept: boolean): GameState { return Sf.answerPromotion(s, staffUid, accept); }
export function setDayOff(s: GameState, staffUid: string, off: boolean): GameState { return Sf.setDayOff(s, staffUid, off); }
/** Services a KTV can perform now (player mastery ≥3 on every item of the service pool that has been learned). */
export function staffCanPerform(s: GameState, serviceId: ServiceId): boolean { return Sf.staffCanPerform(s, serviceId); }

// ── Chapters / exam / free mode ──
export function isExamDay(s: GameState): boolean { return Ch.isExamDay(s); }
/** Builds the examiner (anh Khôi) customers for exam (1 session, or 3 for chapter 8). */
export function buildExam(s: GameState): Customer[] { return Tk.buildExam(s); }
/** Applies exam results: pass → chaptersPassed, reward, unlock next chapter (ch8 → freeMode). */
/** Exam review for anh Khôi's feedback: every item below 100 / with an error, worst first. */
export function examReview(results: TreatmentResult[], customers: Customer[]): Ex.ReviewEntry[] { return Ex.examReview(results, customers); }
/** Practice-only customers (wrong exam items) — no money, reputation or mastery effects. */
export function practiceCustomers(entries: Ex.ReviewEntry[], day: number): Customer[] { return Ex.practiceCustomers(entries, day); }
/** Rebuilds the review (entries + total) from the persisted `GameState.lastExamReview`. */
export function reviewOf(last: LastExamReview): { entries: Ex.ReviewEntry[]; total: number } { return Ex.reviewOf(last); }
/** The stored failed exam of the current chapter (offer "Xem lại nhận xét" before the retry), else undefined. */
export function retryReview(s: GameState): LastExamReview | undefined { return Ex.retryReview(s); }
export type { ReviewEntry, ReviewIssue } from "./exam";
export function finishExam(s: GameState, results: TreatmentResult[]): { state: GameState; passed: boolean; score: number; weakItems: ItemKey[] } { return Ex.finishExam(s, results); }
export function dailyChallenge(s: GameState): Customer { return Tk.dailyChallenge(s); }
export function finishChallenge(s: GameState, result: TreatmentResult): { state: GameState; score: number; streak: number; reward: number } { return Ex.finishChallenge(s, result); }

// ── Settings ──
export function renameShop(s: GameState, name: string): GameState { return St.renameShop(s, name); }

// ── Lookups ──
export function serviceById(id: ServiceId): ServiceDef { return St.serviceById(id); }
export function chapterInfo(no: ChapterNo): ChapterDef { return Ch.chapterInfo(no); }

// ── Extras (not in the original contract, safe to use) ──
/** Why a customer walked out today: { key, text } (Vietnamese). */
export const walkoutReason = Day.walkoutReason;
export { exportSave, parseSaveFile, saveFileName } from "./save-format";
/** Scene slots an equipment item can be placed in (empty → no slot limit). */
export { slotsFor, roomOfSlot, shopLevelDef, maxShopLevel } from "./equipment";
/** Equipment tiers (GAME_DESIGN §12.2): tier, max uses, value, next upgrade cost, premiums. */
export { tierOf, tierName, hasTiers, maxUsesOf, tierValue, upgradeCost, tierPricePct, tierTipPct, tierComplaint } from "./equipment";
export { repairCost, billPremium } from "./economy";
/** The Customer object of someone currently being treated (DayState.inService only stores ids). */
export const servingCustomer = Day.servingCustomer;
