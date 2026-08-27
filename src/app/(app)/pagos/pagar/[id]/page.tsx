import { getCuentaPorPagar } from "@/lib/data/cuentasPorPagar";
import { calcularSaldo, calcularEstadoCuenta, estaVencida, ESTADO_CUENTA_LABELS_PAGAR } from "@/lib/cuentas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatCurrency, formatDate } from "@/lib/format";
import { registrarAbonoPorPagarAction } from "../../actions";
import { AbonoForm } from "../../abono-form";

// CANCELADA nunca ocurre en Cuentas por Pagar (ese estado es exclusivo de
// Cuentas por Cobrar), pero el tipo EstadoCuenta es compartido, así que el
// Record debe cubrir la unión completa.
const ESTADO_TONE = {
  PENDIENTE: "neutral",
  PARCIAL: "primary",
  PAGADA: "success",
  CANCELADA: "neutral",
} as const;

export default async function CuentaPorPagarDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cuenta = await getCuentaPorPagar(id);

  const saldo = calcularSaldo(cuenta.montoTotal, cuenta.abonos);
  const estado = calcularEstadoCuenta(cuenta.montoTotal, cuenta.abonos);
  const vencida = estaVencida(cuenta.fechaVencimiento, saldo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-text">{cuenta.concepto}</h1>
            <Badge tone={ESTADO_TONE[estado]}>{ESTADO_CUENTA_LABELS_PAGAR[estado]}</Badge>
            {vencida && <Badge tone="danger">Vencida</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {cuenta.proveedor} · Vence {formatDate(cuenta.fechaVencimiento)}
          </p>
        </div>
        <ButtonLink href="/pagos" variant="secondary" size="sm">
          ← Volver
        </ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Resumen label="Monto total" value={formatCurrency(cuenta.montoTotal)} />
        <Resumen label="Abonado" value={formatCurrency(cuenta.montoTotal - saldo)} />
        <Resumen label="Saldo pendiente" value={formatCurrency(saldo)} accent />
      </div>
      <ProgressBar pct={cuenta.montoTotal > 0 ? ((cuenta.montoTotal - saldo) / cuenta.montoTotal) * 100 : 0} />

      <Card>
        <CardHeader>
          <CardTitle>Registrar abono</CardTitle>
        </CardHeader>
        <CardContent>
          <AbonoForm cuentaId={cuenta.id} action={registrarAbonoPorPagarAction} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de abonos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cuenta.abonos.length === 0 ? (
            <EmptyState title="Sin abonos todavía." />
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
