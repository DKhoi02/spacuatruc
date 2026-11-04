import { describe, expect, it } from "vitest";
import { equipmentArt, hasEquipmentArt } from "./assets";

describe("equipmentArt (GAME_DESIGN §12.2 tier art)", () => {
  it("uses <id>-t<tier> when drawn, else falls back", () => {
    expect(equipmentArt("E03", 1)).toBe("E03");
    for (const t of [2, 3]) expect(equipmentArt("E03", t)).toBe(hasEquipmentArt(`E03-t${t}`) ? `E03-t${t}` : t === 3 && hasEquipmentArt("E03-t2") ? "E03-t2" : "E03");
    // a bed without tier art falls back to the cushioned bed
    if (!hasEquipmentArt("E01-t2")) expect(equipmentArt("E01", 2)).toBe("E01-upgraded");
    expect(equipmentArt("E99", 3)).toBe("E99");
  });
});
