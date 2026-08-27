import { cn } from "@/lib/cn";

/**
 * Barra de progreso abonado vs. saldo pendiente (Sección 7 del documento
 * de diseño) — usada en las cuentas de Pagos y Cobros. `pct` es el
 * porcentaje ya abonado (0-100); el color usa el token semántico de
 * éxito (mismo verde que "Aceptada"/"Cobrada" en el resto de la app).
 */
export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${clamped}%` }} />
    </div>
  );
}
