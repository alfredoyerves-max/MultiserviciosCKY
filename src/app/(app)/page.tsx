import { listCotizaciones } from "@/lib/data/cotizaciones";
import { listCuentasPorCobrar } from "@/lib/data/cuentasPorCobrar";
import { getSystemConfig } from "@/lib/data/config";
import { calcularSaldo } from "@/lib/cuentas";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardControls, type VistaDashboard } from "./dashboard-controls";
import { formatCurrency, formatDate } from "@/lib/format";
import { ESTADO_COTIZACION_LABELS, type EstadoCotizacion } from "@/lib/enums";
import Link from "next/link";

const ESTADO_TONE: Record<EstadoCotizacion, "neutral" | "primary" | "success" | "danger"> = {
  BORRADOR: "neutral",
  ENVIADA: "primary",
  ACEPTADA: "success",
  RECHAZADA: "danger",
};

function mesLabel(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vista?: string }>;
}) {
  const sp = await searchParams;
  const [cotizaciones, cuentasPorCobrar, config] = await Promise.all([
    listCotizaciones(),
    listCuentasPorCobrar(),
    getSystemConfig(),
  ]);

  const hoy = new Date();
  const mesActual = mesLabel(hoy.getFullYear(), hoy.getMonth() + 1);
  const mesParam = sp.mes ?? mesActual;
  const [anioStr, mesStr] = mesParam.split("-");
  const anio = Number(anioStr) || hoy.getFullYear();
  const mes = Number(mesStr) || hoy.getMonth() + 1;
  const vista: VistaDashboard = sp.vista === "anual" ? "anual" : "mensual";

  // Rango de navegación: no tiene sentido ir antes de que existiera el
  // sistema, ni tampoco a un mes futuro. La fecha "de creación" es la de
  // SystemConfig — salvo que exista una cotización todavía más antigua
  // (no debería pasar en operación normal, pero se cubre por si acaso).
  const fechaMasAntigua = cotizaciones.reduce(
    (min, c) => (c.createdAt < min ? c.createdAt : min),
    config.createdAt
  );
  const mesMinimo = mesLabel(fechaMasAntigua.getFullYear(), fechaMasAntigua.getMonth() + 1);

  const inicio = vista === "anual" ? new Date(anio, 0, 1) : new Date(anio, mes - 1, 1);
  const finExclusivo = vista === "anual" ? new Date(anio + 1, 0, 1) : new Date(anio, mes, 1);

  const delRango = cotizaciones.filter((c) => c.createdAt >= inicio && c.createdAt < finExclusivo);
  const totalRango = delRango.reduce((sum, c) => sum + c.netoARecibir, 0);
  const aceptadasRango = delRango.filter((c) => c.estado === "ACEPTADA");
  const totalAceptado = aceptadasRango.reduce((sum, c) => sum + c.netoARecibir, 0);

  // "Por cobrar" — cuentas no canceladas cuya fecha de vencimiento cae en
  // el rango seleccionado, sin importar si la cotización que las originó
  // fue de servicio o material (se lee de CuentaPorCobrar directamente,
  // no del tipo de la cotización).
  const porCobrarRango = cuentasPorCobrar.filter(
    (cc) => !cc.cancelada && cc.fechaVencimiento >= inicio && cc.fechaVencimiento < finExclusivo
  );
  const totalPorCobrar = porCobrarRango.reduce((sum, cc) => sum + calcularSaldo(cc.montoTotal, cc.abonos), 0);

  const labelSufijo = vista === "anual" ? `en ${anio}` : "este mes";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Dashboard de Cotización</h1>
          <p className="text-sm text-text-muted">Visión general de Multiservicios Yerves.</p>
        </div>
        <ButtonLink href="/cotizaciones/nueva">+ Nueva cotización</ButtonLink>
      </div>

      <DashboardControls mes={mesParam} mesMinimo={mesMinimo} vista={vista} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label={`Cotizado ${labelSufijo}`}
          value={formatCurrency(totalRango)}
          hint={`${delRango.length} cotización(es)`}
          accent
        />
        <StatTile
          label={`Aceptado ${labelSufijo}`}
          value={formatCurrency(totalAceptado)}
          hint={`${aceptadasRango.length} cotización(es)`}
        />
        <StatTile
          label={`Por cobrar ${labelSufijo}`}
          value={formatCurrency(totalPorCobrar)}
          hint={`${porCobrarRango.length} cuenta(s) por vencer`}
        />
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
                  <td colSpan={5}>
                    <EmptyState
                      title="Sin cotizaciones todavía."
                      action={<ButtonLink href="/cotizaciones/nueva" size="sm">+ Nueva cotización</ButtonLink>}
                    />
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
