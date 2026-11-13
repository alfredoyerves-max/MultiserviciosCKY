import { z } from "zod";

export const productoSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  descripcion: z.string().trim().optional(),
  // Nombre de una unidad del catálogo (Configuración › Catálogos) o un valor histórico ("PAQUETE").
  unidadMedida: z.string().trim().min(1, "Selecciona la unidad").max(30, "Máximo 30 caracteres"),
  precioVentaSugerido: z.coerce.number().min(0).optional(),
});

export type ProductoInput = z.infer<typeof productoSchema>;
