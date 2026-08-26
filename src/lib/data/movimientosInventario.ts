import { prisma } from "@/lib/prisma";
import { calcularStock } from "@/lib/inventario";
import { lockProducto } from "@/lib/data/locks";
import type { EntradaInventarioInput, SalidaInventarioInput } from "@/lib/schemas/movimientoInventario";

/** Todos los movimientos de todos los productos, para la exportación a
 *  Excel (Fase 11) — no hay vista de "todos los movimientos" en la app,
 *  solo por producto, así que este listado es exclusivo de esa exportación. */
export function listMovimientosInventario() {
  return prisma.movimientoInventario.findMany({
    include: { producto: { select: { nombre: true, unidadMedida: true } } },
    orderBy: { fecha: "desc" },
  });
}

/**
 * Registra una entrada (compra) y, en la misma transacción, actualiza
 * `costoCompraReciente` del producto con el costoUnitario de esta compra —
 * ese campo nunca se edita directamente, solo se deriva de la entrada más
 * reciente.
 */
export function registrarEntrada(input: EntradaInventarioInput) {
  return prisma.$transaction(async (tx) => {
    const movimiento = await tx.movimientoInventario.create({
      data: {
        productoId: input.productoId,
        tipo: "ENTRADA",
        fecha: input.fecha,
        cantidad: input.cantidad,
        proveedor: input.proveedor,
        costoUnitario: input.costoUnitario,
      },
    });
    await tx.producto.update({
      where: { id: input.productoId },
      data: { costoCompraReciente: input.costoUnitario },
    });
    return movimiento;
  });
}

/**
 * Registra una salida (venta a cliente o uso interno). Rechaza la
 * operación si la cantidad excede el stock actual (suma de movimientos
 * previos) — no es una alerta de stock mínimo, es una validación de
 * integridad para no dejar el stock en negativo. Corre dentro de una
 * transacción con lockProducto (advisory lock) para que dos salidas
 * concurrentes del mismo producto no puedan leer el mismo stock "antes"
 * de que la otra escriba (ver lib/inventario.ts).
 */
export async function registrarSalida(input: SalidaInventarioInput) {
  return prisma.$transaction(async (tx) => {
    await lockProducto(tx, input.productoId);

    const movimientos = await tx.movimientoInventario.findMany({
      where: { productoId: input.productoId },
      select: { tipo: true, cantidad: true },
    });
    const stockActual = calcularStock(movimientos);
    if (input.cantidad > stockActual) {
      throw new Error(`Stock insuficiente: solo quedan ${stockActual} unidad(es) disponibles.`);
    }

    return tx.movimientoInventario.create({
      data: {
        productoId: input.productoId,
        tipo: "SALIDA",
        fecha: input.fecha,
        cantidad: input.cantidad,
        motivoSalida: input.motivoSalida,
        referencia: input.referencia || null,
      },
    });
  });
}
