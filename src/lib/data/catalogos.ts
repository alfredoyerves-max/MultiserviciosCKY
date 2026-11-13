import { advisoryLock, prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { nombrarHijos, type ResultadoBorrado } from "@/lib/dependencias";
import { etiquetaCategoriaServicio } from "@/lib/enums";
import type { AmbitoCategoria } from "@/lib/schemas/catalogos";

/** Resultado de un alta: `ok` o el motivo (nombre repetido, etc.). */
export interface ResultadoAlta {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ── Categorías ───────────────────────────────────────────────────────────────

export async function listCategorias(ambito: AmbitoCategoria) {
  await requireSession();
  return prisma.categoria.findMany({ where: { ambito }, orderBy: { nombre: "asc" } });
}

export async function createCategoria(ambito: AmbitoCategoria, nombre: string): Promise<ResultadoAlta> {
  await requireSession();
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, "categoria", ambito);
    const repetida = await tx.categoria.findFirst({ where: { ambito, nombre: { equals: nombre, mode: "insensitive" } } });
    if (repetida) {
      return { ok: false, fieldErrors: { nombre: `Ya existe «${repetida.nombre}» (no se distingue entre mayúsculas y minúsculas).` } };
    }
    await tx.categoria.create({ data: { ambito, nombre } });
    return { ok: true };
  });
}

/** Servicios que usan una categoría (por nombre o por su código histórico, p. ej. "LIMPIEZA" = «Limpieza»). */
async function serviciosConCategoria(nombre: string) {
  const servicios = await prisma.servicio.findMany({
    select: { nombre: true, categoria: true, activo: true },
    orderBy: { nombre: "asc" },
  });
  return servicios.filter((s) => etiquetaCategoriaServicio(s.categoria).toLowerCase() === nombre.toLowerCase());
}

/** Una categoría con servicios no se elimina: se nombran (activos o inactivos) y se pide cambiar su categoría primero. */
export async function deleteCategoria(id: string): Promise<ResultadoBorrado> {
  await requireSession();
  const categoria = await prisma.categoria.findUnique({ where: { id } });
  if (!categoria) return { ok: false, error: "Esta categoría ya no existe." };
  if (categoria.ambito === "SERVICIO") {
    const usan = await serviciosConCategoria(categoria.nombre);
    if (usan.length > 0) {
      const n = usan.length;
      return {
        ok: false,
        error: `No se puede eliminar «${categoria.nombre}»: ${n === 1 ? "la usa 1 servicio" : `la usan ${n} servicios`}. Cambia primero su categoría.`,
        hijos: nombrarHijos(usan.map((s) => ({ nombre: s.nombre, inactivo: !s.activo }))),
      };
    }
  }
  await prisma.categoria.delete({ where: { id } });
  return { ok: true };
}

// ── Unidades ─────────────────────────────────────────────────────────────────

export async function listUnidades() {
  await requireSession();
  return prisma.unidadMedida.findMany({ orderBy: { nombre: "asc" } });
}

export async function createUnidad(nombre: string, claveSat?: string): Promise<ResultadoAlta> {
  await requireSession();
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, "unidadMedida", "nombre");
    const repetida = await tx.unidadMedida.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
    if (repetida) {
      return { ok: false, fieldErrors: { nombre: `Ya existe «${repetida.nombre}» (no se distingue entre mayúsculas y minúsculas).` } };
    }
    await tx.unidadMedida.create({ data: { nombre, claveSat: claveSat || null } });
    return { ok: true };
  });
}

/** Siempre permitido: productos y líneas de cotización guardan su propia copia del texto de la unidad. */
export async function deleteUnidad(id: string): Promise<ResultadoBorrado> {
  await requireSession();
  await prisma.unidadMedida.deleteMany({ where: { id } });
  return { ok: true };
}

// ── Claves SAT ───────────────────────────────────────────────────────────────

export async function listClavesSat() {
  await requireSession();
  return prisma.claveSat.findMany({ orderBy: { clave: "asc" } });
}

/** Las claves que agrega el usuario nacen sin verificar. */
export async function createClaveSat(clave: string, descripcion: string, palabrasSimilares?: string): Promise<ResultadoAlta> {
  await requireSession();
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, "claveSat", "clave");
    const repetida = await tx.claveSat.findUnique({ where: { clave } });
    if (repetida) {
      return { ok: false, fieldErrors: { clave: `La clave ${clave} ya está en el catálogo («${repetida.descripcion}»).` } };
    }
    await tx.claveSat.create({ data: { clave, descripcion, palabrasSimilares: palabrasSimilares || null, verificada: false } });
    return { ok: true };
  });
}

/** Siempre permitido: las líneas de cotización guardan su propia copia de la clave. */
export async function deleteClaveSat(id: string): Promise<ResultadoBorrado> {
  await requireSession();
  await prisma.claveSat.deleteMany({ where: { id } });
  return { ok: true };
}
