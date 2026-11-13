"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import {
  createCategoria,
  deleteCategoria,
  createUnidad,
  deleteUnidad,
  createClaveSat,
  deleteClaveSat,
  type ResultadoAlta,
} from "@/lib/data/catalogos";
import { categoriaSchema, unidadSchema, claveSatCatalogoSchema } from "@/lib/schemas/catalogos";
import type { ResultadoBorrado } from "@/lib/dependencias";

function errores(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] = i.message;
  return out;
}

async function conRevalidacion<T extends { ok: boolean }>(r: T): Promise<T> {
  if (r.ok) {
    revalidatePath("/configuracion");
    revalidatePath("/servicios");
    revalidatePath("/inventario");
    revalidatePath("/cotizaciones/nueva/material");
  }
  return r;
}

export async function crearCategoriaServicioAction(datos: { nombre: string }): Promise<ResultadoAlta> {
  await requireSession();
  const p = categoriaSchema.safeParse(datos);
  if (!p.success) return { ok: false, fieldErrors: errores(p.error.issues) };
  return conRevalidacion(await createCategoria("SERVICIO", p.data.nombre));
}

export async function eliminarCategoriaAction(id: string): Promise<ResultadoBorrado> {
  await requireSession();
  return conRevalidacion(await deleteCategoria(id));
}

export async function crearUnidadAction(datos: { nombre: string; claveSat?: string }): Promise<ResultadoAlta> {
  await requireSession();
  const p = unidadSchema.safeParse(datos);
  if (!p.success) return { ok: false, fieldErrors: errores(p.error.issues) };
  return conRevalidacion(await createUnidad(p.data.nombre, p.data.claveSat));
}

export async function eliminarUnidadAction(id: string): Promise<ResultadoBorrado> {
  await requireSession();
  return conRevalidacion(await deleteUnidad(id));
}

export async function crearClaveSatAction(datos: {
  clave: string;
  descripcion: string;
  palabrasSimilares?: string;
}): Promise<ResultadoAlta> {
  await requireSession();
  const p = claveSatCatalogoSchema.safeParse(datos);
  if (!p.success) return { ok: false, fieldErrors: errores(p.error.issues) };
  return conRevalidacion(await createClaveSat(p.data.clave, p.data.descripcion, p.data.palabrasSimilares));
}

export async function eliminarClaveSatAction(id: string): Promise<ResultadoBorrado> {
  await requireSession();
  return conRevalidacion(await deleteClaveSat(id));
}
