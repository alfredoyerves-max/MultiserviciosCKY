import { listProductosConMovimientos } from "@/lib/data/productos";
import { listActivos } from "@/lib/data/activos";
import { listUnidades } from "@/lib/data/catalogos";
import { PageHeader } from "@/components/ui/page-header";
import { InventarioTabs } from "./inventario-tabs";
import { requireSession } from "@/lib/auth/session";

export default async function InventarioPage() {
  await requireSession();
  const [productos, activos, unidades] = await Promise.all([
    listProductosConMovimientos(),
    listActivos(),
    listUnidades(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario y Activos"
        description="Catálogo de productos, control de almacén y activos de la empresa."
      />

      <InventarioTabs productos={productos} activos={activos} unidades={unidades} />
    </div>
  );
}
