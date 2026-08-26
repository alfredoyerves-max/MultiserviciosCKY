import { z } from "zod";
import { activoCategoriaSchema, estadoActivoSchema } from "@/lib/enums";

export const activoSchema = z
  .object({
    nombre: z.string().trim().min(1, "Requerido"),
    descripcion: z.string().trim().optional(),
    categoria: activoCategoriaSchema,
    fechaAdquisicion: z.coerce.date(),
    valorAdquisicion: z.coerce.number().min(0),
    numeroFactura: z.string().trim().optional(),
    proveedor: z.string().trim().optional(),
    estado: estadoActivoSchema,
    // Solo requerida cuando estado = DADO_DE_BAJA — ver el .refine abajo.
    fechaBaja: z.coerce.date().optional(),
    notas: z.string().trim().optional(),
  })
  .refine((v) => v.estado !== "DADO_DE_BAJA" || v.fechaBaja, {
    message: "Captura la fecha en que se dio de baja",
    path: ["fechaBaja"],
  });

export type ActivoInput = z.infer<typeof activoSchema>;
