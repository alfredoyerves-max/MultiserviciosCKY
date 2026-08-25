import { z } from "zod";
import { tipoClienteSchema } from "@/lib/enums";

export const clienteSchema = z.object({
  nombreRazonSocial: z.string().trim().min(1, "Requerido"),
  rfc: z.string().trim().optional(),
  contacto: z.string().trim().optional(),
  tipoCliente: tipoClienteSchema,
});

export type ClienteInput = z.infer<typeof clienteSchema>;
