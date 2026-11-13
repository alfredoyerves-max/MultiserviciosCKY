import { listServiciosActivos, parseModalidades } from "@/lib/data/servicios";
import { listClientes } from "@/lib/data/clientes";
import { getSystemConfigConCeav } from "@/lib/data/config";
import { calcularCostoReal, costoRealPorModalidad } from "@/lib/costEngine";
import { sueldoMensualEfectivo, nombrePuestoEfectivo, esSueldoBajoMinimo } from "@/lib/servicioCosto";
import { MODALIDADES } from "@/lib/enums";
import { PageHeader } from "@/components/ui/page-header";
import { Wizard, type ServicioOption } from "./wizard";
import { requireSession } from "@/lib/auth/session";

export default async function NuevaCotizacionServicioPage() {
  await requireSession();
  const [servicios, clientes, config] = await Promise.all([
    listServiciosActivos(),
    listClientes(),
    getSystemConfigConCeav(),
  ]);

  const servicioOptions: ServicioOption[] = servicios.map((s) => {
    const sueldoMensual = sueldoMensualEfectivo(s);
    const costo = calcularCostoReal(config, {
      sueldoMensualPuesto: sueldoMensual,
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
      puestoNombre: nombrePuestoEfectivo(s),
      sueldoMensual,
      bajoMinimo: esSueldoBajoMinimo(sueldoMensual, config.salarioMinimoMensual),
      // El motor ya informa si aplicó el piso; no se vuelve a calcular.
      cargasSobreMinimo: costo.pisoSalarioMinimoAplicado,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nueva cotización de servicio"
        description="El precio se calcula a partir del costo real y el recargo."
      />

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
