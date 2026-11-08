/**
 * Resolves a TaskItem into what to draw: which view, mirrored or not, the target geometry (in VIEW coords,
 * i.e. the art JSON's normalized coords before mirroring) and which variant groups to show.
 */
import type { CareStepId, Side, TaskItem, ViewId } from "@/core/types";
import { viewData, type ViewData, type ViewMuscle, type ViewPoint, type ViewZone } from "@/ui/art/assets";
import { muscleInfo, pointInfo } from "./content";
import type { Pt } from "./scoring";

export const ALL_VIEWS: ViewId[] = ["V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10", "V11", "V12"];

export async function loadAllViews(): Promise<ViewData[]> {
  const res = await Promise.all(ALL_VIEWS.map((v) => viewData(v).catch(() => null)));
  return res.filter((v): v is ViewData => !!v);
}

export type Overlay = "V13" | "V14" | "V15";

interface PlanBase {
  view: ViewId;
  data: ViewData;
  /** True when the art is flipped horizontally (mirrorable view drawn for the other side). */
  mirrored: boolean;
  /** Variant group names per category (e.g. { mouth: "mouth-open" }). Expression handled separately. */
  variants: Record<string, string>;
}
export interface PointPlan extends PlanBase { kind: "point"; target: ViewPoint; otherSide?: ViewPoint }
export interface MusclePlan extends PlanBase { kind: "muscle"; target: ViewMuscle }
export interface ZonePlan extends PlanBase { kind: "zone"; target: ViewZone; polys: Pt[][] }
export interface StepPlan extends PlanBase { kind: "step"; step: CareStepId; overlay?: Overlay; mode: "rub" | "hold" | "stones"; amount: number }
export type Plan = PointPlan | MusclePlan | ZonePlan | StepPlan;

export function drawnSideOf(d: ViewData): "left" | "right" {
  const ds = (d.drawnSide ?? (d as { visibleSide?: string }).visibleSide ?? d.points[0]?.side ?? d.muscles[0]?.side ?? "right") as string;
  return ds === "left" ? "left" : "right";
}

function defaultVariants(d: ViewData, needed?: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [cat, names] of Object.entries(d.variants ?? {})) {
    if (cat === "expr" || !names.length) continue;
    out[cat] = d.defaultVariants?.[cat] ?? names[0];
    if (needed && names.includes(needed)) out[cat] = needed;
  }
  return out;
}

function orderViews(preferred: ViewId[], all: ViewData[]): ViewData[] {
  const byId = new Map(all.map((v) => [v.view, v]));
  const out: ViewData[] = [];
  for (const v of preferred) { const d = byId.get(v); if (d && !out.includes(d)) out.push(d); }
  for (const d of all) if (!out.includes(d)) out.push(d);
  return out;
}

const opposite = (s: Side): Side => (s === "left" ? "right" : s === "right" ? "left" : s);

export function planFor(item: TaskItem, all: ViewData[]): Plan | null {
  if (item.kind === "point") {
    const info = pointInfo(item.id, all);
    const views = orderViews(info.views, all);
    // 1st pass: a view that contains the exact side; 2nd: a mirrorable view with the other side.
    for (const d of views) {
      const t = d.points.find((p) => p.id === item.id && p.side === item.side);
      if (t) {
        const other = d.points.find((p) => p.id === item.id && p.side === opposite(item.side) && p.side !== item.side);
        return { kind: "point", view: d.view, data: d, mirrored: false, target: t, otherSide: other, variants: defaultVariants(d, t.variant ?? info.variant) };
      }
    }
    for (const d of views) {
      if (!d.mirrorable || (item.side !== "left" && item.side !== "right")) continue;
      const t = d.points.find((p) => p.id === item.id && p.side === opposite(item.side));
      if (t) return { kind: "point", view: d.view, data: d, mirrored: true, target: t, variants: defaultVariants(d, t.variant ?? info.variant) };
    }
    for (const d of views) {
      const t = d.points.find((p) => p.id === item.id);
      if (t) return { kind: "point", view: d.view, data: d, mirrored: false, target: t, variants: defaultVariants(d, t.variant) };
    }
    return null;
  }
  if (item.kind === "muscle") {
    const info = muscleInfo(item.id, all);
    const views = orderViews(info.views, all);
    for (const d of views) {
      const t = d.muscles.find((m) => m.id === item.id && m.side === item.side);
      if (t) return { kind: "muscle", view: d.view, data: d, mirrored: false, target: t, variants: defaultVariants(d) };
    }
    for (const d of views) {
      if (!d.mirrorable) continue;
      const t = d.muscles.find((m) => m.id === item.id && m.side === opposite(item.side));
      if (t) return { kind: "muscle", view: d.view, data: d, mirrored: true, target: t, variants: defaultVariants(d) };
    }
    for (const d of views) {
      const t = d.muscles.find((m) => m.id === item.id);
      if (t) return { kind: "muscle", view: d.view, data: d, mirrored: false, target: t, variants: defaultVariants(d) };
    }
    return null;
  }
  if (item.kind === "zone") {
    for (const d of all) {
      const t = (d.zones ?? []).find((z) => z.id === item.id);
      if (!t) continue;
      const mirrored = !!d.mirrorable && drawnSideOf(d) !== item.foot;
      const polys = (t.polygons && t.polygons.length ? t.polygons : [t.polygon]) as Pt[][];
      return { kind: "zone", view: d.view, data: d, mirrored, target: t, polys, variants: defaultVariants(d) };
    }
    return null;
  }
  // care steps
  const stepView: Record<CareStepId, { view: ViewId; overlay?: Overlay; mode: "rub" | "hold" | "stones"; amount: number }> = {
    cleanse: { view: "V01", overlay: "V13", mode: "rub", amount: 4 },
    steam: { view: "V01", mode: "hold", amount: 3 },
    scrub: { view: "V01", overlay: "V13", mode: "rub", amount: 5 },
    mask: { view: "V01", overlay: "V13", mode: "rub", amount: 3 },
    wet: { view: "V03", overlay: "V14", mode: "rub", amount: 3 },
    shampoo: { view: "V03", overlay: "V14", mode: "rub", amount: 5 },
    rinse: { view: "V03", overlay: "V14", mode: "rub", amount: 3 },
    dry: { view: "V03", overlay: "V14", mode: "hold", amount: 3 },
    soak: { view: "V11", mode: "hold", amount: 4 },
    "place-stones": { view: "V06", overlay: "V15", mode: "stones", amount: 8 },
    "blend-oil": { view: "V06", mode: "hold", amount: 1 },
  };
  const sv = stepView[item.id];
  const d = all.find((v) => v.view === sv.view);
  if (!d) return null;
  return { kind: "step", step: item.id, view: sv.view, data: d, mirrored: false, overlay: sv.overlay, mode: sv.mode, amount: sv.amount, variants: defaultVariants(d) };
}
