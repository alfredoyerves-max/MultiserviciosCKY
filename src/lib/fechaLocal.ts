/** Zona horaria del negocio. México no tiene horario de verano desde 2022; Intl se encarga del resto. */
const ZONA_MEXICO = "America/Mexico_City";

/**
 * Fecha de hoy en México como AAAA-MM-DD (valor de un `<input type="date">`).
 * No usa `toISOString()`: esa es la fecha en UTC y por la tarde-noche ya es mañana.
 * Fija la zona (no depende del servidor ni del navegador), así que sale igual al renderizar en el servidor y en el cliente.
 */
export function hoyMexico(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_MEXICO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

/** Hoy en México más `dias` días (calendario), como AAAA-MM-DD. Suma sobre la fecha ya fijada en México, no sobre la hora del equipo. */
export function hoyMexicoMasDias(dias: number, ahora: Date = new Date()): string {
  const [a, m, d] = hoyMexico(ahora).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Un instante como fecha de calendario en México (AAAA-MM-DD). */
export function fechaMexico(fecha: Date): string {
  return hoyMexico(fecha);
}

/** ¿Esa fecha de vigencia ya pasó, contando por días de calendario en México? */
export function vigenciaVencida(fechaVigencia: Date, ahora: Date = new Date()): boolean {
  return fechaMexico(fechaVigencia) < hoyMexico(ahora);
}

/** Vigencia de `dias` días contados desde hoy en México (a mediodía UTC para no cruzar de día en ninguna zona de México). */
export function vigenciaEnDias(dias: number, ahora: Date = new Date()): Date {
  return new Date(`${hoyMexicoMasDias(dias, ahora)}T12:00:00Z`);
}
