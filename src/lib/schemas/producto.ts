import { z } from "zod";
import { unidadMedidaSchema } from "@/lib/enums";

export const productoSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  descripcion: z.string().trim().optional(),
  unidadMedida: unidadMedidaSchema,
  precioVentaSugerido: z.coerce.number().min(0).optional(),
});

export type ProductoInput = z.infer<typeof productoSchema>;
