import { prisma } from "@/lib/prisma";
import type { PuestoInput } from "@/lib/schemas/puesto";
import { requireSession } from "@/lib/auth/session";

export async function listPuestos() {
  await requireSession();
  return prisma.puesto.findMany({ orderBy: { nombre: "asc" } });
}

export async function createPuesto(input: PuestoInput) {
  await requireSession();
  return prisma.puesto.create({ data: input });
}

export async function updatePuesto(id: string, input: PuestoInput) {
  await requireSession();
  return prisma.puesto.update({ where: { id }, data: input });
}

export async function deletePuesto(id: string) {
  await requireSession();
  const enUso = await prisma.servicio.count({ where: { puestoId: id } });
  if (enUso > 0) {
    throw new Error(
      `No se puede eliminar: ${enUso} servicio(s) usan este puesto.`
    );
  }
  return prisma.puesto.delete({ where: { id } });
}
