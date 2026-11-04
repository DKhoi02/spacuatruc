import { useEffect, useState } from "preact/hooks";
import { characterSvg, equipmentSvg, itemSvg, uiSvg } from "@/ui/art/assets";

/** Renders a raw SVG string loaded asynchronously. */
export function RawSvg({ load, class: cls, deps, style }: { load: () => Promise<string>; class?: string; deps: unknown[]; style?: Record<string, string | number> }) {
  const [html, setHtml] = useState<string>("");
  useEffect(() => {
    let alive = true;
    load().then((s) => alive && setHtml(s)).catch(() => alive && setHtml(""));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <span class={`rawsvg ${cls ?? ""}`} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Portrait({ id, expr = "neutral", size = 56, class: cls }: { id: string; expr?: string; size?: number; class?: string }) {
  return <RawSvg class={`portrait ${cls ?? ""}`} style={{ width: `${size}px`, height: `${size}px` }} load={() => characterSvg(id, expr)} deps={[id, expr]} />;
}
export function ItemIcon({ id, size = 40 }: { id: string; size?: number }) {
  return <RawSvg class="item-icon" style={{ width: `${size}px`, height: `${size}px` }} load={() => itemSvg(id)} deps={[id]} />;
}
export function EquipIcon({ art, size = 64 }: { art: string; size?: number }) {
  return <RawSvg class="equip-icon" style={{ width: `${size}px`, height: `${size}px` }} load={() => equipmentSvg(art)} deps={[art]} />;
}
export function UiArt({ name, size = 120 }: { name: string; size?: number }) {
  return <RawSvg class="ui-art" style={{ width: `${size}px`, height: `${size * 1.1}px` }} load={() => uiSvg(name)} deps={[name]} />;
}
