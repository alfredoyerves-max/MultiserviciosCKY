import { prisma } from "@/lib/prisma";
import type { ProductoInput } from "@/lib/schemas/producto";

export function listProductosConMovimientos() {
  return prisma.producto.findMany({
    include: { movimientos: { select: { tipo: true, cantidad: true } } },
    orderBy: { nombre: "asc" },
  });
}

export function listProductosActivos() {
  return prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
}

export function getProducto(id: string) {
  return prisma.producto.findUniqueOrThrow({
    where: { id },
    include: { movimientos: { orderBy: { fecha: "desc" } } },
  });
}

export function createProducto(input: ProductoInput) {
  return prisma.producto.create({ data: input });
}

export function updateProducto(id: string, input: ProductoInput) {
  return prisma.producto.update({ where: { id }, data: input });
}

export function setProductoActivo(id: string, activo: boolean) {
  return prisma.producto.update({ where: { id }, data: { activo } });
}
