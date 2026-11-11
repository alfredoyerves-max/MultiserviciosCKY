// Reglas puras de la sesión (sin Prisma ni cookies) para poder probarlas con
// fechas simuladas — ver session.ts, que las aplica.

/** Cierre por inactividad: sin actividad durante este tiempo, la sesión expira. */
export const INACTIVITY_MS = 30 * 60 * 1000;

/** Mientras la última escritura de expiresAt sea más reciente que esto, no se
 *  vuelve a escribir (evita un UPDATE por cada petición autenticada). El
 *  cierre por inactividad queda entre INACTIVITY_MS - RENEW_AFTER_MS e
 *  INACTIVITY_MS contado desde la última actividad. */
export const RENEW_AFTER_MS = 2 * 60 * 1000;

export type EstadoSesion = "expirada" | "renovar" | "vigente";

/**
 * expiresAt se escribe siempre como (momento de escritura + INACTIVITY_MS), así
 * que la última escritura se deduce de él sin guardar otra columna.
 */
export function evaluarSesion(expiresAt: Date, ahora: Date): EstadoSesion {
  if (expiresAt.getTime() < ahora.getTime()) return "expirada";
  const ultimaEscritura = expiresAt.getTime() - INACTIVITY_MS;
  return ahora.getTime() - ultimaEscritura > RENEW_AFTER_MS ? "renovar" : "vigente";
}
