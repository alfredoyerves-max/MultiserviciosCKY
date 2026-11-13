import { listCuentasPorCobrar } from "@/lib/data/cuentasPorCobrar";
import { listCuentasPorPagar } from "@/lib/data/cuentasPorPagar";
import { calcularSaldo, estaVencida } from "@/lib/cuentas";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { AnchorButton } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { PagosTabs } from "./pagos-tabs";
import { requireSession } from "@/lib/auth/session";

export default async function PagosPage() {
  await requireSession();
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finanzas"
        description="Cuentas por cobrar y por pagar, con abonos y seguimiento de vencimiento."
        action={
          <AnchorButton href="/api/pagos/export" download>
            Exportar a Excel
          </AnchorButton>
        }
      />

      {/* Cobrar y pagar no se suman entre sí: cada tarjeta lleva su propio vencido. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Total por cobrar"
          value={formatCurrency(totalPorCobrar)}
          hint={`Vencido: ${formatCurrency(vencidoCobrar)}`}
          accent
        />
        <StatTile
          label="Total por pagar"
          value={formatCurrency(totalPorPagar)}
          hint={`Vencido: ${formatCurrency(vencidoPagar)}`}
        />
      </div>

      <PagosTabs cuentasPorCobrar={cuentasPorCobrar} cuentasPorPagar={cuentasPorPagar} />
    </div>
  );
}
