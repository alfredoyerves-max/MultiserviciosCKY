"use client";

import { useEffect, useRef, useState } from "react";

export interface ExportOpcion {
  label: string;
  href: string;
}

/** Un solo botón secundario "Exportar ▾" con las descargas disponibles de la pantalla. */
export function ExportMenu({ opciones }: { opciones: ExportOpcion[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border-strong bg-surface-2 px-3 text-sm font-medium text-text transition-colors hover:bg-surface-3"
      >
        Exportar
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-lg border border-border-strong bg-surface-1 py-1 shadow-xl"
        >
          {opciones.map((o) => (
            <a
              key={o.href}
              role="menuitem"
              href={o.href}
              download
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-2"
            >
              {o.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
