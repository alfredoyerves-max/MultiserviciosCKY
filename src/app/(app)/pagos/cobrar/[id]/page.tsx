import { getCuentaPorCobrar } from "@/lib/data/cuentasPorCobrar";
import { calcularSaldo, calcularEstadoCuenta, estaVencida, ESTADO_CUENTA_LABELS_COBRAR } from "@/lib/cuentas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { TIPO_CLIENTE_LABELS, type TipoCliente } from "@/lib/enums";
import { registrarAbonoPorCobrarAction } from "../../actions";
import { AbonoForm } from "../../abono-form";
import { AccionesCuenta } from "./acciones-cuenta";
import Link from "next/link";

const ESTADO_TONE = {
  PENDIENTE: "neutral",
  PARCIAL: "primary",
  PAGADA: "success",
  CANCELADA: "neutral",
} as const;

export default async function CuentaPorCobrarDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cuenta = await getCuentaPorCobrar(id);

  const saldo = calcularSaldo(cuenta.montoTotal, cuenta.abonos);
  const estado = calcularEstadoCuenta(cuenta.montoTotal, cuenta.abonos, cuenta.cancelada);
  const vencida = !cuenta.cancelada && estaVencida(cuenta.fechaVencimiento, saldo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-text">Cuenta por cobrar</h1>
            <Badge tone={ESTADO_TONE[estado]}>{ESTADO_CUENTA_LABELS_COBRAR[estado]}</Badge>
            {vencida && <Badge tone="danger">Vencida</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {cuenta.cotizacion.cliente.nombreRazonSocial} ·{" "}
            {TIPO_CLIENTE_LABELS[cuenta.cotizacion.cliente.tipoCliente as TipoCliente]} · Vence{" "}
            {formatDate(cuenta.fechaVencimiento)}
          </p>
          <p className="mt-1 text-sm">
            Generada de la cotización{" "}
            <Link href={`/cotizaciones/${cuenta.cotizacionId}`} className="font-mono text-primary hover:underline">
              {cuenta.cotizacion.folio}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!cuenta.cancelada && (
            <AccionesCuenta cuentaId={cuenta.id} tieneAbonos={cuenta.abonos.length > 0} />
          )}
          <ButtonLink href="/pagos" variant="secondary" size="sm">
            ← Volver
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Resumen label="Monto total" value={formatCurrency(cuenta.montoTotal)} />
        <Resumen label="Abonado" value={formatCurrency(cuenta.montoTotal - saldo)} />
        <Resumen label="Saldo pendiente" value={formatCurrency(saldo)} accent />
      </div>

      {cuenta.cancelada && (
        <p className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
          Esta cuenta está cancelada — no cuenta en los totales de &quot;por cobrar&quot;/&quot;vencido&quot;
          y ya no admite abonos nuevos. Su historial se conserva abajo para auditoría.
        </p>
      )}

      {!cuenta.cancelada && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar abono</CardTitle>
          </CardHeader>
          <CardContent>
            <AbonoForm cuentaId={cuenta.id} action={registrarAbonoPorCobrarAction} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial de abonos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cuenta.abonos.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-text-dim">Sin abonos todavía.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Nota</th>
                  <th className="px-5 py-3 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {cuenta.abonos.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-text-muted">{formatDate(a.fecha)}</td>
                    <td className="px-5 py-3 text-text-dim">{a.nota || "—"}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-text">
                      {formatCurrency(a.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
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
