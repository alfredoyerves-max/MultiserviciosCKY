"use server";

import { updateSystemConfig, updateCeavBandas } from "@/lib/data/config";
import { systemConfigSchema, ceavBandasUpdateSchema } from "@/lib/schemas/config";
import { requireSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";

export interface ConfigActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface UnlockActionState {
  ok: boolean;
  error?: string;
}

/**
 * Verifica la contraseña del usuario en sesión para desbloquear la sección
 * fiscal de /configuracion. No cambia nada en BD — solo confirma identidad;
 * el desbloqueo en sí vive como estado de React en el cliente (se resetea
 * al recargar la página, que es justo el comportamiento de un candado).
 */
export async function unlockFiscalAction(
  _prev: UnlockActionState,
  formData: FormData
): Promise<UnlockActionState> {
  const usuario = await requireSession();

  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { ok: false, error: "Captura tu contraseña." };
  }

  const valido = await verifyPassword(password, usuario.passwordHash);
  if (!valido) {
    return { ok: false, error: "Contraseña incorrecta." };
  }

  return { ok: true };
}

export async function saveSystemConfigAction(
  _prev: ConfigActionState,
  formData: FormData
): Promise<ConfigActionState> {
  await requireSession();

  const raw = Object.fromEntries(formData.entries());
  const parsed = systemConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
  }

  const ceavUpdates = Array.from({ length: 8 }, (_, i) => {
    const orden = i + 1;
    return { orden, porcentajePatronal: formData.get(`ceavPct_${orden}`) };
  });
  const parsedCeav = ceavBandasUpdateSchema.safeParse(ceavUpdates);
  if (!parsedCeav.success) {
    return { ok: false, error: "Revisa los porcentajes de la tabla CEAV." };
  }

  await updateSystemConfig(parsed.data);
  await updateCeavBandas(parsedCeav.data);
  revalidatePath("/configuracion");
  revalidatePath("/");
  revalidatePath("/servicios");
  revalidatePath("/cotizaciones/nueva");
  return { ok: true };
}
