import { describe, it, expect } from "vitest";
import { makeEnvelope, unwrapEnvelope } from "./saveFile";
import type { GameState } from "@/core/types";

const state = { schemaVersion: 1, shopName: "Tiệm Đẹp", chapter: 2, day: 9, money: 1234000 } as unknown as GameState;

describe("save envelope", () => {
  it("wraps with metadata and unwraps back", () => {
    const env = makeEnvelope(state, new Date("2026-11-04T10:00:00Z"));
    expect(env.schemaVersion).toBe(1);
    expect(env.updatedAt).toBe("2026-11-04T10:00:00.000Z");
    expect(typeof env.gameVersion).toBe("string");
    expect(unwrapEnvelope(env)).toBe(state);
  });
  it("accepts a bare state and rejects junk", () => {
    expect(unwrapEnvelope(state)).toBe(state);
    expect(unwrapEnvelope(null)).toBeNull();
    expect(unwrapEnvelope({ foo: 1 })).toBeNull();
    expect(unwrapEnvelope("x")).toBeNull();
  });
});
