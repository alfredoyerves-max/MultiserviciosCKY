"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { AccionesCotizacion } from "./acciones-cotizacion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthPicker } from "@/components/ui/month-picker";
import { Select, Input } from "@/components/ui/input";
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
import type { AbonoPorCobrar, Cliente, Cotizacion, CuentaPorCobrar } from "@/generated/prisma/client";

const ESTADOS_ABIERTOS: EstadoCotizacion[] = ["BORRADOR", "ENVIADA"];
const ESTADOS_HISTORICOS: EstadoCotizacion[] = ["ACEPTADA", "RECHAZADA"];

type CotizacionConCliente = Cotizacion & {
  cliente: Cliente;
  cuentaPorCobrar: (CuentaPorCobrar & { abonos: Pick<AbonoPorCobrar, "id">[] }) | null;
};

const DIAS_ALERTA_VIGENCIA = 3;

/** Insignia de vigencia de una cotización abierta (Borrador o Enviada):
 *  rojo = vencida, ámbar = vence hoy o en ≤3 días, neutro = con margen. */
function vigenciaInfo(fechaVigencia: Date): { label: string; tone: "danger" | "warning" | "neutral" } {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVigencia);
  venc.setHours(0, 0, 0, 0);
  const dias = Math.round((venc.getTime() - hoy.getTime()) / 86400000);

  if (dias < 0) return { label: "Vencida", tone: "danger" };
  if (dias === 0) return { label: "Vence hoy", tone: "warning" };
  const label = `Vence en ${dias} ${dias === 1 ? "día" : "días"}`;
  return { label, tone: dias <= DIAS_ALERTA_VIGENCIA ? "warning" : "neutral" };
}

const TOOLTIP_SOLO_TRAMITE =
  "Cotización generada solo como trámite interno del cliente (papeleo de compras), sin intención real de compra: no es una venta. Se ocultan por defecto.";

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

  // Borrador y Enviada: todo lo abierto, sin importar el mes (el servidor ya lo
  // devuelve así). El mes solo recorta el histórico (Aceptadas y Rechazadas).
  const columnas = ESTADOS_ABIERTOS.map((estado) => ({
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
    <div className="flex flex-col gap-6">
      {/* Filtros — una sola fila; aplican a todo el tablero. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Select
          className="h-9 w-auto"
          value={tipo ?? "TODOS"}
          aria-label="Tipo de cotización"
          onChange={(e) => setParam("tipo", e.target.value === "TODOS" ? null : e.target.value)}
        >
          <option value="TODOS">Todos los tipos</option>
          {TIPOS_COTIZACION.map((t) => (
            <option key={t} value={t}>
              {TIPO_COTIZACION_LABELS[t]}
            </option>
          ))}
        </Select>

        <label
          className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-text-muted"
          title={TOOLTIP_SOLO_TRAMITE}
        >
          <input
            type="checkbox"
            checked={incluirSoporte}
            onChange={(e) => setParam("soporte", e.target.checked ? "1" : null)}
            className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
          />
          Incluir «Solo trámite (no es venta)»
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {columnas.map((col) => (
          <section key={col.estado} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-text">{ESTADO_COTIZACION_LABELS[col.estado]}</h2>
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
          </section>
        ))}
      </div>

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">
            Histórico — Aceptadas y Rechazadas
            <span className="ml-2 text-xs font-normal text-text-dim">{historicas.length}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <MonthPicker value={mesValue} onChange={(v) => setParam("mes", v)} label="Mes del histórico" />
            {mesValue !== mesActualValue && (
              <button
                type="button"
                onClick={() => setParam("mes", null)}
                className="text-xs text-primary hover:underline"
              >
                Volver a este mes
              </button>
            )}
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por folio o cliente…"
              aria-label="Buscar en el histórico"
              className="h-9 w-full sm:w-64"
            />
          </div>
        </div>

        {historicas.length === 0 && <EmptyState title="Sin cotizaciones históricas para este filtro." />}

        {/* Tarjetas en móvil. */}
        <div className="flex flex-col gap-3 sm:hidden">
          {historicas.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-1.5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/cotizaciones/${c.id}`} className="font-mono text-sm text-primary hover:underline">
                    {c.folio}
                  </Link>
                  <EstadoBadge estado={c.estado} />
                </div>
                <p className="text-sm text-text">{c.cliente.nombreRazonSocial}</p>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-base font-semibold tabular-nums text-text">
                      {formatCurrency(c.netoARecibir)}
                    </p>
                    <p className="text-xs text-text-dim">
                      {TIPO_COTIZACION_LABELS[c.tipo as TipoCotizacion]} · {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <AccionesCotizacion cotizacion={c} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabla desde sm. */}
        {historicas.length > 0 && (
          <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                  <th className="px-4 py-3 font-medium">Folio</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="w-14 px-4 py-3" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {historicas.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/cotizaciones/${c.id}`} className="font-mono text-sm text-primary hover:underline">
                        {c.folio}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text">{c.cliente.nombreRazonSocial}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{TIPO_COTIZACION_LABELS[c.tipo as TipoCotizacion]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text">
                      {formatCurrency(c.netoARecibir)}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={c.estado} />
                    </td>
                    <td className="px-4 py-3 text-text-muted">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <AccionesCotizacion cotizacion={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Aceptada = verde (pagado/ok); Rechazada = neutro. El color queda para estados. */
function EstadoBadge({ estado }: { estado: string }) {
  return (
    <Badge tone={estado === "ACEPTADA" ? "success" : "neutral"}>
      {ESTADO_COTIZACION_LABELS[estado as EstadoCotizacion]}
    </Badge>
  );
}

function KanbanCard({ cotizacion }: { cotizacion: CotizacionConCliente }) {
  const vigencia = vigenciaInfo(cotizacion.fechaVigencia);

  return (
    <Card
      className={
        vigencia.tone === "danger"
          ? "border-danger-strong/50"
          : vigencia.tone === "warning"
            ? "border-warning/40"
            : undefined
      }
    >
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/cotizaciones/${cotizacion.id}`} className="font-mono text-sm text-primary hover:underline">
            {cotizacion.folio}
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Badge tone="neutral">{TIPO_COTIZACION_LABELS[cotizacion.tipo as TipoCotizacion]}</Badge>
            {cotizacion.esSoporte && (
              <Badge tone="neutral" title={TOOLTIP_SOLO_TRAMITE}>
                Solo trámite
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-text">{cotizacion.cliente.nombreRazonSocial}</p>
        <p className="text-xs text-text-dim">
          {TIPO_CLIENTE_LABELS[cotizacion.cliente.tipoCliente as TipoCliente]}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-base font-semibold tabular-nums text-text">
            {formatCurrency(cotizacion.netoARecibir)}
          </p>
          <Badge tone={vigencia.tone}>{vigencia.label}</Badge>
        </div>

        <p className="text-xs text-text-dim">Vigente hasta {formatDate(cotizacion.fechaVigencia)}</p>

        <div className="mt-1">
          <AccionesCotizacion cotizacion={cotizacion} conPrincipal />
        </div>
      </CardContent>
    </Card>
  );
}
