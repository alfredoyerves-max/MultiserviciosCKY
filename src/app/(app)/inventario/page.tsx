import { listProductosConMovimientos } from "@/lib/data/productos";
import { listActivos } from "@/lib/data/activos";
import { InventarioTabs } from "./inventario-tabs";

export default async function InventarioPage() {
  const [productos, activos] = await Promise.all([listProductosConMovimientos(), listActivos()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Inventario y Activos</h1>
        <p className="text-sm text-text-muted">
          Catálogo de productos y control de almacén — materiales para reventa y de uso interno
          comparten el mismo inventario.
        </p>
      </div>

      <InventarioTabs productos={productos} activos={activos} />
    </div>
  );
}
