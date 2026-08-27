"use server";

import { countUsuarios, createUsuario, findUsuarioByEmail } from "@/lib/data/usuarios";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, requireSession } from "@/lib/auth/session";
import { updateDatosEmpresaInicial } from "@/lib/data/config";
import { setupSchema } from "@/lib/schemas/auth";
import { datosEmpresaInicialSchema } from "@/lib/schemas/config";
import { redirect } from "next/navigation";

export interface SetupActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function setupAction(
  _prev: SetupActionState,
  formData: FormData
): Promise<SetupActionState> {
  // Bootstrap de un solo uso: si ya existe una cuenta, /setup queda
  // cerrado — no es una pantalla general de alta de usuarios.
  const existentes = await countUsuarios();
  if (existentes > 0) {
    redirect("/login");
  }

  const parsed = setupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
  }

  const existente = await findUsuarioByEmail(parsed.data.email);
  if (existente) {
    return { ok: false, error: "Ese correo ya está en uso.", fieldErrors: { email: "En uso" } };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const usuario = await createUsuario({
    email: parsed.data.email,
    passwordHash,
    nombre: parsed.data.nombre || undefined,
  });

  await createSession(usuario.id);
  // No redirige — el asistente sigue con el paso 2 ("Datos de la empresa")
  // dentro de la misma pantalla (ver SetupForm), en vez de mandar al
  // usuario al Dashboard con SystemConfig todavía sin su identidad real.
  return { ok: true };
}

export interface DatosEmpresaActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Paso 2 del asistente de arranque — captura los datos de identidad de la
 * empresa (Anexo G) inmediatamente después de crear la cuenta, en vez de
 * dejarlos dispersos para llenarse "después" en Configuración. Estos
 * campos están protegidos por el candado de contraseña en Configuración
 * (Anexo A) — aquí se reutiliza la MISMA contraseña que el usuario acaba
 * de capturar en el paso 1 (nunca se le vuelve a pedir), reenviada como
 * campo oculto por SetupForm y verificada aquí server-side igual que en
 * saveSystemConfigAction — misma barra de seguridad, sin duplicar UI.
 */
export async function saveDatosEmpresaSetupAction(
  _prev: DatosEmpresaActionState,
  formData: FormData
): Promise<DatosEmpresaActionState> {
  const usuario = await requireSession();

  const password = String(formData.get("fiscalPassword") ?? "");
  const valido = password !== "" && (await verifyPassword(password, usuario.passwordHash));
  if (!valido) {
    return { ok: false, error: "No se pudo verificar tu contraseña — recarga e intenta de nuevo." };
  }

  const parsed = datosEmpresaInicialSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
  }

  await updateDatosEmpresaInicial(parsed.data);
  redirect("/");
}
