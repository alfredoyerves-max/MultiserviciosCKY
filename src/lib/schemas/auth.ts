import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "Requerido"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const setupSchema = z
  .object({
    nombre: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().email("Correo inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Requerido"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
export type SetupInput = z.infer<typeof setupSchema>;
