import { advisoryLock } from "@/lib/prisma";

/**
 * Serializa, dentro de una transacción, las operaciones que leen y luego
 * escriben el stock de un mismo producto (registrar salida, confirmar
 * aceptación de material) — ver advisoryLock en lib/prisma.ts. Sin esto,
 * dos salidas concurrentes del mismo producto pueden leer el mismo stock
 * "antes" de que la otra escriba y ambas pasar la validación aunque
 * juntas excedan lo disponible (confirmado con pruebas de carga: el stock
 * quedaba en -10 con 20 salidas concurrentes de 1 unidad contra stock=10).
 *
 * Vive en la capa de datos (server-only) — no en lib/inventario.ts, que
 * es puro a propósito y se importa también desde componentes cliente.
 */
export function lockProducto(
  tx: { $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  productoId: string
): Promise<void> {
  return advisoryLock(tx, "producto", productoId);
}
