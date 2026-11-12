import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatCurrency, formatDate } from "@/lib/format";

/**
 * Fila de una cuenta (por cobrar o por pagar): identificación, estado y
 * progreso a la izquierda; saldo y acciones a la derecha. Una sola definición
 * para ambas listas. El rojo queda solo para "Vencida" (insignia + franja).
 */
export function CuentaFila({
  href,
  titulo,
  tituloMono = false,
  subtitulo,
  estado,
  vencida,
  fechaVencimiento,
  nAbonos,
  pctAbonado,
  saldo,
  montoTotal,
  acciones,
}: {
  href: string;
  titulo: string;
  tituloMono?: boolean;
  subtitulo: string;
  estado: { label: string; tone: "neutral" | "primary" | "success" };
  vencida: boolean;
  fechaVencimiento: Date;
  nAbonos: number;
  pctAbonado: number;
  saldo: number;
  montoTotal: number;
  acciones: ReactNode;
}) {
  return (
    <Card className={vencida ? "border-l-[3px] border-l-danger-strong" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3">
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={href}
              className={tituloMono ? "font-mono text-sm text-primary hover:underline" : "text-sm font-medium text-text hover:underline"}
            >
              {titulo}
            </Link>
            <Badge tone={estado.tone}>{estado.label}</Badge>
            {vencida && <Badge tone="danger">Vencida</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-text-muted">{subtitulo}</p>
          <p className="text-xs text-text-dim">
            Vence {formatDate(fechaVencimiento)} · {nAbonos} abono(s)
          </p>
          <ProgressBar pct={pctAbonado} className="mt-2 max-w-48" />
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-text-dim">Saldo pendiente</p>
          <p className="font-mono text-base font-semibold tabular-nums text-text">{formatCurrency(saldo)}</p>
          <p className="text-xs text-text-dim">de {formatCurrency(montoTotal)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">{acciones}</div>
      </div>
    </Card>
  );
}
