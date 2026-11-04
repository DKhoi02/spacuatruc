import { expect } from "vitest";
import { acupoint, serviceDef, equipmentDef, supplyDef } from "../content";
import * as api from "../api";
import type { Customer, DaySummary, GameState, SupplyId, TreatmentResult } from "../types";
import { botDay } from "./bot";

export function goodResult(c: Customer): TreatmentResult {
  const pregnant = c.health?.id === "pregnant";
  return {
    customerId: c.id,
    items: c.items.map((item) => {
      const flag = item.kind === "point" ? acupoint(item.id)?.pregnancy : undefined;
      if (pregnant && flag) return { item, positionScore: 0, attempts: 0, safetyErrors: 0, skipped: true };
      return { item, positionScore: 100, forceScore: 100, attempts: 1, safetyErrors: 0 };
    }),
    patienceLeft: 1,
  };
}

export function morningShopping(s: GameState): GameState {
  for (const sid of s.unlocked.services) {
    const svc = serviceDef(sid)!;
    for (const eid of svc.requiresEquipment) {
      if (s.equipment.some((e) => e.id === eid) || !s.unlocked.equipment.includes(eid)) continue;
      if (s.money >= (equipmentDef(eid)?.price ?? Infinity) + 800_000) s = api.buyEquipment(s, eid);
    }
  }
  for (const e of s.equipment) {
    const d = equipmentDef(e.id)!;
    if (e.usesLeft < d.maxUses * 0.25 && s.money > 1_500_000) s = api.repairEquipment(s, e.uid);
  }
  // grow: second bed + one KTV once hiring opens
  if (s.candidates.some((c) => c.role === "ktv") && !s.staff.some((x) => x.role === "ktv") && s.money > 4_000_000) {
    if (s.equipment.filter((e) => e.id === "E01").length < 2 && s.unlocked.equipment.includes("E01")) s = api.buyEquipment(s, "E01");
    s = api.hire(s, s.candidates.findIndex((c) => c.role === "ktv"));
  }
  for (const st of s.staff) if (st.promotionRequested) s = api.answerPromotion(s, st.uid, true);
  const need = new Set<SupplyId>();
  for (const sid of s.unlocked.services) for (const k of Object.keys(serviceDef(sid)!.supplies) as SupplyId[]) need.add(k);
  for (const id of need) {
    if (!s.unlocked.supplies.includes(id)) continue;
    while ((s.inventory[id] ?? 0) < 20 && s.money > (supplyDef(id)?.packPrice ?? 0) + 300_000) {
      try { s = api.buySupply(s, id, 1); } catch { break; }
    }
  }
  return s;
}

export function playDay(s: GameState, log: string[], onSummary?: (sum: DaySummary, st: GameState) => void): GameState {
  s = morningShopping(s);
  api.getMorningBrief(s);
  s = api.openShop(s);
  s = botDay(s, {
    treat: (st, c) => {
      const cfg = api.buildTreatmentConfig(st, c);
      expect(cfg.service.name).toBeTruthy();
      return goodResult(c);
    },
    exam: (st) => {
      const sessions = api.buildExam(st);
      for (const x of sessions) api.buildTreatmentConfig(st, x);
      const out = api.finishExam(st, sessions.map(goodResult));
      log.push(`day ${st.day} exam ch${st.chapter}: ${out.passed ? "PASS" : "FAIL"} ${out.score}`);
      return out.state;
    },
    // the KTV takes a customer when someone else is waiting too
    allowKtv: (st) => st.today.queue.length > 1,
  });
  expect(s.today.records.every((r) => r.performer !== "player" || r.safetyErrors === 0)).toBe(true);
  expect(api.isDayOver(s)).toBe(true);
  const { state, summary } = api.closeDay(s);
  expect(summary.day).toBe(s.day);
  onSummary?.(summary, state);
  return api.startNextDay(state);
}
