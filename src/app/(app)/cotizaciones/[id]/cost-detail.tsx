"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

interface LineaCosto {
  id: string;
  servicioNombre: string;
  costoRealTotal: number;
  precioVenta: number;
}

export function CostDetail({ lineas }: { lineas: LineaCosto[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Información interna: nunca aparece en el documento al cliente."
        className="inline-flex items-center gap-1.5 text-left text-sm text-primary underline-offset-2 hover:underline"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        {open ? "Ocultar" : "Ver"} detalle de costos (interno)
      </button>
      {open && (
        // Una tarjeta por servicio: cabe en el panel angosto sin scroll horizontal,
        // con cualquier nombre largo y con 3 o más servicios.
        <ul className="mt-3 flex flex-col gap-2">
          {lineas.map((l) => (
            <li key={l.id} className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="break-words text-sm font-medium text-text">{l.servicioNombre}</p>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-text-dim">Costo real</dt>
                  <dd className="font-mono tabular-nums text-text-muted">{formatCurrency(l.costoRealTotal)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-text-dim">Precio de venta</dt>
                  <dd className="font-mono tabular-nums text-text">{formatCurrency(l.precioVenta)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1">
                  <dt className="text-text-dim">Recargo</dt>
                  <dd className="font-mono tabular-nums text-success-soft">
                    {formatCurrency(l.precioVenta - l.costoRealTotal)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
