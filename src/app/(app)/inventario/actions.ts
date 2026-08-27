"use server";

import { createProducto, setProductoActivo, updateProducto } from "@/lib/data/productos";
import { registrarEntrada, registrarSalida } from "@/lib/data/movimientosInventario";
import {
  createActivo,
  updateActivo,
  updateEstadoActivo,
  darDeBajaActivo,
  registrarEventoManual,
} from "@/lib/data/activos";
import { productoSchema } from "@/lib/schemas/producto";
import { entradaInventarioSchema, salidaInventarioSchema } from "@/lib/schemas/movimientoInventario";
import { activoSchema } from "@/lib/schemas/activo";
import { eventoActivoManualSchema, darDeBajaActivoSchema } from "@/lib/schemas/eventoActivo";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { FormActionState } from "./form-state";

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0])] = issue.message;
  return fieldErrors;
}

export async function saveProductoAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireSession();

  const id = formData.get("id");
  const parsed = productoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  if (id && typeof id === "string") {
    await updateProducto(id, parsed.data);
  } else {
    await createProducto(parsed.data);
  }
  revalidatePath("/inventario");
  return { ok: true };
}

export async function toggleProductoActivoAction(id: string, activo: boolean) {
  await requireSession();
  await setProductoActivo(id, activo);
  revalidatePath("/inventario");
}

export async function registrarEntradaAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireSession();

  const productoId = String(formData.get("productoId") ?? "");
  const parsed = entradaInventarioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success || !productoId) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.success ? [] : parsed.error.issues) };
  }

  await registrarEntrada(parsed.data);
  revalidatePath(`/inventario/${productoId}`);
  revalidatePath("/inventario");
  return { ok: true };
}

export async function registrarSalidaAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireSession();

  const productoId = String(formData.get("productoId") ?? "");
  const parsed = salidaInventarioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success || !productoId) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.success ? [] : parsed.error.issues) };
  }

  try {
    await registrarSalida(parsed.data);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al registrar la salida." };
  }

  revalidatePath(`/inventario/${productoId}`);
  revalidatePath("/inventario");
  return { ok: true };
}

export async function saveActivoAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireSession();

  const id = formData.get("id");
  const parsed = activoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  if (id && typeof id === "string") {
    await updateActivo(id, parsed.data);
  } else {
    await createActivo(parsed.data);
  }
  revalidatePath("/inventario");
  return { ok: true };
}

/** Transición simple de estado (Funcional <-> En reparación) desde el
 *  detalle del activo — DADO_DE_BAJA nunca se selecciona aquí, tiene su
 *  propio botón dedicado (ver darDeBajaActivoAction). */
export async function updateEstadoActivoAction(id: string, estado: string) {
  await requireSession();
  if (estado !== "FUNCIONAL" && estado !== "EN_REPARACION") {
    throw new Error("Usa el botón \"Dar de baja\" para ese cambio de estado.");
  }
  await updateEstadoActivo(id, estado);
  revalidatePath(`/inventario/activos/${id}`);
  revalidatePath("/inventario");
}

export async function darDeBajaActivoAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireSession();

  const activoId = String(formData.get("activoId") ?? "");
  if (!activoId) return { ok: false, error: "Falta el activo." };

  const parsed = darDeBajaActivoSchema.safeParse({
    fecha: formData.get("fecha"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  try {
    await darDeBajaActivo(activoId, parsed.data);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo dar de baja el activo." };
  }

  revalidatePath(`/inventario/activos/${activoId}`);
  revalidatePath("/inventario");
  return { ok: true };
}

export async function registrarIncidenteActivoAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireSession();

  const activoId = String(formData.get("activoId") ?? "");
  if (!activoId) return { ok: false, error: "Falta el activo." };

  const parsed = eventoActivoManualSchema.safeParse({
    tipo: formData.get("tipo"),
    descripcion: formData.get("descripcion"),
    fecha: formData.get("fecha"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  await registrarEventoManual(activoId, parsed.data);
  revalidatePath(`/inventario/activos/${activoId}`);
  return { ok: true };
}
