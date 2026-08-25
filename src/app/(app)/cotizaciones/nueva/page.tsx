import { listServiciosActivos, parseModalidades } from "@/lib/data/servicios";
import { listClientes } from "@/lib/data/clientes";
import { getSystemConfigConCeav } from "@/lib/data/config";
import { calcularCostoReal, costoRealPorModalidad } from "@/lib/costEngine";
import { sueldoMensualEfectivo } from "@/lib/servicioCosto";
import { MODALIDADES } from "@/lib/enums";
import { Wizard, type ServicioOption } from "./wizard";

export default async function NuevaCotizacionPage() {
  const [servicios, clientes, config] = await Promise.all([
    listServiciosActivos(),
    listClientes(),
    getSystemConfigConCeav(),
  ]);

  const servicioOptions: ServicioOption[] = servicios.map((s) => {
    const costo = calcularCostoReal(config, {
      sueldoMensualPuesto: sueldoMensualEfectivo(s),
      incluyeUniforme: s.incluyeUniforme,
      costoUniforme: s.costoUniforme,
      vidaUtilUniformeMeses: s.vidaUtilUniformeMeses,
      incluyeMaterial: s.incluyeMaterial,
      costoMaterial: s.costoMaterial,
      vidaUtilMaterialMeses: s.vidaUtilMaterialMeses,
    });

    const costoPorModalidad = Object.fromEntries(
      MODALIDADES.map((m) => [m, costoRealPorModalidad(costo, m) * s.personalPorUnidad])
    ) as Record<(typeof MODALIDADES)[number], number>;

    return {
      id: s.id,
      nombre: s.nombre,
      categoria: s.categoria,
      modalidadesDisponibles: parseModalidades(s.modalidadesJson),
      costoPorModalidad,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Nueva cotización</h1>
        <p className="text-sm text-text-muted">
          El precio de venta se calcula automáticamente a partir del costo real y el
          margen — el desglose de costo nunca aparece en el documento final del cliente.
        </p>
      </div>

      <Wizard
        servicios={servicioOptions}
        clientes={clientes}
        margenDefaultPct={Math.round(config.margenUtilidadDefaultPct * 10000) / 100}
        ivaPct={config.ivaPct}
        retencionIsrPct={config.retencionIsrPct}
      />
    </div>
  );
}
