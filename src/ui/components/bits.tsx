import type { ComponentChildren } from "preact";
import { Star, X } from "lucide-preact";
import { createPortal } from "preact/compat";

export const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));

export function Stars({ value, max = 5, size = 16 }: { value: number; max?: number; size?: number }) {
  return (
    <span class="stars" aria-label={`${value} sao`}>
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span class="star" style={{ width: `${size}px`, height: `${size}px` }} key={i}>
            <Star size={size} class="star-bg" />
            <span class="star-fg" style={{ width: `${fill * 100}%` }}><Star size={size} /></span>
          </span>
        );
      })}
    </span>
  );
}

export function Btn(props: { onClick?: () => void; kind?: "primary" | "secondary" | "danger" | "ghost"; disabled?: boolean; children: ComponentChildren; small?: boolean; block?: boolean; class?: string }) {
  const { kind = "primary", small, block } = props;
  return (
    <button type="button" class={`btn btn-${kind}${small ? " btn-sm" : ""}${block ? " btn-block" : ""} ${props.class ?? ""}`} disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

export function Modal({ children, onClose, title, class: cls }: { children: ComponentChildren; onClose?: () => void; title?: ComponentChildren; class?: string }) {
  // Portal to <body>: inside the scrolling .app-main, iOS Safari layers the modal under the fixed tab bar
  // (its bottom gets covered and it can't be scrolled).
  const node = (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div class={`modal card ${cls ?? ""}`} role="dialog">
        {(title || onClose) && (
          <div class="modal-head">
            <h2>{title}</h2>
            {onClose && (
              <button class="icon-btn" onClick={onClose} aria-label="Đóng"><X size={22} /></button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(node, document.body) : node;
}

export function Bar({ value, max, tone }: { value: number; max: number; tone?: "ok" | "warn" | "danger" }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const t = tone ?? (pct <= 0 ? "danger" : pct < 20 ? "warn" : "ok");
  return (
    <div class="bar"><div class={`bar-fill tone-${t}`} style={{ width: `${pct}%` }} /></div>
  );
}

export function Chip({ children, tone = "neutral", icon }: { children: ComponentChildren; tone?: "neutral" | "sage" | "rose" | "amber" | "danger" | "guide"; icon?: ComponentChildren }) {
  return <span class={`chip chip-${tone}`}>{icon}{children}</span>;
}

export function Section({ title, children, right }: { title: ComponentChildren; children: ComponentChildren; right?: ComponentChildren }) {
  return (
    <section class="section">
      <div class="section-head"><h3>{title}</h3>{right}</div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <p class="empty">{children}</p>;
}
