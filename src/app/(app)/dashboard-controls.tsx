"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { MonthPicker } from "@/components/ui/month-picker";

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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <MonthPicker value={mes} onChange={(v) => v >= mesMinimo && setParam("mes", v)} label="Mes del dashboard" />

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
