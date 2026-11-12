import { listProductosActivos } from "@/lib/data/productos";
import { listClientes } from "@/lib/data/clientes";
import { getSystemConfigConCeav } from "@/lib/data/config";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Nueva cotización de material"
        description="Captura cada línea o precárgala desde un producto guardado."
      />

      <Wizard
        productos={productos}
        clientes={clientes}
        ivaPct={config.ivaPct}
        retencionIsrPct={config.retencionIsrPct}
      />
    </div>
  );
}
