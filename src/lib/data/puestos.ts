import { prisma } from "@/lib/prisma";
import type { PuestoInput } from "@/lib/schemas/puesto";

export function listPuestos() {
  return prisma.puesto.findMany({ orderBy: { nombre: "asc" } });
}

export function createPuesto(input: PuestoInput) {
  return prisma.puesto.create({ data: input });
}

export function updatePuesto(id: string, input: PuestoInput) {
  return prisma.puesto.update({ where: { id }, data: input });
}

export async function deletePuesto(id: string) {
  const enUso = await prisma.servicio.count({ where: { puestoId: id } });
  if (enUso > 0) {
    throw new Error(
      `No se puede eliminar: ${enUso} servicio(s) usan este puesto.`
    );
  }
  return prisma.puesto.delete({ where: { id } });
}
