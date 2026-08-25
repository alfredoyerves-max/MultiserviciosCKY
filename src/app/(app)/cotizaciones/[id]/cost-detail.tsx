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
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
        {open ? "Ocultar" : "Ver"} detalle de costos (interno — nunca va en el documento al cliente)
      </Button>
      {open && (
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
      )}
    </div>
  );
}
