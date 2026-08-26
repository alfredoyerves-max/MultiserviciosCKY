import { prisma } from "@/lib/prisma";
import type { ActivoInput } from "@/lib/schemas/activo";

export function listActivos() {
  return prisma.activo.findMany({ orderBy: { createdAt: "desc" } });
}

export function createActivo(input: ActivoInput) {
  return prisma.activo.create({ data: input });
}

export function updateActivo(id: string, input: ActivoInput) {
  return prisma.activo.update({ where: { id }, data: input });
}
