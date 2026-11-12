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
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-dim">
                <th className="py-2 font-medium">Servicio</th>
                <th className="py-2 text-right font-medium">Costo real</th>
                <th className="py-2 text-right font-medium">Precio venta</th>
                <th className="py-2 text-right font-medium">Margen</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-2 text-text">{l.servicioNombre}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-text-muted">
                    {formatCurrency(l.costoRealTotal)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-text">
                    {formatCurrency(l.precioVenta)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-success-soft">
                    {formatCurrency(l.precioVenta - l.costoRealTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
