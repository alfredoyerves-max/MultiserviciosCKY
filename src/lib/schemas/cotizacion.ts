import { z } from "zod";
import { modalidadSchema } from "@/lib/schemas/enums";
import { claveSatValida, MENSAJE_CLAVE_SAT } from "@/lib/claveSat";
import { clienteSchema } from "./cliente";

export const lineaInputSchema = z.object({
  servicioId: z.string().min(1),
  modalidad: modalidadSchema,
  personas: z.coerce.number().int().min(1),
  duracion: z.coerce.number().int().min(1),
});

export const lineaMaterialInputSchema = z.object({
  // Atajo opcional al catálogo de Inventario; "" (captura libre) = sin producto.
  productoId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  claveSat: z
    .string()
    .trim()
    .refine(claveSatValida, MENSAJE_CLAVE_SAT)
    .optional()
    .default(""),
  descripcion: z.string().trim().min(1, "Describe el material"),
  // Catálogo (PIEZA, LITRO…) o texto capturado con "Otra…" solo en la línea de cotización; la columna es texto.
  unidadMedida: z.string().trim().min(1, "Indica la unidad").max(20, "Máximo 20 caracteres"),
  cantidad: z.coerce.number().positive("Debe ser mayor a 0"),
  precioUnitario: z.coerce.number().min(0),
});

const cotizacionBaseSchema = z.object({
  clienteId: z.string().optional(),
  clienteNuevo: clienteSchema.optional(),
  proyecto: z.string().trim().optional(),
  // Días de vigencia desde hoy (varía por cotización, ej. 15) — se
  // resuelve a una fecha absoluta al crear la cotización (Fase 6).
  diasVigencia: z.coerce.number().int().min(1, "Mínimo 1 día"),
  esSoporte: z.coerce.boolean().optional(),
});

export const cotizacionInputSchema = cotizacionBaseSchema.extend({
  margenUtilidadPct: z.coerce.number().min(0).max(100),
  lineas: z.array(lineaInputSchema).min(1, "Agrega al menos un servicio"),
});

export const cotizacionMaterialInputSchema = cotizacionBaseSchema.extend({
  lineasMaterial: z.array(lineaMaterialInputSchema).min(1, "Agrega al menos una línea"),
});

export type CotizacionInput = z.infer<typeof cotizacionInputSchema>;
export type CotizacionMaterialInput = z.infer<typeof cotizacionMaterialInputSchema>;
export type LineaInput = z.infer<typeof lineaInputSchema>;
export type LineaMaterialInput = z.infer<typeof lineaMaterialInputSchema>;
