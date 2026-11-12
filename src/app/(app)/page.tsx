import { listCotizaciones } from "@/lib/data/cotizaciones";
import { listCuentasPorCobrar } from "@/lib/data/cuentasPorCobrar";
import { getSystemConfig } from "@/lib/data/config";
import { calcularSaldo, estaVencida } from "@/lib/cuentas";
import { StatTile } from "@/components/ui/stat-tile";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NuevaCotizacionMenu } from "@/components/layout/nueva-cotizacion-menu";
import { DashboardControls, type VistaDashboard } from "./dashboard-controls";
import { formatCurrency, formatDate } from "@/lib/format";
import { ESTADO_COTIZACION_LABELS, type EstadoCotizacion, type TipoCotizacion } from "@/lib/enums";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";

const ESTADO_TONE: Record<EstadoCotizacion, "neutral" | "primary" | "success" | "danger"> = {
  BORRADOR: "neutral",
  ENVIADA: "primary",
  ACEPTADA: "success",
  RECHAZADA: "danger",
};

/** Días de anticipación para la alerta de cotizaciones por vencer. */
const DIAS_ALERTA_VIGENCIA = 3;

function mesLabel(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vista?: string }>;
}) {
  await requireSession();
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

  // "Por cobrar" — cuentas no canceladas cuya fecha de vencimiento cae en el
  // rango seleccionado. Se separan por el tipo de la cotización que las originó.
  const porCobrarRango = cuentasPorCobrar.filter(
    (cc) => !cc.cancelada && cc.fechaVencimiento >= inicio && cc.fechaVencimiento < finExclusivo
  );

  /** Cotizado / Aceptado / Por cobrar de un tipo de cotización en el rango. */
  function kpisDe(tipo: TipoCotizacion) {
    const cot = delRango.filter((c) => c.tipo === tipo);
    const aceptadas = cot.filter((c) => c.estado === "ACEPTADA");
    const cuentas = porCobrarRango.filter((cc) => cc.cotizacion.tipo === tipo);
    return {
      cotizado: cot.reduce((sum, c) => sum + c.netoARecibir, 0),
      nCotizadas: cot.length,
      aceptado: aceptadas.reduce((sum, c) => sum + c.netoARecibir, 0),
      nAceptadas: aceptadas.length,
      porCobrar: cuentas.reduce((sum, cc) => sum + calcularSaldo(cc.montoTotal, cc.abonos), 0),
      nCuentas: cuentas.length,
    };
  }
  const servicio = kpisDe("SERVICIO");
  const material = kpisDe("MATERIAL");

  // Alertas (no dependen del mes elegido: son lo que requiere atención hoy).
  const inicioHoy = new Date(hoy);
  inicioHoy.setHours(0, 0, 0, 0);
  // Cotizaciones abiertas (Borrador o Enviada) según su vigencia: ya vencidas
  // (rojo) o que vencen hoy o en los próximos 3 días (ámbar). Son dos alertas
  // distintas que nunca se cuentan juntas.
  const abiertas = cotizaciones.filter((c) => c.estado === "BORRADOR" || c.estado === "ENVIADA");
  const diasParaVencer = (c: { fechaVigencia: Date }) => {
    const venc = new Date(c.fechaVigencia);
    venc.setHours(0, 0, 0, 0);
    return Math.round((venc.getTime() - inicioHoy.getTime()) / 86400000);
  };
  const vencidas = abiertas.filter((c) => diasParaVencer(c) < 0);
  const porVencer = abiertas.filter((c) => {
    const dias = diasParaVencer(c);
    return dias >= 0 && dias <= DIAS_ALERTA_VIGENCIA;
  });
  const cuentasVencidas = cuentasPorCobrar.filter(
    (cc) => !cc.cancelada && estaVencida(cc.fechaVencimiento, calcularSaldo(cc.montoTotal, cc.abonos))
  );
  const montoVencido = cuentasVencidas.reduce((sum, cc) => sum + calcularSaldo(cc.montoTotal, cc.abonos), 0);

  const labelSufijo = vista === "anual" ? `en ${anio}` : "este mes";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Visión general de Carlos Yerves Multiservicios" />

      <DashboardControls mes={mesParam} mesMinimo={mesMinimo} vista={vista} />

      {/* Alertas — solo aparecen cuando hay algo que atender. */}
      {(vencidas.length > 0 || porVencer.length > 0 || cuentasVencidas.length > 0) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {vencidas.length > 0 && (
            <Link
              href="/cotizaciones"
              className="rounded-xl border border-danger-strong/50 bg-danger-strong/10 px-4 py-3 transition-colors hover:bg-danger-strong/15"
            >
              <p className="text-sm font-semibold text-danger">{vencidas.length} cotización(es) vencida(s)</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Borradores y enviadas cuya vigencia ya pasó. Ver tablero →
              </p>
            </Link>
          )}
          {porVencer.length > 0 && (
            <Link
              href="/cotizaciones"
              className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 transition-colors hover:bg-warning/15"
            >
              <p className="text-sm font-semibold text-warning-soft">
                {porVencer.length} cotización(es) vencen en {DIAS_ALERTA_VIGENCIA} días o menos
              </p>
              <p className="mt-0.5 text-xs text-text-muted">Vencen hoy o en los próximos días. Ver tablero →</p>
            </Link>
          )}
          {cuentasVencidas.length > 0 && (
            <Link
              href="/pagos"
              className="rounded-xl border border-danger-strong/50 bg-danger-strong/10 px-4 py-3 transition-colors hover:bg-danger-strong/15"
            >
              <p className="text-sm font-semibold text-danger">
                {cuentasVencidas.length} cuenta(s) por cobrar vencida(s) · {formatCurrency(montoVencido)}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">Saldo pendiente con fecha de vencimiento pasada. Ver Finanzas →</p>
            </Link>
          )}
        </div>
      )}

      {[
        { titulo: "Servicio", k: servicio },
        { titulo: "Material", k: material },
      ].map(({ titulo, k }) => (
        <section key={titulo} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">{titulo}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label={`Cotizado ${labelSufijo}`}
              value={formatCurrency(k.cotizado)}
              hint={`${k.nCotizadas} cotización(es)`}
              accent
            />
            <StatTile
              label={`Aceptado ${labelSufijo}`}
              value={formatCurrency(k.aceptado)}
              hint={`${k.nAceptadas} cotización(es)`}
            />
            <StatTile
              label={`Por cobrar ${labelSufijo}`}
              value={formatCurrency(k.porCobrar)}
              hint={`${k.nCuentas} cuenta(s) por vencer`}
            />
          </div>
        </section>
      ))}

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
              {delRango.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title={vista === "anual" ? `Sin cotizaciones en ${anio}.` : "Sin cotizaciones este mes."}
                      description="Crea una cotización de servicio o de material para empezar a ver cifras aquí."
                      action={<NuevaCotizacionMenu />}
                    />
                  </td>
                </tr>
              )}
              {delRango.slice(0, 8).map((c) => (
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
