import { z } from "zod";

// Los campos "pct" se capturan en el formulario como número humano de
// porcentaje (ej. "16" para 16%) y se guardan en BD como fracción (0.16),
// que es lo que consumen costEngine/fiscalEngine.
const pct = z.coerce
  .number()
  .min(0)
  .max(100)
  .transform((v) => v / 100);
const positive = z.coerce.number().min(0);
const positiveInt = z.coerce.number().int().min(0);

export const systemConfigSchema = z.object({
  umaDiaria: positive,
  umaMensual: positive,
  topeSbcUmas: positive,

  salarioMinimoDiario: positive,
  salarioMinimoMensual: positive,

  primaRiesgoPct: pct,

  imssEnfMatCuotaFijaPct: pct,
  imssEnfMatCuotaAdicPct: pct,
  imssEnfMatDineroPct: pct,
  imssGastosMedPensPct: pct,
  imssInvalidezVidaPct: pct,
  imssGuarderiasPct: pct,
  imssRetiroPct: pct,
  // Cesantía y Vejez: ver ceavBandasSchema — ya no es un campo único.

  infonavitPct: pct,

  isnPct: pct,
  impuestoAdicionalPct: pct,

  diasAguinaldo: positiveInt,
  diasVacaciones: positiveInt,
  primaVacacionalPct: pct,

  ivaPct: pct,
  retencionIsrPct: pct,

  horasPorDia: positiveInt,
  diasPorSemana: positiveInt,

  margenUtilidadDefaultPct: pct,

  prestadorNombre: z.string().trim().min(1, "Requerido"),
  prestadorRfc: z.string().trim().optional(),
  prestadorDireccion: z.string().trim().optional(),
  prestadorTelefono: z.string().trim().optional(),
  prestadorEmail: z.string().trim().optional(),
});

export type SystemConfigInput = z.infer<typeof systemConfigSchema>;

// Las 8 bandas CEAV se editan como porcentaje humano (ej. "3.676") y se
// guardan como fracción — mismo criterio que el resto de los campos "pct".
export const ceavBandaUpdateSchema = z.object({
  orden: z.coerce.number().int().min(1).max(8),
  porcentajePatronal: pct,
});
export const ceavBandasUpdateSchema = z.array(ceavBandaUpdateSchema).length(8);
export type CeavBandaUpdate = z.infer<typeof ceavBandaUpdateSchema>;
