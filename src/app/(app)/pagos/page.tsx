import { listCuentasPorCobrar } from "@/lib/data/cuentasPorCobrar";
import { listCuentasPorPagar } from "@/lib/data/cuentasPorPagar";
import { calcularSaldo, estaVencida } from "@/lib/cuentas";
import { StatTile } from "@/components/ui/stat-tile";
import { AnchorButton } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { PagosTabs } from "./pagos-tabs";

export default async function PagosPage() {
  const [cuentasPorCobrar, cuentasPorPagar] = await Promise.all([
    listCuentasPorCobrar(),
    listCuentasPorPagar(),
  ]);

  // Las cuentas por cobrar canceladas no cuentan en ningún KPI — se
  // conservan solo para auditoría (ver su historial en el detalle).
  const totalPorCobrar = cuentasPorCobrar
    .filter((c) => !c.cancelada)
    .reduce((sum, c) => sum + calcularSaldo(c.montoTotal, c.abonos), 0);
  const totalPorPagar = cuentasPorPagar.reduce(
    (sum, c) => sum + calcularSaldo(c.montoTotal, c.abonos),
    0
  );

  const vencidoCobrar = cuentasPorCobrar
    .filter((c) => !c.cancelada)
    .reduce((sum, c) => {
      const saldo = calcularSaldo(c.montoTotal, c.abonos);
      return estaVencida(c.fechaVencimiento, saldo) ? sum + saldo : sum;
    }, 0);
  const vencidoPagar = cuentasPorPagar.reduce((sum, c) => {
    const saldo = calcularSaldo(c.montoTotal, c.abonos);
    return estaVencida(c.fechaVencimiento, saldo) ? sum + saldo : sum;
  }, 0);
  const totalVencido = vencidoCobrar + vencidoPagar;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-module-pagos">Pagos y Cobros</h1>
          <p className="text-sm text-text-muted">
            Cuentas por cobrar y por pagar, con abonos parciales y seguimiento de vencimiento.
          </p>
        </div>
        <AnchorButton href="/api/pagos/export" download>
          Exportar a Excel
        </AnchorButton>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total por cobrar" value={formatCurrency(totalPorCobrar)} accent />
        <StatTile label="Total por pagar" value={formatCurrency(totalPorPagar)} />
        <StatTile
          label="Total vencido"
          value={formatCurrency(totalVencido)}
          hint={totalVencido > 0 ? "Entre cobrar y pagar" : undefined}
        />
      </div>

      <PagosTabs cuentasPorCobrar={cuentasPorCobrar} cuentasPorPagar={cuentasPorPagar} />
    </div>
  );
}
