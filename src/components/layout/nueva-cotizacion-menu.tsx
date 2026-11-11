"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Botón global "+ Nueva cotización" con menú (Servicio / Material), visible en
 * toda pantalla del shell. Sustituye a la pantalla intermedia de elegir tipo.
 */
export function NuevaCotizacionMenu({ className }: { className?: string }) {
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

  const item = "block px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-2";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-strong"
      >
        + Nueva cotización
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-lg border border-border-strong bg-surface-1 py-1 shadow-xl"
        >
          <Link role="menuitem" href="/cotizaciones/nueva/servicio" onClick={() => setOpen(false)} className={item}>
            Servicio
          </Link>
          <Link role="menuitem" href="/cotizaciones/nueva/material" onClick={() => setOpen(false)} className={item}>
            Material
          </Link>
        </div>
      )}
    </div>
  );
}
