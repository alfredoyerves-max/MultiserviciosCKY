"use server";

import { updateSystemConfig, updateCeavBandas } from "@/lib/data/config";
import { createCuentaBancaria, deleteCuentaBancaria, setCuentaBancariaActiva } from "@/lib/data/cuentasBancarias";
import { systemConfigSchema, ceavBandasUpdateSchema, PROTECTED_FISCAL_FIELDS } from "@/lib/schemas/config";
import { cuentaBancariaSchema } from "@/lib/schemas/cuentaBancaria";
import { requireSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";
import type { Usuario } from "@/generated/prisma/client";

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

/**
 * ¿Esta petición trae algún campo fiscal protegido? Su sola presencia en
 * el FormData es la señal de "el usuario pasó por el candado" — NumField
 * y CeavBandasTable (config-form.tsx) omiten el `name` por completo
 * cuando el campo está bloqueado, así que un envío que nunca desbloqueó
 * la sección fiscal simplemente no incluye estas llaves.
 */
function seccionFiscalDesbloqueada(formData: FormData): boolean {
  return PROTECTED_FISCAL_FIELDS.some((f) => formData.has(f)) || formData.has("ceavPct_1");
}

/**
 * Defensa en profundidad compartida por todas las escrituras protegidas
 * por el candado (config general, cuentas bancarias): la sección
 * desbloqueada del lado del cliente es solo UX — cualquier escritura real
 * vuelve a verificar la contraseña del usuario en sesión aquí. Lanza si
 * falta o es incorrecta.
 */
async function verificarPasswordFiscal(usuario: Usuario, formData: FormData) {
  const password = String(formData.get("fiscalPassword") ?? "");
  const valido = password !== "" && (await verifyPassword(password, usuario.passwordHash));
  if (!valido) {
    throw new Error("Contraseña incorrecta o faltante para guardar cambios protegidos.");
  }
}

export async function saveSystemConfigAction(
  _prev: ConfigActionState,
  formData: FormData
): Promise<ConfigActionState> {
  const usuario = await requireSession();

  // Defensa en profundidad: el candado de "Editar valores fiscales" solo
  // valida la contraseña del lado del cliente (estado de React en
  // fiscal-lock.tsx) — cualquier escritura que incluya campos fiscales
  // protegidos, sin importar si vino de la UI o de una petición directa
  // con una sesión válida, se vuelve a verificar aquí. Si falta la
  // contraseña o es incorrecta, se rechaza la escritura completa (no solo
  // la parte fiscal) antes de tocar la base de datos.
  if (seccionFiscalDesbloqueada(formData)) {
    const password = String(formData.get("fiscalPassword") ?? "");
    const valido = password !== "" && (await verifyPassword(password, usuario.passwordHash));
    if (!valido) {
      return {
        ok: false,
        error: "Contraseña incorrecta o faltante para guardar cambios a valores fiscales.",
      };
    }
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = systemConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
  }

  // La tabla CEAV solo se valida/actualiza si de verdad se envió (sección
  // desbloqueada) — de lo contrario formData.get("ceavPct_N") vendría
  // null para las 8 bandas y ceavBandasUpdateSchema siempre rechazaría el
  // guardado, incluso cuando el usuario no tocó nada de fiscal.
  if (formData.has("ceavPct_1")) {
    const ceavUpdates = Array.from({ length: 8 }, (_, i) => {
      const orden = i + 1;
      return { orden, porcentajePatronal: formData.get(`ceavPct_${orden}`) };
    });
    const parsedCeav = ceavBandasUpdateSchema.safeParse(ceavUpdates);
    if (!parsedCeav.success) {
      return { ok: false, error: "Revisa los porcentajes de la tabla CEAV." };
    }
    await updateCeavBandas(parsedCeav.data);
  }

  await updateSystemConfig(parsed.data);
  revalidatePath("/configuracion");
  revalidatePath("/");
  revalidatePath("/servicios");
  revalidatePath("/cotizaciones/nueva");
  return { ok: true };
}

export interface CuentaBancariaActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Alta de cuenta bancaria — bajo el mismo candado que el resto de la
 * sección fiscal/identidad. El formulario del panel reenvía la contraseña
 * ya verificada al desbloquear (ver CuentasBancariasPanel), y aquí se
 * vuelve a verificar server-side (defensa en profundidad).
 */
export async function addCuentaBancariaAction(
  _prev: CuentaBancariaActionState,
  formData: FormData
): Promise<CuentaBancariaActionState> {
  const usuario = await requireSession();

  try {
    await verificarPasswordFiscal(usuario, formData);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Contraseña inválida." };
  }

  const parsed = cuentaBancariaSchema.safeParse({
    banco: formData.get("banco"),
    clabe: formData.get("clabe"),
    numeroCuenta: formData.get("numeroCuenta") || undefined,
    titular: formData.get("titular"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
  }

  await createCuentaBancaria(parsed.data);
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function deleteCuentaBancariaAction(id: string, password: string) {
  const usuario = await requireSession();
  const formData = new FormData();
  formData.set("fiscalPassword", password);
  await verificarPasswordFiscal(usuario, formData);
  await deleteCuentaBancaria(id);
  revalidatePath("/configuracion");
}

export async function toggleCuentaBancariaActivaAction(id: string, activa: boolean, password: string) {
  const usuario = await requireSession();
  const formData = new FormData();
  formData.set("fiscalPassword", password);
  await verificarPasswordFiscal(usuario, formData);
  await setCuentaBancariaActiva(id, activa);
  revalidatePath("/configuracion");
}
