import { listServicios } from "@/lib/data/servicios";
import { listPuestos } from "@/lib/data/puestos";
import { getSystemConfigConCeav } from "@/lib/data/config";
import { listCategorias } from "@/lib/data/catalogos";
import { PageHeader } from "@/components/ui/page-header";
import { ServiciosTabs } from "./servicios-tabs";
import { requireSession } from "@/lib/auth/session";

export default async function ServiciosPage() {
  await requireSession();
  const [servicios, puestos, config, categorias] = await Promise.all([
    listServicios(),
    listPuestos(),
    getSystemConfigConCeav(),
    listCategorias("SERVICIO"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Servicios" description="Catálogo de servicios y puestos de trabajo asociados." />

      <ServiciosTabs servicios={servicios} puestos={puestos} config={config} categorias={categorias} />
    </div>
  );
}
