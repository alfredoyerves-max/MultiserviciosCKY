import { listServicios } from "@/lib/data/servicios";
import { listPuestos } from "@/lib/data/puestos";
import { getSystemConfigConCeav } from "@/lib/data/config";
import { ServiciosTabs } from "./servicios-tabs";

export default async function ServiciosPage() {
  const [servicios, puestos, config] = await Promise.all([
    listServicios(),
    listPuestos(),
    getSystemConfigConCeav(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-module-servicios">Servicios</h1>
        <p className="text-sm text-text-muted">
          Catálogo de servicios y puestos de trabajo asociados.
        </p>
      </div>

      <ServiciosTabs servicios={servicios} puestos={puestos} config={config} />
    </div>
  );
}
