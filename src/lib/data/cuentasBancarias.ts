import { prisma } from "@/lib/prisma";
import type { CuentaBancariaInput } from "@/lib/schemas/cuentaBancaria";
import { requireSession } from "@/lib/auth/session";
import { nombrarHijos, type ResultadoBorrado } from "@/lib/dependencias";

export async function listCuentasBancarias() {
  await requireSession();
  return prisma.cuentaBancaria.findMany({ orderBy: { createdAt: "asc" } });
}

/** Usado por la exportación de cotizaciones — solo las cuentas activas. */
export async function listCuentasBancariasActivas() {
  await requireSession();
  return prisma.cuentaBancaria.findMany({ where: { activa: true }, orderBy: { createdAt: "asc" } });
}

export async function createCuentaBancaria(input: CuentaBancariaInput) {
  await requireSession();
  return prisma.cuentaBancaria.create({ data: input });
}

export async function setCuentaBancariaActiva(id: string, activa: boolean) {
  await requireSession();
  return prisma.cuentaBancaria.update({ where: { id }, data: { activa } });
}

/**
 * Elimina una cuenta bancaria. No tiene llaves foráneas, pero las exportaciones
 * (Word/PDF) imprimen las cuentas ACTIVAS de hoy en cada cotización, así que una
 * cuenta activa "tiene hijos": todas las cotizaciones existentes. Se pide
 * desactivarla antes (queda guardada, solo deja de salir en los documentos).
 * Una cuenta inactiva, o cualquiera cuando no hay cotizaciones, se puede borrar.
 */
export async function deleteCuentaBancaria(id: string): Promise<ResultadoBorrado> {
  await requireSession();
  const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id }, select: { banco: true, activa: true } });
  if (!cuenta) return { ok: false, error: "Esta cuenta ya no existe." };

  if (cuenta.activa) {
    const cotizaciones = await prisma.cotizacion.findMany({ select: { folio: true }, orderBy: { folio: "asc" } });
    if (cotizaciones.length > 0) {
      const n = cotizaciones.length;
      return {
        ok: false,
        error: `No se puede eliminar la cuenta de «${cuenta.banco}»: está activa y aparece en los documentos (Word/PDF) de ${n === 1 ? "1 cotización" : `${n} cotizaciones`}. Desactívala primero; deja de salir en las exportaciones y se conserva.`,
        hijos: nombrarHijos(cotizaciones.map((c) => ({ nombre: c.folio }))),
      };
    }
  }
  await prisma.cuentaBancaria.delete({ where: { id } });
  return { ok: true };
}
