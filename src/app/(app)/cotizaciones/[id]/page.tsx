import { ResumenItem } from "@/components/ui/resumen-item";
import { getCotizacion } from "@/lib/data/cotizaciones";
import { getSystemConfig } from "@/lib/data/config";
import { tasasMostradas, rotuloConTasa } from "@/lib/tasasCotizacion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnchorButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import {
  ESTADO_COTIZACION_LABELS,
  MODALIDAD_LABELS,
  TIPO_CLIENTE_LABELS,
  TIPO_COTIZACION_LABELS,
  etiquetaUnidad,
  type EstadoCotizacion,
  type Modalidad,
  type TipoCliente,
  type TipoCotizacion,
} from "@/lib/enums";
import { AccionesCotizacion } from "../acciones-cotizacion";
import { CostDetail } from "./cost-detail";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const [cotizacion, config] = await Promise.all([getCotizacion(id), getSystemConfig()]);
  const tipo = cotizacion.tipo as TipoCotizacion;
  // Tasas para los rótulos: deducidas de los montos guardados (la cotización no guarda tasas).
  const tasas = tasasMostradas(cotizacion, config);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/cotizaciones" className="w-fit text-sm text-text-muted hover:text-text">
        ← Cotizaciones
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold text-primary">{cotizacion.folio}</h1>
            <Badge tone="neutral">{TIPO_COTIZACION_LABELS[tipo]}</Badge>
            <Badge tone={cotizacion.estado === "ACEPTADA" ? "success" : "neutral"}>
              {ESTADO_COTIZACION_LABELS[cotizacion.estado as EstadoCotizacion]}
            </Badge>
            {cotizacion.esSoporte && (
              <Badge tone="neutral" title="Trámite interno del cliente, no es una venta.">
                Solo trámite
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {cotizacion.cliente.nombreRazonSocial} ·{" "}
            {TIPO_CLIENTE_LABELS[cotizacion.cliente.tipoCliente as TipoCliente]} ·{" "}
            {formatDate(cotizacion.createdAt)} · Vigente hasta {formatDate(cotizacion.fechaVigencia)}
          </p>
          {cotizacion.proyecto && <p className="text-sm text-text-dim">Proyecto: {cotizacion.proyecto}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AnchorButton href={`/api/cotizaciones/${cotizacion.id}/export?format=docx`} download>
            Exportar Word
          </AnchorButton>
          <AnchorButton href={`/api/cotizaciones/${cotizacion.id}/export?format=pdf`} download>
            Exportar PDF
          </AnchorButton>
          <AccionesCotizacion cotizacion={cotizacion} conPrincipal enDetalle />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
      {tipo === "SERVICIO" ? (
        <Card>
          <CardHeader>
            <CardTitle>Servicios cotizados</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
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
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                  <th className="px-5 py-3 font-medium">Clave SAT</th>
                  <th className="px-5 py-3 font-medium">Descripción</th>
                  <th className="px-5 py-3 font-medium">Cantidad</th>
                  <th className="px-5 py-3 text-right font-medium">Precio unitario</th>
                  <th className="px-5 py-3 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {cotizacion.lineasMaterial.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-mono text-text-muted">{l.claveSat || "—"}</td>
                    <td className="px-5 py-3 text-text">{l.descripcion}</td>
                    <td className="px-5 py-3 text-text-muted">
                      {l.cantidad} {etiquetaUnidad(l.unidadMedida)}
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

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <ResumenItem label="Subtotal" value={formatCurrency(cotizacion.subtotal)} />
              <ResumenItem label={rotuloConTasa("IVA trasladado", tasas.iva)} value={formatCurrency(cotizacion.iva)} />
              {cotizacion.retencionIsr > 0 && (
                <ResumenItem label={rotuloConTasa("Retención ISR", tasas.retencionIsr)} value={`- ${formatCurrency(cotizacion.retencionIsr)}`} />
              )}
              <ResumenItem label="Total" value={formatCurrency(cotizacion.netoARecibir)} accent />
              {cotizacion.margenUtilidadPct != null && (
                <ResumenItem label="Recargo aplicado" value={formatPercent(cotizacion.margenUtilidadPct)} />
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
      </div>
    </div>
  );
}
