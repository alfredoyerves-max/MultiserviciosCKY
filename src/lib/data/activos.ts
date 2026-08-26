import { prisma } from "@/lib/prisma";
import type { ActivoInput } from "@/lib/schemas/activo";

export function listActivos() {
  return prisma.activo.findMany({ orderBy: { createdAt: "desc" } });
}

/** fechaBaja solo tiene sentido si estado === DADO_DE_BAJA — si el estado
 *  es otro, se limpia (ej. si se revierte una baja por error). */
function toDb(input: ActivoInput) {
  return { ...input, fechaBaja: input.estado === "DADO_DE_BAJA" ? input.fechaBaja : null };
}

export function createActivo(input: ActivoInput) {
  return prisma.activo.create({ data: toDb(input) });
}

export function updateActivo(id: string, input: ActivoInput) {
  return prisma.activo.update({ where: { id }, data: toDb(input) });
}
