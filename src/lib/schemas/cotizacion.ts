import { z } from "zod";
import { modalidadSchema } from "@/lib/enums";
import { clienteSchema } from "./cliente";

export const lineaInputSchema = z.object({
  servicioId: z.string().min(1),
  modalidad: modalidadSchema,
  personas: z.coerce.number().int().min(1),
  duracion: z.coerce.number().int().min(1),
});

export const cotizacionInputSchema = z.object({
  clienteId: z.string().optional(),
  clienteNuevo: clienteSchema.optional(),
  proyecto: z.string().trim().optional(),
  margenUtilidadPct: z.coerce.number().min(0).max(100),
  // Días de vigencia desde hoy (varía por cotización, ej. 15) — se
  // resuelve a una fecha absoluta al crear la cotización (Fase 6).
  diasVigencia: z.coerce.number().int().min(1, "Mínimo 1 día"),
  esSoporte: z.coerce.boolean().optional(),
  lineas: z.array(lineaInputSchema).min(1, "Agrega al menos un servicio"),
});

export type CotizacionInput = z.infer<typeof cotizacionInputSchema>;
export type LineaInput = z.infer<typeof lineaInputSchema>;
