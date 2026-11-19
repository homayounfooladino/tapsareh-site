"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../Icon";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialogs can stack (the rules open over the signup form). Only the top one handles keys.
const stack: object[] = [];

/** Modal with focus kept inside, Esc to close, and focus returned to where it was. */
export function Dialog({
  label,
  onClose,
  children,
  wide,
  closable = true,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  closable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The key handler is set up once per dialog; it reads the latest props from here.
  const latest = useRef({ onClose, closable });
  useEffect(() => {
    latest.current = { onClose, closable };
  });
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const me = {};
    stack.push(me);
    const first = el?.querySelector<HTMLElement>("input, textarea") || el?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== me) return;
      if (e.key === "Escape" && latest.current.closable) {
        e.preventDefault();
        latest.current.onClose();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
      prev?.focus?.();
    };
  }, []);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && closable && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={wide ? "dialog wide" : "dialog"}>
        {closable && (
          <button type="button" className="iconbtn close" aria-label="بستن" onClick={onClose}>
            <Icon name="x" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
