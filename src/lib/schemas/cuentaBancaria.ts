import { z } from "zod";

export const cuentaBancariaSchema = z.object({
  banco: z.string().trim().min(1, "Requerido"),
  clabe: z
    .string()
    .trim()
    .regex(/^\d{18}$/, "La CLABE debe tener 18 dígitos."),
  numeroCuenta: z.string().trim().optional(),
  titular: z.string().trim().min(1, "Requerido"),
});

export type CuentaBancariaInput = z.infer<typeof cuentaBancariaSchema>;
