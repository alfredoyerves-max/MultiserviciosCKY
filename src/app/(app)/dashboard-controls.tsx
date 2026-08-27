"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type VistaDashboard = "mensual" | "anual";

/**
 * Selector de mes (con navegación atrás/adelante, acotada al rango real de
 * datos) + toggle Mensual/Acumulado del año — mismo patrón de URL
 * search-params ya usado en el kanban de Cotizaciones (setParam), para que
 * el estado sea compartible por link y sobreviva a un refresh.
 */
export function DashboardControls({
  mes,
  mesMinimo,
  vista,
}: {
  mes: string;
  mesMinimo: string;
  vista: VistaDashboard;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function shiftMonth(delta: number) {
    const [anio, m] = mes.split("-").map(Number);
    const d = new Date(anio, m - 1 + delta, 1);
    const nuevo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setParam("mes", nuevo);
  }

  const puedeAnterior = mes > mesMinimo;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!puedeAnterior}
          aria-label="Mes anterior"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong bg-surface-2 text-text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:pointer-events-none disabled:opacity-40"
        >
          ‹
        </button>
        <input
          type="month"
          value={mes}
          min={mesMinimo}
          onChange={(e) => e.target.value && setParam("mes", e.target.value)}
          className="h-9 rounded-lg border border-border-strong bg-surface-2 px-3 text-sm text-text outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Mes siguiente"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong bg-surface-2 text-text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:pointer-events-none disabled:opacity-40"
        >
          ›
        </button>
      </div>

      <div className="flex rounded-lg border border-border-strong bg-surface-2 p-0.5">
        <button
          type="button"
          onClick={() => setParam("vista", null)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            vista === "mensual" ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text"
          )}
        >
          Mensual
        </button>
        <button
          type="button"
          onClick={() => setParam("vista", "anual")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            vista === "anual" ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text"
          )}
        >
          Acumulado del año
        </button>
      </div>
    </div>
  );
}
