import { z } from "zod";
import { TIPOS_CLIENTE } from "@/lib/enums";
import { analizarRfc, normalizarRfc, MENSAJE_TIPO_CLIENTE } from "@/lib/rfc";

// El RFC sigue siendo opcional; si se captura, debe ser válido y fija el tipo de persona
// (12 caracteres = Persona Moral, 13 = Persona Física). Sin RFC, el tipo es obligatorio.
export const clienteSchema = z
  .object({
    nombreRazonSocial: z.string().trim().min(1, "Requerido"),
    rfc: z.string().trim().optional(),
    contacto: z.string().trim().optional(),
    tipoCliente: z.enum(TIPOS_CLIENTE, { message: MENSAJE_TIPO_CLIENTE }),
  })
  .superRefine((v, ctx) => {
    const a = analizarRfc(v.rfc ?? "");
    if (a.estado === "invalido") {
      ctx.addIssue({ code: "custom", path: ["rfc"], message: a.error });
    } else if (a.estado === "valido" && a.tipo !== v.tipoCliente) {
      ctx.addIssue({ code: "custom", path: ["tipoCliente"], message: "El tipo de cliente no corresponde al RFC." });
    }
  })
  .transform((v) => ({ ...v, rfc: v.rfc ? normalizarRfc(v.rfc) : v.rfc }));

export type ClienteInput = z.infer<typeof clienteSchema>;
