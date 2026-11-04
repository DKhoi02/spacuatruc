/**
 * Force-bar controllability with a simulated human (reaction 200–300 ms, jitter). See forceSim.ts.
 * - LIVE: the constants the treatment UI uses today (src/ui/treatment/scoring.ts) must stay playable for an attentive player.
 * - RECOMMENDED: the balance-pass proposal (light narrower = harder but fair, medium comfortable, strong reachable,
 *   slower needle, 0.4 s grace before an over-force counts as a safety error).
 */
import { describe, it, expect } from "vitest";
import { forceStats, HUMANS, type ForceParams } from "./forceSim";
import { FORCE_ZONES, FORCE_RISE_PER_S, FORCE_FALL_PER_S } from "@/ui/treatment/scoring";

const LIVE: ForceParams = { rise: FORCE_RISE_PER_S, fall: FORCE_FALL_PER_S, zones: FORCE_ZONES, overGrace: 0.25 };
export const RECOMMENDED_FORCE: ForceParams = {
  rise: 0.35, fall: 0.45, overGrace: 0.4,
  zones: { light: [0.12, 0.34], medium: [0.34, 0.64], strong: [0.64, 0.9] },
};
const N = 150;

describe("force bar (simulated human)", () => {
  it("live constants: an attentive player keeps the needle in zone ≥ 80% of the time", () => {
    for (const [f, sec] of [["light", 3], ["medium", 4], ["strong", 5]] as const) {
      expect(forceStats(LIVE, HUMANS.attentive, f, sec, N).meanScore, f).toBeGreaterThanOrEqual(80);
    }
  });

  it("recommended constants: medium comfortable, light harder but fair, strong reachable", () => {
    const P = RECOMMENDED_FORCE;
    const light = forceStats(P, HUMANS.casual, "light", 3, N);
    const medium = forceStats(P, HUMANS.casual, "medium", 4, N);
    const strong = forceStats(P, HUMANS.casual, "strong", 5, N);
    expect(medium.meanScore).toBeGreaterThanOrEqual(90);
    expect(light.meanScore).toBeLessThan(medium.meanScore - 5);
    expect(forceStats(P, HUMANS.attentive, "light", 3, N).pass80).toBeGreaterThanOrEqual(0.95);
    expect(light.meanScore).toBeGreaterThanOrEqual(78);
    expect(strong.meanScore).toBeGreaterThanOrEqual(85);
    expect(strong.meanTime).toBeLessThan(5 + 3); // approach + hold
    // a casual player rarely trips the over-force safety rule on light (sensitive) points
    expect(light.overRate).toBeLessThan(0.03);
  });
});
