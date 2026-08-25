import { getSystemConfig, getCeavBandas } from "@/lib/data/config";
import { ConfigForm } from "./config-form";

export default async function ConfiguracionPage() {
  const [config, bandasCeav] = await Promise.all([getSystemConfig(), getCeavBandas()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Configuración General</h1>
        <p className="text-sm text-text-muted">
          Parámetros que alimentan todos los cálculos de costo real y cotización. Se
          actualizan cada año.
        </p>
      </div>

      <ConfigForm config={config} bandasCeav={bandasCeav} />
    </div>
  );
}
