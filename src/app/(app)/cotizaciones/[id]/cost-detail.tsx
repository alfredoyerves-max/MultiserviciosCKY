"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="text-left"
        // El tamaño "sm" fija h-8 (una sola línea) y el estilo base fuerza
        // whitespace-nowrap — bien para botones cortos, pero éste es el
        // único botón de la app con una etiqueta larga a propósito y
        // necesita envolverse en 2-3 líneas en móvil. Un className no le
        // gana a esas reglas base por el orden de generación de utilidades
        // de Tailwind, así que van como estilo inline (evitamos `size` por
        // completo para no competir con su h-8).
        style={{ whiteSpace: "normal", height: "auto", padding: "0.375rem 0.75rem" }}
      >
        {open ? "Ocultar" : "Ver"} detalle de costos (interno — nunca va en el documento al cliente)
      </Button>
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
