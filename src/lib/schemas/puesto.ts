import { z } from "zod";

export const puestoSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  sueldoMensual: z.coerce.number().min(1, "Debe ser mayor a 0"),
});

export type PuestoInput = z.infer<typeof puestoSchema>;
