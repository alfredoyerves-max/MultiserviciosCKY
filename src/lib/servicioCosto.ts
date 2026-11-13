// Helpers puros (sin Prisma) para resolver el sueldo/nombre de mano de
// obra de un Servicio, sin importar si viene de un Puesto guardado o de un
// sueldo capturado directo en el formulario (Addendum v4 punto 4).

import { calcularCostoReal, type CostConfigInput } from "@/lib/costEngine";

export interface ServicioMoDeObra {
  puesto: { nombre: string; sueldoMensual: number } | null;
  sueldoMensualInline: number | null;
  nombrePuestoInline: string | null;
}

export function sueldoMensualEfectivo(servicio: ServicioMoDeObra): number {
  return servicio.puesto?.sueldoMensual ?? servicio.sueldoMensualInline ?? 0;
}

export function nombrePuestoEfectivo(servicio: ServicioMoDeObra): string {
  return servicio.puesto?.nombre ?? servicio.nombrePuestoInline ?? "(sin puesto)";
}

export function esSueldoBajoMinimo(sueldoMensual: number, salarioMinimoMensual: number): boolean {
  return sueldoMensual < salarioMinimoMensual;
}

/** Servicio con los campos que alimentan al motor de costo. */
export interface ServicioParaCosto extends ServicioMoDeObra {
  incluyeUniforme: boolean;
  costoUniforme: number | null;
  vidaUtilUniformeMeses: number | null;
  incluyeMaterial: boolean;
  costoMaterial: number | null;
  vidaUtilMaterialMeses: number | null;
}

/** Costo real de un servicio con la configuración vigente (usa el motor tal
 *  cual; solo arma sus entradas). Una sola definición para la tabla, la
 *  tarjeta de celular y las verificaciones. */
export function costoDeServicio(servicio: ServicioParaCosto, config: CostConfigInput) {
  const sueldoMensual = sueldoMensualEfectivo(servicio);
  const costo = calcularCostoReal(config, {
    sueldoMensualPuesto: sueldoMensual,
    incluyeUniforme: servicio.incluyeUniforme,
    costoUniforme: servicio.costoUniforme,
    vidaUtilUniformeMeses: servicio.vidaUtilUniformeMeses,
    incluyeMaterial: servicio.incluyeMaterial,
    costoMaterial: servicio.costoMaterial,
    vidaUtilMaterialMeses: servicio.vidaUtilMaterialMeses,
  });
  return {
    costo,
    bajoMinimo: esSueldoBajoMinimo(sueldoMensual, config.salarioMinimoMensual),
    // El motor ya dice si aplicó el piso (SBC integrado < mínimo); no se recalcula aquí.
    cargasSobreMinimo: costo.pisoSalarioMinimoAplicado,
  };
}

/** Dos avisos distintos: (1) el sueldo pactado es menor al mínimo; (2) además, el SBC integrado también queda debajo y las cargas se calcularon sobre el mínimo. */
export const TEXTO_SUELDO_BAJO = "Sueldo por debajo del mínimo legal";
export const TEXTO_CARGAS_SOBRE_MINIMO = "Cargas calculadas sobre el mínimo legal";

/** Texto del aviso según cuáles de las dos condiciones se cumplen (undefined si ninguna). */
export function textoAvisoSueldo(a: { bajoMinimo: boolean; cargasSobreMinimo: boolean }): string | undefined {
  if (a.bajoMinimo && a.cargasSobreMinimo) return `${TEXTO_SUELDO_BAJO} · ${TEXTO_CARGAS_SOBRE_MINIMO}`;
  if (a.bajoMinimo) return TEXTO_SUELDO_BAJO;
  if (a.cargasSobreMinimo) return TEXTO_CARGAS_SOBRE_MINIMO;
  return undefined;
}
