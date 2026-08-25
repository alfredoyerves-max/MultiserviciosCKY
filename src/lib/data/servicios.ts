import { prisma } from "@/lib/prisma";
import type { ServicioInput } from "@/lib/schemas/servicio";

export { parseModalidades } from "@/lib/modalidades";

/**
 * Resuelve el puestoId final: si el usuario eligió un Puesto existente se
 * usa tal cual; si capturó sueldo inline y marcó "Guardar como Puesto
 * nuevo", se crea el Puesto aquí y se usa su id (el servicio queda
 * completamente normalizado al Puesto, sin datos inline residuales); si
 * no, se deja null y el sueldo vive en los campos inline del Servicio.
 */
async function resolverPuestoId(input: ServicioInput): Promise<string | null> {
  if (input.puestoId) return input.puestoId;
  if (input.guardarComoPuesto && input.nombrePuestoInline && input.sueldoMensualInline) {
    const puesto = await prisma.puesto.create({
      data: { nombre: input.nombrePuestoInline, sueldoMensual: input.sueldoMensualInline },
    });
    return puesto.id;
  }
  return null;
}

function toDb(input: ServicioInput, puestoId: string | null) {
  return {
    nombre: input.nombre,
    descripcion: input.descripcion,
    categoria: input.categoria,
    personalPorUnidad: input.personalPorUnidad,
    modalidadesJson: JSON.stringify(input.modalidades),
    incluyeUniforme: input.incluyeUniforme,
    costoUniforme: input.costoUniforme,
    vidaUtilUniformeMeses: input.vidaUtilUniformeMeses,
    incluyeMaterial: input.incluyeMaterial,
    costoMaterial: input.costoMaterial,
    vidaUtilMaterialMeses: input.vidaUtilMaterialMeses,
    puestoId,
    // Si terminó ligado a un Puesto (existente o recién creado), no se
    // guarda sueldo inline — el Puesto es la única fuente de verdad.
    sueldoMensualInline: puestoId ? null : (input.sueldoMensualInline ?? null),
    nombrePuestoInline: puestoId ? null : (input.nombrePuestoInline ?? null),
  };
}

export function listServicios() {
  return prisma.servicio.findMany({
    include: { puesto: true },
    orderBy: { nombre: "asc" },
  });
}

export function listServiciosActivos() {
  return prisma.servicio.findMany({
    where: { activo: true },
    include: { puesto: true },
    orderBy: { nombre: "asc" },
  });
}

export function getServicio(id: string) {
  return prisma.servicio.findUniqueOrThrow({ where: { id }, include: { puesto: true } });
}

export async function createServicio(input: ServicioInput) {
  const puestoId = await resolverPuestoId(input);
  return prisma.servicio.create({ data: toDb(input, puestoId) });
}

export async function updateServicio(id: string, input: ServicioInput) {
  const puestoId = await resolverPuestoId(input);
  return prisma.servicio.update({ where: { id }, data: toDb(input, puestoId) });
}

export function setServicioActivo(id: string, activo: boolean) {
  return prisma.servicio.update({ where: { id }, data: { activo } });
}
