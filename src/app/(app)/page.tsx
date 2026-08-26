import { listCotizaciones } from "@/lib/data/cotizaciones";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { ESTADO_COTIZACION_LABELS, type EstadoCotizacion } from "@/lib/enums";
import Link from "next/link";

const ESTADO_TONE: Record<EstadoCotizacion, "neutral" | "primary" | "success" | "danger"> = {
  BORRADOR: "neutral",
  ENVIADA: "primary",
  ACEPTADA: "success",
  RECHAZADA: "danger",
};

export default async function DashboardPage() {
  const cotizaciones = await listCotizaciones();

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const delMes = cotizaciones.filter((c) => c.createdAt >= inicioMes);
  const totalMes = delMes.reduce((sum, c) => sum + c.netoARecibir, 0);
  const aceptadasMes = delMes.filter((c) => c.estado === "ACEPTADA");
  const totalAceptado = aceptadasMes.reduce((sum, c) => sum + c.netoARecibir, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Dashboard de Cotización</h1>
          <p className="text-sm text-text-muted">Visión general de Multiservicios Yerves.</p>
        </div>
        <ButtonLink href="/cotizaciones/nueva">+ Nueva cotización</ButtonLink>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Cotizado este mes" value={formatCurrency(totalMes)} hint={`${delMes.length} cotización(es)`} accent />
        <StatTile label="Aceptado este mes" value={formatCurrency(totalAceptado)} hint={`${aceptadasMes.length} cotización(es)`} />
        <StatTile label="Total histórico" value={cotizaciones.length} hint="cotizaciones generadas" />
      </div>

      <Card>
        <CardHeader className="items-start justify-between">
          <CardTitle>Cotizaciones recientes</CardTitle>
          <Link href="/cotizaciones" className="text-xs text-primary hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                <th className="px-5 py-3 font-medium">Folio</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-text-dim">
                    Sin cotizaciones todavía.
                  </td>
                </tr>
              )}
              {cotizaciones.slice(0, 8).map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <Link href={`/cotizaciones/${c.id}`} className="font-mono text-primary hover:underline">
                      {c.folio}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-text">{c.cliente.nombreRazonSocial}</td>
                  <td className="px-5 py-3 text-text-muted">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={ESTADO_TONE[c.estado as EstadoCotizacion]}>
                      {ESTADO_COTIZACION_LABELS[c.estado as EstadoCotizacion]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-text">
                    {formatCurrency(c.netoARecibir)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
