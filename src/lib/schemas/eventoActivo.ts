import { z } from "zod";
import { tipoEventoActivoManualSchema } from "@/lib/enums";

/** "Registrar incidente" — evento manual (Incidente o Nota), nunca cambia
 *  el estado del activo. */
export const eventoActivoManualSchema = z.object({
  tipo: tipoEventoActivoManualSchema,
  descripcion: z.string().trim().min(1, "Requerido"),
  fecha: z.coerce.date(),
});
export type EventoActivoManualInput = z.infer<typeof eventoActivoManualSchema>;

/** "Dar de baja" — modal dedicado de un solo paso: fecha + motivo. */
export const darDeBajaActivoSchema = z.object({
  fecha: z.coerce.date(),
  motivo: z.string().trim().min(1, "Requerido"),
});
export type DarDeBajaActivoInput = z.infer<typeof darDeBajaActivoSchema>;
