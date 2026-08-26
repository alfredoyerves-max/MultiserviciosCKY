"use server";

import {
  registrarAbonoPorCobrar,
  eliminarCuentaPorCobrar,
  cancelarCuentaPorCobrar,
} from "@/lib/data/cuentasPorCobrar";
import {
  createCuentaPorPagar,
  registrarAbonoPorPagar,
} from "@/lib/data/cuentasPorPagar";
import { cuentaPorPagarSchema, abonoSchema } from "@/lib/schemas/cuentas";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./form-state";

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0])] = issue.message;
  return fieldErrors;
}

// La generación de CuentaPorCobrar ya no tiene una acción propia — ocurre
// automáticamente dentro de confirmarAceptacionAction (cotizaciones/actions.ts)
// al confirmar el modal de "Aceptada" en el kanban/detalle de cotización.

export async function createCuentaPorPagarAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const parsed = cuentaPorPagarSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  await createCuentaPorPagar(parsed.data);
  revalidatePath("/pagos");
  return { ok: true };
}

export async function registrarAbonoPorCobrarAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const cuentaId = String(formData.get("cuentaId") ?? "");
  const parsed = abonoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success || !cuentaId) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.success ? [] : parsed.error.issues) };
  }

  try {
    await registrarAbonoPorCobrar(cuentaId, parsed.data);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al registrar el abono." };
  }

  revalidatePath(`/pagos/cobrar/${cuentaId}`);
  revalidatePath("/pagos");
  return { ok: true };
}

/** Solo permitido si la cuenta no tiene abonos — si los tiene, la capa de
 *  datos rechaza con un mensaje claro; usa cancelarCuentaPorCobrarAction
 *  en su lugar. */
export async function eliminarCuentaPorCobrarAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const cuentaId = String(formData.get("cuentaId") ?? "");
  if (!cuentaId) return { ok: false, error: "Falta la cuenta." };

  try {
    await eliminarCuentaPorCobrar(cuentaId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al eliminar la cuenta." };
  }

  revalidatePath("/pagos");
  return { ok: true };
}

export async function cancelarCuentaPorCobrarAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const cuentaId = String(formData.get("cuentaId") ?? "");
  if (!cuentaId) return { ok: false, error: "Falta la cuenta." };

  await cancelarCuentaPorCobrar(cuentaId);
  revalidatePath(`/pagos/cobrar/${cuentaId}`);
  revalidatePath("/pagos");
  return { ok: true };
}

export async function registrarAbonoPorPagarAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const cuentaId = String(formData.get("cuentaId") ?? "");
  const parsed = abonoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success || !cuentaId) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.success ? [] : parsed.error.issues) };
  }

  try {
    await registrarAbonoPorPagar(cuentaId, parsed.data);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al registrar el abono." };
  }

  revalidatePath(`/pagos/pagar/${cuentaId}`);
  revalidatePath("/pagos");
  return { ok: true };
}
