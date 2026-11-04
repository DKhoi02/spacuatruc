import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import type { GameState, ServiceId } from "@/core/types";
import { api } from "./api";
import type { SceneSlots } from "./art/assets";
import { areaScene, areasOf, footScene, placementsFor, shelfStock, washScene } from "./sceneState";

const slotsOf = (scene: string) => JSON.parse(readFileSync(resolve(__dirname, `../../art/shop/${scene}.slots.json`), "utf8")) as SceneSlots;
const game = (patch: (s: GameState) => void = () => {}): GameState => { const s = api.newGame("Test", 1); patch(s); return s; };

describe("scene state: wash / foot areas and stocked shelves", () => {
  it("picks the wash / foot scene by shop level (L0–1 base, L2, L3)", () => {
    expect([0, 1, 2, 3].map(washScene)).toEqual(["S04", "S04", "S04-L2", "S04-L3"]);
    expect([0, 1, 2, 3].map(footScene)).toEqual(["S05", "S05", "S05-L2", "S05-L3"]);
    expect(areaScene("room2", 3)).toBe("S06-L3");
  });

  it("shows the wash / foot tabs once their chairs are owned or their services unlocked", () => {
    expect(areasOf(game())).toEqual(["room1"]);
    expect(areasOf(game((s) => { s.unlocked.services.push("goi-dau-thuong" as ServiceId); }))).toEqual(["room1", "wash"]);
    expect(areasOf(game((s) => { s.shopLevel = 2; s.equipment.push({ uid: "f1", id: "E10", usesLeft: 10, tier: 1, slot: "footbath-chair-1" }); }))).toEqual(["room1", "room2", "foot"]);
  });

  it("shelf look follows stock: empty / low / some / full", () => {
    const s = game((g) => { g.unlocked.services = ["an-huyet-co-ban" as ServiceId]; }); // uses I02 ×2 per service
    const at = (n: number) => shelfStock({ ...s, inventory: { ...s.inventory, I02: n } }, "I02");
    expect(at(0)).toEqual({ stock: 0, low: false });
    expect(at(4)).toEqual({ stock: 1, low: true });
    expect(at(12)).toEqual({ stock: 2, low: false });
    expect(at(13)).toEqual({ stock: 3, low: false });
  });

  it("places owned wash / foot equipment, the shared aroma lamp and stocked supplies in every level variant", () => {
    const s = game((g) => {
      g.unlocked.supplies = ["I01", "I02", "I07", "I08"];
      g.inventory = { ...g.inventory, I01: 50, I02: 0, I07: 1, I08: 0 };
      g.equipment.push(
        { uid: "w1", id: "E06", usesLeft: 100, tier: 3, slot: "shampoo-chair-2" },
        { uid: "w2", id: "E08", usesLeft: 100, tier: 2, slot: "water-heater" },
        { uid: "f1", id: "E10", usesLeft: 100, tier: 1, slot: "footbath-chair-3" },
        { uid: "a1", id: "E05", usesLeft: 100, tier: 1, slot: "aroma" },
      );
    });
    for (const scene of ["S04", "S04-L2", "S04-L3"]) {
      const p = placementsFor(s, slotsOf(scene), scene);
      expect(p.find((x) => x.slot === "shampoo-chair-2")?.art, scene).toMatch(/^E06/);
      expect(p.find((x) => x.slot === "water-heater")?.tier, scene).toBe(2);
      // I07 low (1 + badge) on shelf-1, I08 empty, towels plenty on shelf-3
      expect(p.filter((x) => x.item).map((x) => [x.slot, x.art, x.stock, x.low]), scene).toEqual([["shelf-1", "I07", 1, true], ["shelf-3", "I01", 3, false]]);
    }
    for (const scene of ["S05", "S05-L2", "S05-L3"]) {
      const p = placementsFor(s, slotsOf(scene), scene);
      expect(p.find((x) => x.slot === "footbath-chair-3")?.art, scene).toBe("E10");
      expect(p.find((x) => x.slot === "aroma")?.art, scene).toMatch(/^E05/);
    }
    // room 2 keeps its painted shelves; room 1 shows the gua sha set in its tool slot
    expect(placementsFor(s, slotsOf("S06"), "S06").some((x) => x.item)).toBe(false);
    const g = game((x) => { x.equipment.push({ uid: "g1", id: "E07", usesLeft: 10, tier: 3, slot: "shelf-tool" }); });
    expect(placementsFor(g, slotsOf("S02-L3"), "S02-L3").find((x) => x.slot === "shelf-tool")?.tier).toBe(3);
  });
});
