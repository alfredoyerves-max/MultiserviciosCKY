// Lógica pura de inventario (Fase 8). El stock de un Producto NUNCA se
// guarda como campo editable — siempre es la suma de sus movimientos
// (entradas - salidas), calculada aquí en tiempo de lectura.

export function calcularStock(movimientos: { tipo: string; cantidad: number }[]): number {
  return movimientos.reduce(
    (sum, m) => sum + (m.tipo === "ENTRADA" ? m.cantidad : -m.cantidad),
    0
  );
}
