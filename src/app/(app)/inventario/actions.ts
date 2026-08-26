"use server";

import { createProducto, setProductoActivo, updateProducto } from "@/lib/data/productos";
import { registrarEntrada, registrarSalida } from "@/lib/data/movimientosInventario";
import { productoSchema } from "@/lib/schemas/producto";
import { entradaInventarioSchema, salidaInventarioSchema } from "@/lib/schemas/movimientoInventario";
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
