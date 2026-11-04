/** Horizontal force bar: none / light / medium / strong / over, with the required zone outlined. */
import { FORCE_ZONES, type ForceLevel } from "./scoring";

export function ForceBar({ value, required }: { value: number; required: ForceLevel }) {
  const w = (a: number, b: number) => `${(b - a) * 100}%`;
  return (
    <div class="tx-force" aria-label="Thanh lực">
      <div class="z0" style={{ width: w(0, FORCE_ZONES.light[0]) }} />
      <div class={"zl" + (required === "light" ? " req" : "")} style={{ width: w(...FORCE_ZONES.light) }}>Nhẹ</div>
      <div class={"zm" + (required === "medium" ? " req" : "")} style={{ width: w(...FORCE_ZONES.medium) }}>Vừa</div>
      <div class={"zs" + (required === "strong" ? " req" : "")} style={{ width: w(...FORCE_ZONES.strong) }}>Mạnh</div>
      <div class="zo" style={{ width: w(FORCE_ZONES.strong[1], 1) }}>!</div>
      <span class="tx-needle" style={{ left: `${value * 100}%` }} />
    </div>
  );
}
