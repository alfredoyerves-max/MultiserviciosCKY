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
// Checkboxes del candado fiscal se envían como campo oculto "on"/"off"
// (nunca ausentes cuando la sección está desbloqueada — ver CheckboxField
// en config-form.tsx), para no chocar con la convención de "campo
// ausente = sección bloqueada, no tocar" que usan los demás campos.
const boolFlag = z.enum(["on", "off"]).transform((v) => v === "on");

/**
 * Campos normativos protegidos por el candado de "Editar valores
 * fiscales" en /configuracion (más la tabla CEAV, que se maneja aparte —
 * ver ceavBandasUpdateSchema). Única fuente de verdad de esta lista:
 * la usan tanto el schema de abajo (para volverlos opcionales — ver
 * nota) como saveSystemConfigAction (para decidir si esta escritura
 * necesita re-verificar la contraseña del usuario).
 *
 * NumField y CeavBandasTable (config-form.tsx) omiten por completo el
 * atributo `name` de estos campos cuando están bloqueados — así que si
 * el usuario nunca pasó por el candado, estos campos simplemente no
 * llegan en el FormData. Por eso son `.optional()` aquí: "ausente" es la
 * señal de "no se tocó", y Prisma trata un campo `undefined` en
 * `update.data` como "no lo toques" (a diferencia de `null`), así que no
 * hace falta fusionar manualmente con los valores actuales.
 */
export const PROTECTED_FISCAL_FIELDS = [
  "umaDiaria",
  "umaMensual",
  "topeSbcUmas",
  "salarioMinimoDiario",
  "salarioMinimoMensual",
  "imssEnfMatCuotaFijaPct",
  "imssEnfMatCuotaAdicPct",
  "imssEnfMatDineroPct",
  "imssGastosMedPensPct",
  "imssInvalidezVidaPct",
  "imssGuarderiasPct",
  "imssRetiroPct",
  "infonavitPct",
  "isnPct",
  "impuestoAdicionalPct",

  // Identidad del prestador, cuentas bancarias y métodos de pago — Fase
  // 12. Extienden el mismo candado: no son tasas normativas, pero son
  // datos sensibles de identidad/pago que ameritan la misma confirmación
  // de contraseña antes de editarse.
  "prestadorNombre",
  "prestadorRfc",
  "prestadorRegimenFiscal",
  "prestadorDireccion",
  "prestadorTelefono",
  "prestadorEmail",
  "aceptaEfectivo",
  "aceptaTransferencia",
  "aceptaCheque",
  "garantiaServicio",
  "garantiaMaterial",
  "condicionPagoServicio",
  "condicionPagoMaterial",
  "condicionesComercialesServicio",
  "condicionesComercialesMaterial",
] as const;

const systemConfigFieldsSchema = z.object({
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
  prestadorRegimenFiscal: z.string().trim().optional(),
  prestadorDireccion: z.string().trim().optional(),
  prestadorTelefono: z.string().trim().optional(),
  prestadorEmail: z.string().trim().optional(),

  aceptaEfectivo: boolFlag,
  aceptaTransferencia: boolFlag,
  aceptaCheque: boolFlag,

  garantiaServicio: z.string().trim().min(1, "Requerido"),
  garantiaMaterial: z.string().trim().min(1, "Requerido"),
  condicionPagoServicio: z.string().trim().min(1, "Requerido"),
  condicionPagoMaterial: z.string().trim().min(1, "Requerido"),
  condicionesComercialesServicio: z.string().trim().min(1, "Requerido"),
  condicionesComercialesMaterial: z.string().trim().min(1, "Requerido"),
});

export const systemConfigSchema = systemConfigFieldsSchema.partial(
  Object.fromEntries(PROTECTED_FISCAL_FIELDS.map((f) => [f, true])) as Record<
    (typeof PROTECTED_FISCAL_FIELDS)[number],
    true
  >
);

export type SystemConfigInput = z.infer<typeof systemConfigSchema>;

// Las 8 bandas CEAV se editan como porcentaje humano (ej. "3.676") y se
// guardan como fracción — mismo criterio que el resto de los campos "pct".
export const ceavBandaUpdateSchema = z.object({
  orden: z.coerce.number().int().min(1).max(8),
  porcentajePatronal: pct,
});
export const ceavBandasUpdateSchema = z.array(ceavBandaUpdateSchema).length(8);
export type CeavBandaUpdate = z.infer<typeof ceavBandaUpdateSchema>;
