"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { EstadoSelect } from "./estado-select";
import { EliminarCotizacionButton } from "./eliminar-cotizacion-button";
import { puedeEliminarseCotizacion } from "@/lib/cotizacionRules";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ESTADO_COTIZACION_LABELS,
  TIPO_CLIENTE_LABELS,
  TIPOS_COTIZACION,
  TIPO_COTIZACION_LABELS,
  type EstadoCotizacion,
  type TipoCliente,
  type TipoCotizacion,
} from "@/lib/enums";
import { Select, Input } from "@/components/ui/input";
import type { AbonoPorCobrar, Cliente, Cotizacion, CuentaPorCobrar } from "@/generated/prisma/client";
import Link from "next/link";

const ESTADOS_ACTIVOS: EstadoCotizacion[] = ["BORRADOR", "ENVIADA"];
const ESTADOS_HISTORICOS: EstadoCotizacion[] = ["ACEPTADA", "RECHAZADA"];

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
  tipo,
}: {
  cotizaciones: CotizacionConCliente[];
  anio: number;
  mes: number;
  incluirSoporte: boolean;
  tipo?: TipoCotizacion;
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

  const [busqueda, setBusqueda] = useState("");

  // El kanban activo (Fase 6) solo muestra el flujo vivo de negociación —
  // Borrador y Enviada. Aceptada/Rechazada ya no están en negociación, así
  // que viven en la tabla histórica debajo, con su propio buscador —
  // ambas vistas comparten los mismos filtros de mes/tipo/soporte (ya
  // aplicados server-side en listCotizacionesKanban).
  const columnas = ESTADOS_ACTIVOS.map((estado) => ({
    estado,
    cotizaciones: cotizaciones.filter((c) => c.estado === estado),
  }));

  const historicas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return cotizaciones
      .filter((c) => ESTADOS_HISTORICOS.includes(c.estado as EstadoCotizacion))
      .filter(
        (c) =>
          q === "" ||
          c.folio.toLowerCase().includes(q) ||
          c.cliente.nombreRazonSocial.toLowerCase().includes(q)
      );
  }, [cotizaciones, busqueda]);

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

        <div className="flex items-center gap-3">
          <Select
            className="h-9 w-auto"
            value={tipo ?? "TODOS"}
            onChange={(e) => setParam("tipo", e.target.value === "TODOS" ? null : e.target.value)}
          >
            <option value="TODOS">Todos los tipos</option>
            {TIPOS_COTIZACION.map((t) => (
              <option key={t} value={t}>
                {TIPO_COTIZACION_LABELS[t]}
              </option>
            ))}
          </Select>

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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="mt-2 flex flex-col gap-3 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">
            Histórico — Aceptadas y Rechazadas
            <span className="ml-2 text-xs font-normal text-text-dim">{historicas.length}</span>
          </h2>
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por folio o cliente…"
            className="h-9 w-64"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                <th className="px-4 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historicas.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="Sin cotizaciones históricas para este filtro." />
                  </td>
                </tr>
              )}
              {historicas.map((c) => (
                <HistoricoRow key={c.id} cotizacion={c} />
              ))}
            </tbody>
          </table>
        </div>
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
            ? "border-warning/40"
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
          <div className="flex flex-wrap items-center gap-1">
            <Badge tone="neutral">{TIPO_COTIZACION_LABELS[cotizacion.tipo as TipoCotizacion]}</Badge>
            {cotizacion.esSoporte && <Badge tone="neutral">Soporte</Badge>}
          </div>
        </div>

        <p className="text-sm text-text">{cotizacion.cliente.nombreRazonSocial}</p>
        <p className="text-xs text-text-dim">
          {TIPO_CLIENTE_LABELS[cotizacion.cliente.tipoCliente as TipoCliente]}
        </p>

        <p className="font-mono text-base font-semibold tabular-nums text-text">
          {formatCurrency(cotizacion.netoARecibir)}
        </p>

        <p className="text-xs text-text-dim">Vigente hasta {formatDate(cotizacion.fechaVigencia)}</p>

        {vigencia && (
          <Badge tone={vigencia.tone} className="w-fit">
            {vigencia.label}
          </Badge>
        )}

        <div className="mt-1 flex items-center gap-2">
          <EstadoSelect
            cotizacion={{
              ...cotizacion,
              tieneCuentaPorCobrar: cotizacion.cuentaPorCobrar !== null,
              tieneAbonos: (cotizacion.cuentaPorCobrar?.abonos.length ?? 0) > 0,
            }}
            className="h-8 flex-1 text-xs"
          />
          {puedeEliminarseCotizacion(cotizacion) && (
            <EliminarCotizacionButton
              cotizacion={{
                id: cotizacion.id,
                folio: cotizacion.folio,
                tipo: cotizacion.tipo,
                clienteNombre: cotizacion.cliente.nombreRazonSocial,
                total: cotizacion.netoARecibir,
              }}
              size="sm"
              className="h-8 shrink-0 px-2 text-xs"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoricoRow({ cotizacion }: { cotizacion: CotizacionConCliente }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3">
        <Link href={`/cotizaciones/${cotizacion.id}`} className="font-mono text-sm text-primary hover:underline">
          {cotizacion.folio}
        </Link>
      </td>
      <td className="px-4 py-3 text-text">{cotizacion.cliente.nombreRazonSocial}</td>
      <td className="px-4 py-3">
        <Badge tone="neutral">{TIPO_COTIZACION_LABELS[cotizacion.tipo as TipoCotizacion]}</Badge>
      </td>
      <td className="px-4 py-3 text-right font-mono tabular-nums text-text">
        {formatCurrency(cotizacion.netoARecibir)}
      </td>
      <td className="px-4 py-3">
        <EstadoSelect
          cotizacion={{
            ...cotizacion,
            tieneCuentaPorCobrar: cotizacion.cuentaPorCobrar !== null,
            tieneAbonos: (cotizacion.cuentaPorCobrar?.abonos.length ?? 0) > 0,
          }}
          className="h-8 w-auto text-xs"
        />
      </td>
      <td className="px-4 py-3 text-text-muted">{formatDate(cotizacion.createdAt)}</td>
      <td className="px-4 py-3 text-right">
        {puedeEliminarseCotizacion(cotizacion) && (
          <EliminarCotizacionButton
            cotizacion={{
              id: cotizacion.id,
              folio: cotizacion.folio,
              tipo: cotizacion.tipo,
              clienteNombre: cotizacion.cliente.nombreRazonSocial,
              total: cotizacion.netoARecibir,
            }}
            size="sm"
          />
        )}
      </td>
    </tr>
  );
}
