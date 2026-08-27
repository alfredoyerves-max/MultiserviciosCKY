// Motor de costo real del empleado (Fase 2 del spec).
// Funciones puras, sin dependencias de UI ni de base de datos, para poder
// verificarlas a mano contra las fórmulas del documento de especificación.

import {
  IMSS_ENF_MAT_CUOTA_FIJA_PCT,
  IMSS_ENF_MAT_CUOTA_ADIC_PCT,
  IMSS_PRESTACIONES_DINERO_PCT,
  IMSS_GASTOS_MED_PENS_PCT,
  IMSS_INVALIDEZ_VIDA_PCT,
  IMSS_GUARDERIAS_PCT,
  IMSS_RETIRO_PCT,
  INFONAVIT_PCT,
} from "./imssConstants";

/** Una banda de la tabla CEAV (ver modelo Prisma CeavBanda). */
export interface CeavBandaInput {
  orden: number;
  etiqueta: string;
  unidadLimite: "SALARIO_MINIMO" | "UMA";
  limiteSuperior: number | null;
  porcentajePatronal: number;
}

export interface CostConfigInput {
  umaDiaria: number;
  topeSbcUmas: number;
  salarioMinimoMensual: number;
  primaRiesgoPct: number;
  isnPct: number;
  impuestoAdicionalPct: number;
  // Factor de integración por antigüedad — Addendum v4 punto 2: DECISIÓN
  // CONSCIENTE (confirmada con el dueño), no un pendiente. No se agrega
  // tracking de antigüedad por empleado; se usa siempre el factor de año 1
  // (15 días aguinaldo, 12 días vacaciones, prima vacacional 25%) porque la
  // mayoría del personal es de nuevo ingreso. Sin cambios de schema.
  diasAguinaldo: number;
  diasVacaciones: number;
  primaVacacionalPct: number;
  horasPorDia: number;
  diasPorSemana: number;
  /** Tabla CEAV vigente — ver Addendum v4 punto 1. Orden 1→8, evaluada en
   *  ese orden hasta encontrar la primera banda cuyo tope no se exceda. */
  bandasCeav: CeavBandaInput[];
}

/**
 * Busca la banda CEAV aplicable a un SBC mensual. Las bandas 1-2 se
 * comparan contra el salario mínimo mensual; las bandas 3-8 contra la UMA
 * mensual — ver el comentario en el modelo Prisma CeavBanda sobre por qué
 * esto no es un rango monótono en pesos.
 */
export function buscarBandaCeav(
  bandas: CeavBandaInput[],
  sbcMensual: number,
  salarioMinimoMensual: number,
  umaMensual: number
): CeavBandaInput {
  const ordenadas = [...bandas].sort((a, b) => a.orden - b.orden);
  for (const banda of ordenadas) {
    if (banda.limiteSuperior == null) return banda; // última banda, sin tope
    const limitePesos =
      banda.unidadLimite === "SALARIO_MINIMO"
        ? banda.limiteSuperior * salarioMinimoMensual
        : banda.limiteSuperior * umaMensual;
    if (sbcMensual <= limitePesos) return banda;
  }
  // Defensivo: si por algún motivo ninguna banda tiene tope null (tabla
  // mal sembrada), usamos la última en orden.
  return ordenadas[ordenadas.length - 1];
}

export interface CostServicioInput {
  sueldoMensualPuesto: number;
  incluyeUniforme: boolean;
  costoUniforme?: number | null;
  vidaUtilUniformeMeses?: number | null;
  incluyeMaterial: boolean;
  costoMaterial?: number | null;
  vidaUtilMaterialMeses?: number | null;
}

export interface CostoRealResult {
  sueldoDiario: number;
  aguinaldoDiario: number;
  primaVacDiario: number;
  sdi: number;
  sdiTopado: boolean;
  /** SBC mensual real — calculado a partir del sueldo pactado, sin piso. */
  sbcMensual: number;
  /** max(sbcMensual, salario mínimo mensual vigente) — Art. 28 LSS: la
   *  base de cálculo de TODAS las cargas patronales nunca puede ser menor
   *  al salario mínimo, sin importar qué tan bajo sea el sueldo pactado.
   *  El sueldo real que se le paga al trabajador (remuneracionMensualTotal
   *  abajo) nunca se toca — el piso solo afecta esta base fiscal. */
  baseCalculoFiscal: number;
  /** true cuando el sueldo pactado está por debajo del mínimo y por lo
   *  tanto el piso legal quedó activo (baseCalculoFiscal > sbcMensual). */
  pisoSalarioMinimoAplicado: boolean;

  /** IMSS (sin RCV) — riesgos de trabajo + enfermedad y maternidad (cuota
   *  fija + adicional + prestaciones en dinero) + invalidez y vida +
   *  guarderías + gastos médicos de pensionados. Todo sobre
   *  baseCalculoFiscal salvo la cuota fija (% de 1 UMA, no depende del
   *  sueldo). */
  imssMensual: number;
  /** RCV — retiro + cesantía y vejez (banda CEAV), separado de imssMensual
   *  para poder exponerlo como su propia línea en el desglose. */
  rcvMensual: number;
  infonavitMensual: number;
  isnMensual: number;
  impuestoAdicionalMensual: number;
  /** Suma de imssMensual + rcvMensual + infonavitMensual + isnMensual +
   *  impuestoAdicionalMensual — la línea de cierre del desglose. */
  totalCargasPatronales: number;

  remuneracionMensualTotal: number;
  uniformeMensual: number;
  materialMensual: number;
  costoRealMensual: number;
  costoRealDiario: number;
  costoRealHora: number;
  costoRealSemanal: number;
  /** Banda CEAV aplicada — para transparencia/auditoría. */
  ceavBandaEtiqueta: string;
  ceavPorcentajeAplicado: number;
}

const DIAS_MES = 30.4;
const DIAS_ANIO = 365;

export function calcularCostoReal(
  config: CostConfigInput,
  servicio: CostServicioInput
): CostoRealResult {
  const sueldoDiario = servicio.sueldoMensualPuesto / DIAS_MES;
  const aguinaldoDiario = (sueldoDiario * config.diasAguinaldo) / DIAS_ANIO;
  const primaVacDiario =
    (sueldoDiario * config.diasVacaciones * config.primaVacacionalPct) / DIAS_ANIO;

  const sdiSinTope = sueldoDiario + aguinaldoDiario + primaVacDiario;
  const topeSbc = config.umaDiaria * config.topeSbcUmas;
  const sdiTopado = sdiSinTope > topeSbc;
  const sdi = sdiTopado ? topeSbc : sdiSinTope;

  const sbcMensual = sdi * DIAS_MES;

  // Piso de salario mínimo (Art. 28 LSS): la base de cálculo de TODAS las
  // cargas patronales (IMSS, RCV/CEAV, INFONAVIT, ISN, impuesto adicional)
  // nunca puede ser menor al salario mínimo mensual vigente, sin importar
  // qué tan bajo sea el sueldo pactado — es un piso, nunca un tope hacia
  // arriba (si el sueldo real ya supera el mínimo, se usa el sueldo real
  // tal cual, sin modificar el tope de topeSbcUmas ya aplicado arriba).
  const baseCalculoFiscal = Math.max(sbcMensual, config.salarioMinimoMensual);
  const pisoSalarioMinimoAplicado = baseCalculoFiscal > sbcMensual;

  // IMSS — enfermedad y maternidad: cuota fija (% de 1 UMA mensual, no
  // depende del sueldo) + cuota adicional (% del excedente sobre 3 UMA) +
  // especie en dinero (% de la base). El resto de los ramos son % directo
  // de la base — todos sobre baseCalculoFiscal, ya con el piso aplicado.
  const umaMensual = config.umaDiaria * DIAS_MES;
  const excedenteSobre3Uma = Math.max(baseCalculoFiscal - 3 * umaMensual, 0);

  const imssEnfMatCuotaFija = IMSS_ENF_MAT_CUOTA_FIJA_PCT * umaMensual;
  const imssEnfMatCuotaAdic = IMSS_ENF_MAT_CUOTA_ADIC_PCT * excedenteSobre3Uma;
  const imssEnfMatDinero = IMSS_PRESTACIONES_DINERO_PCT * baseCalculoFiscal;
  const imssGastosMedPens = IMSS_GASTOS_MED_PENS_PCT * baseCalculoFiscal;
  const imssInvalidezVida = IMSS_INVALIDEZ_VIDA_PCT * baseCalculoFiscal;
  const imssGuarderias = IMSS_GUARDERIAS_PCT * baseCalculoFiscal;
  const imssRetiro = IMSS_RETIRO_PCT * baseCalculoFiscal;
  const primaRiesgo = config.primaRiesgoPct * baseCalculoFiscal;

  if (config.bandasCeav.length === 0) {
    throw new Error(
      "No hay bandas CEAV configuradas. Corre el seed o revisa /configuracion."
    );
  }
  const bandaCeav = buscarBandaCeav(config.bandasCeav, baseCalculoFiscal, config.salarioMinimoMensual, umaMensual);
  const imssCesantiaVejez = bandaCeav.porcentajePatronal * baseCalculoFiscal;

  // IMSS (sin RCV) — ver comentario de la interfaz sobre por qué RCV vive
  // aparte: es su propia línea en el desglose de cargas patronales.
  const imssMensual =
    primaRiesgo +
    imssEnfMatCuotaFija +
    imssEnfMatCuotaAdic +
    imssEnfMatDinero +
    imssGastosMedPens +
    imssInvalidezVida +
    imssGuarderias;
  const rcvMensual = imssRetiro + imssCesantiaVejez;

  const infonavitMensual = INFONAVIT_PCT * baseCalculoFiscal;

  // El sueldo REAL que se le paga al trabajador (con aguinaldo/prima
  // vacacional reales, no la base fiscal) — nunca se toca por el piso.
  const remuneracionMensualTotal =
    servicio.sueldoMensualPuesto + aguinaldoDiario * DIAS_MES + primaVacDiario * DIAS_MES;

  const isnMensual = config.isnPct * baseCalculoFiscal;
  const impuestoAdicionalMensual = config.impuestoAdicionalPct * isnMensual;

  const totalCargasPatronales =
    imssMensual + rcvMensual + infonavitMensual + isnMensual + impuestoAdicionalMensual;

  const uniformeMensual =
    servicio.incluyeUniforme && servicio.costoUniforme && servicio.vidaUtilUniformeMeses
      ? servicio.costoUniforme / servicio.vidaUtilUniformeMeses
      : 0;
  const materialMensual =
    servicio.incluyeMaterial && servicio.costoMaterial && servicio.vidaUtilMaterialMeses
      ? servicio.costoMaterial / servicio.vidaUtilMaterialMeses
      : 0;

  const costoRealMensual =
    remuneracionMensualTotal + totalCargasPatronales + uniformeMensual + materialMensual;

  const costoRealDiario = costoRealMensual / DIAS_MES;
  const costoRealHora = costoRealDiario / config.horasPorDia;
  const costoRealSemanal = costoRealDiario * config.diasPorSemana;

  return {
    sueldoDiario,
    aguinaldoDiario,
    primaVacDiario,
    sdi,
    sdiTopado,
    sbcMensual,
    baseCalculoFiscal,
    pisoSalarioMinimoAplicado,
    imssMensual,
    rcvMensual,
    infonavitMensual,
    isnMensual,
    impuestoAdicionalMensual,
    totalCargasPatronales,
    remuneracionMensualTotal,
    uniformeMensual,
    materialMensual,
    costoRealMensual,
    costoRealDiario,
    costoRealHora,
    costoRealSemanal,
    ceavBandaEtiqueta: bandaCeav.etiqueta,
    ceavPorcentajeAplicado: bandaCeav.porcentajePatronal,
  };
}

export function costoRealPorModalidad(
  resultado: CostoRealResult,
  modalidad: "HORA" | "DIA" | "SEMANA" | "MES"
): number {
  switch (modalidad) {
    case "HORA":
      return resultado.costoRealHora;
    case "DIA":
      return resultado.costoRealDiario;
    case "SEMANA":
      return resultado.costoRealSemanal;
    case "MES":
      return resultado.costoRealMensual;
  }
}
