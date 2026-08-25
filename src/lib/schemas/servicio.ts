import { z } from "zod";
import { MODALIDADES, servicioCategoriaSchema } from "@/lib/enums";

export const servicioSchema = z
  .object({
    nombre: z.string().trim().min(1, "Requerido"),
    descripcion: z.string().trim().optional(),
    categoria: servicioCategoriaSchema,

    // Mano de obra: o un Puesto ya guardado, o un sueldo capturado aquí
    // mismo (Addendum v4 punto 4) — exactamente uno de los dos.
    puestoId: z.string().optional(),
    sueldoMensualInline: z.coerce.number().min(1).optional(),
    nombrePuestoInline: z.string().trim().optional(),
    guardarComoPuesto: z.coerce.boolean().optional(),

    personalPorUnidad: z.coerce.number().int().min(1, "Mínimo 1"),
    modalidades: z
      .array(z.enum(MODALIDADES))
      .min(1, "Selecciona al menos una modalidad"),
    incluyeUniforme: z.coerce.boolean(),
    costoUniforme: z.coerce.number().min(0).optional(),
    vidaUtilUniformeMeses: z.coerce.number().int().min(1).optional(),
    incluyeMaterial: z.coerce.boolean(),
    costoMaterial: z.coerce.number().min(0).optional(),
    vidaUtilMaterialMeses: z.coerce.number().int().min(1).optional(),
  })
  .refine((v) => !!v.puestoId || (!!v.sueldoMensualInline && !!v.nombrePuestoInline), {
    message: "Elige un puesto guardado o captura nombre y sueldo aquí",
    path: ["puestoId"],
  })
  .refine(
    (v) => !v.incluyeUniforme || (v.costoUniforme && v.vidaUtilUniformeMeses),
    {
      message: "Costo y vida útil del uniforme son requeridos",
      path: ["costoUniforme"],
    }
  )
  .refine(
    (v) => !v.incluyeMaterial || (v.costoMaterial && v.vidaUtilMaterialMeses),
    {
      message: "Costo y vida útil del material son requeridos",
      path: ["costoMaterial"],
    }
  );

export type ServicioInput = z.infer<typeof servicioSchema>;
