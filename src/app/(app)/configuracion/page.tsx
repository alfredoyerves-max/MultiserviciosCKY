import { getSystemConfig, getCeavBandas } from "@/lib/data/config";
import { listCuentasBancarias } from "@/lib/data/cuentasBancarias";
import { listCategorias, listUnidades, listClavesSat } from "@/lib/data/catalogos";
import { PageHeader } from "@/components/ui/page-header";
import { ConfigForm } from "./config-form";
import { requireSession } from "@/lib/auth/session";

export default async function ConfiguracionPage() {
  await requireSession();
  const [config, bandasCeav, cuentasBancarias, categorias, unidades, claves] = await Promise.all([
    getSystemConfig(),
    getCeavBandas(),
    listCuentasBancarias(),
    listCategorias("SERVICIO"),
    listUnidades(),
    listClavesSat(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Parámetros que alimentan los cálculos de costo y las cotizaciones."
      />

      <ConfigForm
        config={config}
        bandasCeav={bandasCeav}
        cuentasBancarias={cuentasBancarias}
        catalogos={{ categorias, unidades, claves }}
      />
    </div>
  );
}
