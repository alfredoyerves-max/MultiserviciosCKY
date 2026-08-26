import { getCotizacion } from "@/lib/data/cotizaciones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnchorButton, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import {
  MODALIDAD_LABELS,
  TIPO_CLIENTE_LABELS,
  TIPO_COTIZACION_LABELS,
  UNIDAD_MEDIDA_LABELS,
  type Modalidad,
  type TipoCliente,
  type TipoCotizacion,
  type UnidadMedida,
} from "@/lib/enums";
import { EstadoSelect } from "../estado-select";
import { CostDetail } from "./cost-detail";
import Link from "next/link";

const TIPO_COTIZACION_TONE: Record<TipoCotizacion, "primary" | "secondary"> = {
  SERVICIO: "primary",
  MATERIAL: "secondary",
};

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cotizacion = await getCotizacion(id);
  const tipo = cotizacion.tipo as TipoCotizacion;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-semibold text-text">{cotizacion.folio}</h1>
            <Badge tone={TIPO_COTIZACION_TONE[tipo]}>{TIPO_COTIZACION_LABELS[tipo]}</Badge>
            <EstadoSelect
              cotizacion={{
                ...cotizacion,
                tieneCuentaPorCobrar: cotizacion.cuentaPorCobrar !== null,
                tieneAbonos: (cotizacion.cuentaPorCobrar?.abonos.length ?? 0) > 0,
              }}
            />
            {cotizacion.esSoporte && <Badge tone="secondary">Soporte</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {cotizacion.cliente.nombreRazonSocial} ·{" "}
            {TIPO_CLIENTE_LABELS[cotizacion.cliente.tipoCliente as TipoCliente]} ·{" "}
            {formatDate(cotizacion.createdAt)} · Vigente hasta {formatDate(cotizacion.fechaVigencia)}
          </p>
          {cotizacion.proyecto && (
            <p className="text-sm text-text-dim">Proyecto: {cotizacion.proyecto}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AnchorButton href={`/api/cotizaciones/${cotizacion.id}/export?format=docx`} download>
            Exportar Word
          </AnchorButton>
          <AnchorButton href={`/api/cotizaciones/${cotizacion.id}/export?format=pdf`} download>
            Exportar PDF
          </AnchorButton>
          <ButtonLink href="/cotizaciones" variant="secondary" size="sm">
            ← Volver
          </ButtonLink>
        </div>
      </div>

      {tipo === "SERVICIO" ? (
        <Card>
          <CardHeader>
            <CardTitle>Servicios cotizados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                  <th className="px-5 py-3 font-medium">Servicio</th>
                  <th className="px-5 py-3 font-medium">Modalidad</th>
                  <th className="px-5 py-3 font-medium">Personas</th>
                  <th className="px-5 py-3 font-medium">Duración</th>
                  <th className="px-5 py-3 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {cotizacion.lineas.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-text">{l.servicio.nombre}</td>
                    <td className="px-5 py-3 text-text-muted">{MODALIDAD_LABELS[l.modalidad as Modalidad]}</td>
                    <td className="px-5 py-3 text-text-muted">{l.personas}</td>
                    <td className="px-5 py-3 text-text-muted">{l.duracion}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-text">
                      {formatCurrency(l.precioVenta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Materiales cotizados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                  <th className="px-5 py-3 font-medium">Producto</th>
                  <th className="px-5 py-3 font-medium">Cantidad</th>
                  <th className="px-5 py-3 text-right font-medium">Precio unitario</th>
                  <th className="px-5 py-3 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {cotizacion.lineasMaterial.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-text">{l.producto.nombre}</td>
                    <td className="px-5 py-3 text-text-muted">
                      {l.cantidad} {UNIDAD_MEDIDA_LABELS[l.producto.unidadMedida as UnidadMedida]}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-text-muted">
                      {formatCurrency(l.precioUnitario)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-text">
                      {formatCurrency(l.importe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resumen fiscal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Resumen label="Subtotal" value={formatCurrency(cotizacion.subtotal)} />
            <Resumen label="IVA (16%)" value={formatCurrency(cotizacion.iva)} />
            <Resumen label="Total a pagar" value={formatCurrency(cotizacion.totalAPagar)} accent />
            {cotizacion.retencionIsr > 0 && (
              <Resumen label="Retención ISR" value={`- ${formatCurrency(cotizacion.retencionIsr)}`} />
            )}
            <Resumen label="Neto a recibir" value={formatCurrency(cotizacion.netoARecibir)} />
            {cotizacion.margenUtilidadPct != null && (
              <Resumen label="Margen aplicado" value={formatPercent(cotizacion.margenUtilidadPct)} />
            )}
          </div>

          {tipo === "SERVICIO" && (
            <CostDetail
              lineas={cotizacion.lineas.map((l) => ({
                id: l.id,
                servicioNombre: l.servicio.nombre,
                costoRealTotal: l.costoRealTotal,
                precioVenta: l.precioVenta,
              }))}
            />
          )}
        </CardContent>
      </Card>

      {cotizacion.cuentaPorCobrar && (
        <Card>
          <CardHeader>
            <CardTitle>Cuenta por cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/pagos/cobrar/${cotizacion.cuentaPorCobrar.id}`}
              className="text-sm text-primary hover:underline"
            >
              Ver cuenta por cobrar →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Resumen({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-dim">{label}</p>
      <p className={`font-mono text-lg font-semibold tabular-nums ${accent ? "text-primary" : "text-text"}`}>
        {value}
      </p>
    </div>
  );
}
