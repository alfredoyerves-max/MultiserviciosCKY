/**
 * Solo para mostrar en pantalla: la utilidad sobre costo r (en %) equivale a r/(1+r) de la venta.
 * Precio = costo × (1 + r), así que con 30 % de utilidad sobre costo es 23.08 % de la venta. No interviene en ningún cálculo guardado.
 */
export function margenSobrePrecioPct(recargoPct: number): number {
  const r = recargoPct / 100;
  return (r / (1 + r)) * 100;
}
