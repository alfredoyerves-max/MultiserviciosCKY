// Lógica pura de inventario (Fase 8). El stock de un Producto NUNCA se
// guarda como campo editable — siempre es la suma de sus movimientos
// (entradas - salidas), calculada aquí en tiempo de lectura.
//
// Sin dependencias de Prisma/pg a propósito: este módulo se importa
// también desde componentes cliente (ej. el wizard de cotización de
// material, para la advertencia de stock informativa) — cualquier import
// de lib/prisma.ts aquí arrastraría 'pg' al bundle del navegador y rompe
// el build ("Module not found: Can't resolve 'util/types'"). El advisory
// lock de escritura (lockProducto) vive en lib/data/locks.ts, server-only.

export function calcularStock(movimientos: { tipo: string; cantidad: number }[]): number {
  return movimientos.reduce(
    (sum, m) => sum + (m.tipo === "ENTRADA" ? m.cantidad : -m.cantidad),
    0
  );
}
