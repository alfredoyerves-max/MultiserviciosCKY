import { z } from "zod";
import { modalidadSchema } from "@/lib/enums";
import { clienteSchema } from "./cliente";

export const lineaInputSchema = z.object({
  servicioId: z.string().min(1),
  modalidad: modalidadSchema,
  personas: z.coerce.number().int().min(1),
  duracion: z.coerce.number().int().min(1),
});

export const lineaMaterialInputSchema = z.object({
  productoId: z.string().min(1),
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
  lineasMaterial: z.array(lineaMaterialInputSchema).min(1, "Agrega al menos un producto"),
});

export type CotizacionInput = z.infer<typeof cotizacionInputSchema>;
export type CotizacionMaterialInput = z.infer<typeof cotizacionMaterialInputSchema>;
export type LineaInput = z.infer<typeof lineaInputSchema>;
export type LineaMaterialInput = z.infer<typeof lineaMaterialInputSchema>;
