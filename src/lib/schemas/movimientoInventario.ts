import { z } from "zod";
import { motivoSalidaSchema } from "@/lib/enums";

export const entradaInventarioSchema = z.object({
  productoId: z.string().min(1),
  fecha: z.coerce.date(),
  cantidad: z.coerce.number().min(0.0001, "Debe ser mayor a 0"),
  proveedor: z.string().trim().min(1, "Requerido"),
  costoUnitario: z.coerce.number().min(0, "Requerido"),
});
export type EntradaInventarioInput = z.infer<typeof entradaInventarioSchema>;

export const salidaInventarioSchema = z.object({
  productoId: z.string().min(1),
  fecha: z.coerce.date(),
  cantidad: z.coerce.number().min(0.0001, "Debe ser mayor a 0"),
  motivoSalida: motivoSalidaSchema,
  referencia: z.string().trim().optional(),
});
export type SalidaInventarioInput = z.infer<typeof salidaInventarioSchema>;
