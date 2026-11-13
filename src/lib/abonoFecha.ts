import { hoyMexico } from "@/lib/fechaLocal";

/** AAAA-MM-DD → DD/MM/AAAA para los mensajes. */
function dmy(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/**
 * Regla de la fecha de un abono (cobro o pago): no puede ser posterior a hoy (México) ni, cuando
 * se conoce, anterior a la fecha de la cotización que originó la cuenta. Fechas como AAAA-MM-DD.
 * Devuelve el mensaje de error o `null` si la fecha es válida. Una sola regla para cliente y servidor.
 */
export function errorFechaAbono(fecha: string, fechaCotizacion?: string, hoy: string = hoyMexico()): string | null {
  if (fecha > hoy) return `La fecha del abono no puede ser posterior a hoy (${dmy(hoy)}).`;
  if (fechaCotizacion && fecha < fechaCotizacion) {
    return `La fecha del abono no puede ser anterior a la fecha de la cotización (${dmy(fechaCotizacion)}).`;
  }
  return null;
}
