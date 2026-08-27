import { z } from "zod";
import { activoCategoriaSchema } from "@/lib/enums";

// estado/fechaBaja ya NO se editan desde este formulario general — cambian
// de estado vía updateEstadoActivoAction (transiciones simples) o
// darDeBajaActivoAction (modal dedicado de un solo paso, con motivo), ver
// lib/data/activos.ts. Así cada cambio de estado queda siempre registrado
// en EventoActivo, sin depender de que este formulario lo capture bien.
export const activoSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  descripcion: z.string().trim().optional(),
  categoria: activoCategoriaSchema,
  fechaAdquisicion: z.coerce.date(),
  valorAdquisicion: z.coerce.number().min(0),
  numeroFactura: z.string().trim().optional(),
  proveedor: z.string().trim().optional(),
  notas: z.string().trim().optional(),
});

export type ActivoInput = z.infer<typeof activoSchema>;
