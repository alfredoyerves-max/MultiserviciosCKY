import { z } from "zod";

export const generarCuentaPorCobrarSchema = z.object({
  cotizacionId: z.string().min(1),
  fechaVencimiento: z.coerce.date(),
});
export type GenerarCuentaPorCobrarInput = z.infer<typeof generarCuentaPorCobrarSchema>;

export const cuentaPorPagarSchema = z.object({
  concepto: z.string().trim().min(1, "Requerido"),
  proveedor: z.string().trim().min(1, "Requerido"),
  montoTotal: z.coerce.number().min(0.01, "Debe ser mayor a 0"),
  fechaVencimiento: z.coerce.date(),
});
export type CuentaPorPagarInput = z.infer<typeof cuentaPorPagarSchema>;

export const abonoSchema = z.object({
  fecha: z.coerce.date(),
  monto: z.coerce.number().min(0.01, "Debe ser mayor a 0"),
  nota: z.string().trim().optional(),
});
export type AbonoInput = z.infer<typeof abonoSchema>;
