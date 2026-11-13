/**
 * Solo para mostrar en pantalla: el recargo sobre costo r (en %) equivale a un margen sobre el precio de r/(1+r).
 * Precio = costo × (1 + r), así que con 30 % de recargo el margen sobre el precio es 23.08 %. No interviene en ningún cálculo guardado.
 */
export function margenSobrePrecioPct(recargoPct: number): number {
  const r = recargoPct / 100;
  return (r / (1 + r)) * 100;
}
