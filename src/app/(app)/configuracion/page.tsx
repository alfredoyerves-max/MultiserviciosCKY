import { getSystemConfig, getCeavBandas } from "@/lib/data/config";
import { listCuentasBancarias } from "@/lib/data/cuentasBancarias";
import { ConfigForm } from "./config-form";
import { requireSession } from "@/lib/auth/session";

export default async function ConfiguracionPage() {
  await requireSession();
  const [config, bandasCeav, cuentasBancarias] = await Promise.all([
    getSystemConfig(),
    getCeavBandas(),
    listCuentasBancarias(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Configuración General</h1>
        <p className="text-sm text-text-muted">
          Parámetros que alimentan todos los cálculos de costo real y cotización. Se
          actualizan cada año.
        </p>
      </div>

      <ConfigForm config={config} bandasCeav={bandasCeav} cuentasBancarias={cuentasBancarias} />
    </div>
  );
}
