import { listProductosActivosConMovimientos } from "@/lib/data/productos";
import { listClientes } from "@/lib/data/clientes";
import { getSystemConfigConCeav } from "@/lib/data/config";
import { Wizard } from "./wizard";

export default async function NuevaCotizacionMaterialPage() {
  const [productos, clientes, config] = await Promise.all([
    listProductosActivosConMovimientos(),
    listClientes(),
    getSystemConfigConCeav(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Nueva cotización de material</h1>
        <p className="text-sm text-text-muted">
          Venta de productos del catálogo de Inventario. Al aceptarse, el stock se descuenta
          automáticamente.
        </p>
      </div>

      <Wizard
        productos={productos}
        clientes={clientes}
        ivaPct={config.ivaPct}
        retencionIsrPct={config.retencionIsrPct}
      />
    </div>
  );
}
