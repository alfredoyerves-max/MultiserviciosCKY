// Motor de costo real del empleado (Fase 2 del spec).
// Funciones puras, sin dependencias de UI ni de base de datos, para poder
// verificarlas a mano contra las fórmulas del documento de especificación.

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
  imssEnfMatCuotaFijaPct: number;
  imssEnfMatCuotaAdicPct: number;
  imssEnfMatDineroPct: number;
  imssGastosMedPensPct: number;
  imssInvalidezVidaPct: number;
  imssGuarderiasPct: number;
  imssRetiroPct: number;
  infonavitPct: number;
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
  sbcMensual: number;
  cuotasImssMensual: number;
  infonavitMensual: number;
  remuneracionMensualTotal: number;
  isnMensual: number;
  impuestoAdicionalMensual: number;
  uniformeMensual: number;
  materialMensual: number;
  costoRealMensual: number;
  costoRealDiario: number;
  costoRealHora: number;
  costoRealSemanal: number;
  /** Banda CEAV aplicada a este SBC — para transparencia/auditoría. */
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

  // IMSS — enfermedad y maternidad: cuota fija (% de 1 UMA mensual) +
  // cuota adicional (% del excedente sobre 3 UMA) + especie en dinero (%
  // del SBC). El resto de los ramos son % directo del SBC.
  const umaMensual = config.umaDiaria * DIAS_MES;
  const excedenteSobre3Uma = Math.max(sbcMensual - 3 * umaMensual, 0);

  const imssEnfMatCuotaFija = config.imssEnfMatCuotaFijaPct * umaMensual;
  const imssEnfMatCuotaAdic = config.imssEnfMatCuotaAdicPct * excedenteSobre3Uma;
  const imssEnfMatDinero = config.imssEnfMatDineroPct * sbcMensual;
  const imssGastosMedPens = config.imssGastosMedPensPct * sbcMensual;
  const imssInvalidezVida = config.imssInvalidezVidaPct * sbcMensual;
  const imssGuarderias = config.imssGuarderiasPct * sbcMensual;
  const imssRetiro = config.imssRetiroPct * sbcMensual;
  const primaRiesgo = config.primaRiesgoPct * sbcMensual;

  if (config.bandasCeav.length === 0) {
    throw new Error(
      "No hay bandas CEAV configuradas. Corre el seed o revisa /configuracion."
    );
  }
  const bandaCeav = buscarBandaCeav(config.bandasCeav, sbcMensual, config.salarioMinimoMensual, umaMensual);
  const imssCesantiaVejez = bandaCeav.porcentajePatronal * sbcMensual;

  const cuotasImssMensual =
    imssEnfMatCuotaFija +
    imssEnfMatCuotaAdic +
    imssEnfMatDinero +
    imssGastosMedPens +
    imssInvalidezVida +
    imssGuarderias +
    imssRetiro +
    imssCesantiaVejez +
    primaRiesgo;

  const infonavitMensual = config.infonavitPct * sbcMensual;

  const remuneracionMensualTotal =
    servicio.sueldoMensualPuesto + aguinaldoDiario * DIAS_MES + primaVacDiario * DIAS_MES;

  const isnMensual = config.isnPct * remuneracionMensualTotal;
  const impuestoAdicionalMensual = config.impuestoAdicionalPct * isnMensual;

  const uniformeMensual =
    servicio.incluyeUniforme && servicio.costoUniforme && servicio.vidaUtilUniformeMeses
      ? servicio.costoUniforme / servicio.vidaUtilUniformeMeses
      : 0;
  const materialMensual =
    servicio.incluyeMaterial && servicio.costoMaterial && servicio.vidaUtilMaterialMeses
      ? servicio.costoMaterial / servicio.vidaUtilMaterialMeses
      : 0;

  const costoRealMensual =
    remuneracionMensualTotal +
    cuotasImssMensual +
    infonavitMensual +
    isnMensual +
    impuestoAdicionalMensual +
    uniformeMensual +
    materialMensual;

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
    cuotasImssMensual,
    infonavitMensual,
    remuneracionMensualTotal,
    isnMensual,
    impuestoAdicionalMensual,
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
