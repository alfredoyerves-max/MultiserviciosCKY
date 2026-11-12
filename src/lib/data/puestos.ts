import { prisma } from "@/lib/prisma";
import type { PuestoInput } from "@/lib/schemas/puesto";
import { requireSession } from "@/lib/auth/session";
import { nombrarHijos, type ResultadoBorrado } from "@/lib/dependencias";

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

/**
 * Elimina un puesto solo si ningún servicio lo usa (activo o inactivo). El
 * borrado y la revisión son una sola sentencia: la relación con servicios es
 * SetNull, así que un borrado "a ciegas" les quitaría el puesto en silencio.
 */
export async function deletePuesto(id: string): Promise<ResultadoBorrado> {
  await requireSession();
  const { count } = await prisma.puesto.deleteMany({ where: { id, servicios: { none: {} } } });
  if (count > 0) return { ok: true };

  const puesto = await prisma.puesto.findUnique({
    where: { id },
    select: { nombre: true, servicios: { select: { nombre: true, activo: true }, orderBy: { nombre: "asc" } } },
  });
  if (!puesto) return { ok: false, error: "Este puesto ya no existe." };
  const n = puesto.servicios.length;
  return {
    ok: false,
    error: `No se puede eliminar «${puesto.nombre}»: ${n === 1 ? "lo usa 1 servicio" : `lo usan ${n} servicios`}. Cambia el puesto de esos servicios y vuelve a intentarlo.`,
    hijos: nombrarHijos(puesto.servicios.map((x) => ({ nombre: x.nombre, inactivo: !x.activo }))),
  };
}
