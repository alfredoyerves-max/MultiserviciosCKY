import { z } from "zod";
import { activoCategoriaSchema, estadoActivoSchema } from "@/lib/enums";

export const activoSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  descripcion: z.string().trim().optional(),
  categoria: activoCategoriaSchema,
  fechaAdquisicion: z.coerce.date(),
  valorAdquisicion: z.coerce.number().min(0),
  estado: estadoActivoSchema,
  notas: z.string().trim().optional(),
});

export type ActivoInput = z.infer<typeof activoSchema>;
