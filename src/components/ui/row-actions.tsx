"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type RowAction =
  | { label: string; href: string; danger?: boolean }
  | { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean; hint?: string };

const MENU_WIDTH = 184;

/**
 * Menú "⋯" de una fila o tarjeta. Se pinta en un portal con posición fija para
 * que ninguna tabla con overflow lo recorte. Se cierra con clic afuera, Escape,
 * scroll o resize. Las acciones destructivas van al final y en rojo.
 */
export function RowActions({ actions, label = "Más acciones" }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (open) return setOpen(false);
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    // Si no cabe hacia abajo, abre hacia arriba.
    const alto = actions.reduce((n, a) => n + (!("href" in a) && a.disabled && a.hint ? 76 : 40), 8);
    const top = r.bottom + alto > window.innerHeight ? Math.max(8, r.top - alto - 4) : r.bottom + 4;
    setPos({ top, left });
    setOpen(true);
  }

  const itemBase =
    "flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-50";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted sm:h-9 sm:w-9 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            // select-none: las opciones son botones, no texto (arrastrar el ratón no debe seleccionarlas).
            // El menú nace pegado al botón (debajo, o encima si no cabe) y nunca sobre su propia fila.
            className="fixed z-50 select-none overflow-hidden rounded-lg border border-border-strong bg-surface-1 py-1 shadow-xl"
            onMouseDown={(e) => e.preventDefault()}
          >
            {actions.map((a) =>
              "href" in a ? (
                <Link
                  key={a.label}
                  role="menuitem"
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className={cn(itemBase, a.danger ? "text-danger" : "text-text")}
                >
                  {a.label}
                </Link>
              ) : (
                <button
                  key={a.label}
                  type="button"
                  role="menuitem"
                  disabled={a.disabled}
                  title={a.hint}
                  onClick={() => {
                    setOpen(false);
                    a.onSelect();
                  }}
                  className={cn(itemBase, a.danger ? "text-danger" : "text-text", a.disabled && a.hint && "flex-col items-start gap-0.5")}
                >
                  {a.label}
                  {/* Una acción desactivada dice por qué, a la vista (no solo en el tooltip). */}
                  {a.disabled && a.hint && <span className="text-xs font-normal leading-snug text-text-muted">{a.hint}</span>}
                </button>
              )
            )}
          </div>,
          document.body
        )}
    </>
  );
}
