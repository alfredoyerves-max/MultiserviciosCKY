/** Clave de producto/servicio SAT: 8 dígitos. Vacía = sin clave (el campo sigue siendo opcional). */
export const CLAVE_SAT_REGEX = /^\d{8}$/;

export const MENSAJE_CLAVE_SAT = "La clave SAT debe tener 8 dígitos (ej. 47131805)";

/** `true` si está vacía o tiene exactamente 8 dígitos. */
export function claveSatValida(valor: string): boolean {
  const v = valor.trim();
  return v === "" || CLAVE_SAT_REGEX.test(v);
}
