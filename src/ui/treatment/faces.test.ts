import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import manifest from "@art/characters/characters.json";
import { CUSTOMER_CHARACTER_IDS, EXAMINER_CHARACTER_ID, REGULAR_CHARACTER_IDS, SPECIAL_CHARACTER_IDS } from "@/data";
import type { ViewData } from "@/ui/art/assets";
import { faceOverlaySvg, faceSvg, lookFor, makeWarp, warpViewData, type CharacterLike } from "./faces";

const art = (f: string) => readFileSync(fileURLToPath(new URL(`../../../art/views/${f}`, import.meta.url)), "utf8");
const V01 = JSON.parse(art("V01.json")) as ViewData;
const V01_SVG = art("V01.svg");
const V13_SVG = art("V13.svg");
const chars = (manifest as unknown as { characters: CharacterLike[] }).characters;
const ids = [...CUSTOMER_CHARACTER_IDS, ...REGULAR_CHARACTER_IDS, ...Object.values(SPECIAL_CHARACTER_IDS), EXAMINER_CHARACTER_ID];
const looks = ids.map((id) => lookFor(chars.find((c) => c.id === id), id));

describe("per-customer faces (V01)", () => {
  it("covers men and women, young to old, all face shapes and builds", () => {
    expect(new Set(looks.map((l) => l.male))).toEqual(new Set([true, false]));
    expect(looks.some((l) => l.age < 25) && looks.some((l) => l.age >= 60)).toBe(true);
    expect(new Set(looks.map((l) => l.shape)).size).toBe(5);
    expect(new Set(looks.map((l) => l.build))).toEqual(new Set(["normal", "fat", "thin", "hollow"]));
    expect(Math.min(...looks.map((l) => l.size))).toBeLessThan(0.93);
    expect(Math.max(...looks.map((l) => l.size))).toBeGreaterThan(1.05);
    expect(new Set(looks.map((l) => l.hair)).size).toBeGreaterThanOrEqual(9);
  });

  it("warp is invertible and keeps the anatomy in order", () => {
    for (const l of looks) {
      const w = makeWarp(l);
      for (const p of V01.points) {
        const px: [number, number] = [p.x * 1000, p.y * 1400];
        const back = w.inv(w.fwd(px));
        expect(Math.hypot(back[0] - px[0], back[1] - px[1]), `${l.key} ${p.id}`).toBeLessThan(0.05);
      }
      const d = warpViewData(V01, l);
      const by = (id: string, side: string) => d.points.find((p) => p.id === id && p.side === side)!;
      for (const p of d.points) {
        expect(p.x, `${l.key} ${p.id}`).toBeGreaterThan(0.05); expect(p.x).toBeLessThan(0.95);
        expect(p.y).toBeGreaterThan(0.05); expect(p.y).toBeLessThan(0.95);
        // Tolerance follows the face size but never collapses.
        const base = V01.points.find((q) => q.id === p.id && q.side === p.side)!;
        expect(p.r / base.r).toBeGreaterThan(0.88); expect(p.r / base.r).toBeLessThan(1.17);
        // Midline points stay on the midline.
        if (p.side === "center") expect(Math.abs(p.x - 0.5)).toBeLessThan(1e-3);
      }
      // Vertical order of the face is kept: hairline → brows → eyes → nose → mouth → chin.
      const chain = [by("GV24", "center"), by("GV29", "center"), by("BL1", "left"), by("GV26", "center"), by("CV24", "center")];
      for (let i = 1; i < chain.length; i++) expect(chain[i].y, l.key).toBeGreaterThan(chain[i - 1].y);
      // Left / right stay mirrored around the midline.
      for (const p of d.points.filter((q) => q.side === "left")) {
        const r = by(p.id, "right");
        if (r) { expect(Math.abs(p.x - 0.5 - (0.5 - r.x)), `${l.key} ${p.id}`).toBeLessThan(2e-3); expect(Math.abs(p.y - r.y)).toBeLessThan(1e-3); }
      }
      // Taps are recorded back on the canonical art.
      const t = by("ST6", "left");
      const u = d.unwarp!([t.x, t.y]);
      const c = V01.points.find((q) => q.id === "ST6" && q.side === "left")!;
      expect(Math.abs(u[0] - c.x) + Math.abs(u[1] - c.y)).toBeLessThan(2e-3);
    }
  });

  it("varies the faces noticeably", () => {
    const widths = looks.map((l) => {
      const d = warpViewData(V01, l);
      const st6 = d.points.filter((p) => p.id === "ST6");
      return Math.abs(st6[0].x - st6[1].x);
    });
    expect(Math.max(...widths) / Math.min(...widths)).toBeGreaterThan(1.25);
  });

  it("builds valid art for every customer (hair, details, warped overlay)", () => {
    for (const l of looks) {
      const s = faceSvg(V01_SVG, l);
      expect(s).not.toMatch(/NaN|undefined/);
      expect(s).toContain('<g id="hair-back"');
      expect(s.match(/<g id="hair"/g)?.length).toBe(1);
      expect(s.startsWith("<svg") && s.trim().endsWith("</svg>")).toBe(true);
      // every layer group the treatment toggles is still there
      for (const g of ["landmarks", "muscles", "guides", "state-eyes-open", "expr-pain"]) expect(s).toContain(`id="${g}"`);
      const o = faceOverlaySvg(V13_SVG, l);
      expect(o).not.toMatch(/NaN/);
    }
  });
});
