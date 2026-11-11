import { listProductosActivos } from "@/lib/data/productos";
import { listClientes } from "@/lib/data/clientes";
import { getSystemConfigConCeav } from "@/lib/data/config";
import { Wizard } from "./wizard";
import { requireSession } from "@/lib/auth/session";

export default async function NuevaCotizacionMaterialPage() {
  await requireSession();
  const [productos, clientes, config] = await Promise.all([
    listProductosActivos(),
    listClientes(),
    getSystemConfigConCeav(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Nueva cotización de material</h1>
        <p className="text-sm text-text-muted">
          Captura cada línea directo (descripción, unidad, cantidad, precio). Puedes
          precargarla desde un producto guardado, pero no es obligatorio.
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
