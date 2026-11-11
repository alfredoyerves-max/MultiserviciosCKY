import { prisma } from "@/lib/prisma";
import type { ProductoInput } from "@/lib/schemas/producto";
import { requireSession } from "@/lib/auth/session";

export async function listProductosConMovimientos() {
  await requireSession();
  return prisma.producto.findMany({
    include: { movimientos: { select: { tipo: true, cantidad: true } } },
    orderBy: { nombre: "asc" },
  });
}

export async function listProductosActivos() {
  await requireSession();
  return prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
}

export async function getProducto(id: string) {
  await requireSession();
  return prisma.producto.findUniqueOrThrow({
    where: { id },
    include: { movimientos: { orderBy: { fecha: "desc" } } },
  });
}

export async function createProducto(input: ProductoInput) {
  await requireSession();
  return prisma.producto.create({ data: input });
}

export async function updateProducto(id: string, input: ProductoInput) {
  await requireSession();
  return prisma.producto.update({ where: { id }, data: input });
}

export async function setProductoActivo(id: string, activo: boolean) {
  await requireSession();
  return prisma.producto.update({ where: { id }, data: { activo } });
}
