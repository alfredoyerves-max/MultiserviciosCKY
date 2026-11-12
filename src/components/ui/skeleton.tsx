import { cn } from "@/lib/cn";

/** Bloque gris pulsante (se detiene si el usuario pidió menos movimiento). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-md bg-surface-2 motion-safe:animate-pulse", className)} />;
}

/**
 * Esqueleto de página para los `loading.tsx` de las rutas del menú: aparece al
 * instante al navegar, mientras el servidor trae los datos de la pantalla.
 * Imita la estructura real (encabezado, tarjetas de cifras opcionales y una
 * tabla o un tablero) para que el cambio a la pantalla final no brinque.
 */
export function PageSkeleton({
  tiles = 0,
  variante = "tabla",
}: {
  /** Tarjetas de cifras bajo el encabezado (Dashboard, Pagos). */
  tiles?: number;
  variante?: "tabla" | "tablero" | "detalle" | "formulario";
}) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Cargando…</span>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {tiles > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: tiles }, (_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-1 p-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-3 h-7 w-32" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {variante === "detalle" || variante === "formulario" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-1 p-5">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: variante === "formulario" ? 4 : 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-5">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
        </div>
      ) : variante === "tablero" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((col) => (
            <div key={col} className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4">
              <Skeleton className="h-4 w-32" />
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-1">
          <div className="border-b border-border px-5 py-4">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
