import { z } from "zod";
import { CLAVE_SAT_REGEX } from "@/lib/claveSat";

export const AMBITOS_CATEGORIA = ["SERVICIO", "ACTIVO", "PRODUCTO"] as const;
export type AmbitoCategoria = (typeof AMBITOS_CATEGORIA)[number];

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre").max(60, "Máximo 60 caracteres"),
});

export const unidadSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre").max(30, "Máximo 30 caracteres"),
  // Clave de unidad SAT (c_ClaveUnidad): 3 caracteres; opcional.
  claveSat: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .refine((v) => !v || /^[A-Z0-9]{3}$/.test(v), "La clave de unidad SAT tiene 3 caracteres (ej. H87)"),
});

export const claveSatCatalogoSchema = z.object({
  clave: z.string().trim().regex(CLAVE_SAT_REGEX, "La clave SAT debe tener 8 dígitos (ej. 47131805)"),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria").max(200, "Máximo 200 caracteres"),
  palabrasSimilares: z.string().trim().max(200, "Máximo 200 caracteres").optional(),
});
