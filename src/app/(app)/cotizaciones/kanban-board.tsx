"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { EstadoSelect } from "./estado-select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ESTADOS_COTIZACION,
  ESTADO_COTIZACION_LABELS,
  TIPO_CLIENTE_LABELS,
  type TipoCliente,
} from "@/lib/enums";
import type { AbonoPorCobrar, Cliente, Cotizacion, CuentaPorCobrar } from "@/generated/prisma/client";
import Link from "next/link";

type CotizacionConCliente = Cotizacion & {
  cliente: Cliente;
  cuentaPorCobrar: (CuentaPorCobrar & { abonos: Pick<AbonoPorCobrar, "id">[] }) | null;
};

const DIAS_ALERTA_VIGENCIA = 3;

function vigenciaInfo(
  estado: string,
  fechaVigencia: Date
): { label: string; tone: "danger" | "warning" } | null {
  if (estado !== "ENVIADA") return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVigencia);
  venc.setHours(0, 0, 0, 0);
  const diasRestantes = Math.round((venc.getTime() - hoy.getTime()) / 86400000);

  if (diasRestantes < 0) return { label: "Vencida", tone: "danger" };
  if (diasRestantes === 0) return { label: "Vence hoy", tone: "warning" };
  if (diasRestantes <= DIAS_ALERTA_VIGENCIA) return { label: `Vence en ${diasRestantes} día(s)`, tone: "warning" };
  return null;
}

export function KanbanBoard({
  cotizaciones,
  anio,
  mes,
  incluirSoporte,
}: {
  cotizaciones: CotizacionConCliente[];
  anio: number;
  mes: number;
  incluirSoporte: boolean;
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

  const mesValue = `${anio}-${String(mes).padStart(2, "0")}`;
  const hoy = new Date();
  const mesActualValue = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  const columnas = ESTADOS_COTIZACION.map((estado) => ({
    estado,
    cotizaciones: cotizaciones.filter((c) => c.estado === estado),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={mesValue}
            onChange={(e) => setParam("mes", e.target.value)}
            className="h-9 rounded-lg border border-border-strong bg-surface-2 px-3 text-sm text-text outline-none focus:border-primary"
          />
          {mesValue !== mesActualValue && (
            <button
              type="button"
              onClick={() => setParam("mes", null)}
              className="text-xs text-primary hover:underline"
            >
              Volver a este mes
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={incluirSoporte}
            onChange={(e) => setParam("soporte", e.target.checked ? "1" : null)}
            className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
          />
          Mostrar cotizaciones de soporte
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {columnas.map((col) => (
          <div key={col.estado} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-text">{ESTADO_COTIZACION_LABELS[col.estado]}</h3>
              <span className="text-xs text-text-dim">{col.cotizaciones.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {col.cotizaciones.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-dim">
                  Sin cotizaciones
                </p>
              )}
              {col.cotizaciones.map((c) => (
                <KanbanCard key={c.id} cotizacion={c} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ cotizacion }: { cotizacion: CotizacionConCliente }) {
  const vigencia = vigenciaInfo(cotizacion.estado, cotizacion.fechaVigencia);

  return (
    <Card
      className={
        vigencia?.tone === "danger"
          ? "border-danger-strong/50"
          : vigencia?.tone === "warning"
            ? "border-amber-500/40"
            : undefined
      }
    >
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/cotizaciones/${cotizacion.id}`}
            className="font-mono text-sm text-primary hover:underline"
          >
            {cotizacion.folio}
          </Link>
          {cotizacion.esSoporte && <Badge tone="secondary">Soporte</Badge>}
        </div>

        <p className="text-sm text-text">{cotizacion.cliente.nombreRazonSocial}</p>
        <p className="text-xs text-text-dim">
          {TIPO_CLIENTE_LABELS[cotizacion.cliente.tipoCliente as TipoCliente]}
        </p>

        <p className="font-mono text-base font-semibold tabular-nums text-text">
          {formatCurrency(cotizacion.totalAPagar)}
        </p>

        <p className="text-xs text-text-dim">Vigente hasta {formatDate(cotizacion.fechaVigencia)}</p>

        {vigencia && (
          <Badge tone={vigencia.tone} className="w-fit">
            {vigencia.label}
          </Badge>
        )}

        <EstadoSelect
          cotizacion={{
            ...cotizacion,
            tieneCuentaPorCobrar: cotizacion.cuentaPorCobrar !== null,
            tieneAbonos: (cotizacion.cuentaPorCobrar?.abonos.length ?? 0) > 0,
          }}
          className="mt-1 h-8 text-xs"
        />
      </CardContent>
    </Card>
  );
}
