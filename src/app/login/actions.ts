"use server";

import { countUsuarios, findUsuarioByEmail } from "@/lib/data/usuarios";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkLoginLock, recordFailedLoginAttempt, clearLoginAttempts } from "@/lib/auth/loginRateLimit";
import { loginSchema } from "@/lib/schemas/auth";
import { redirect } from "next/navigation";

export interface LoginActionState {
  ok: boolean;
  error?: string;
}

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  if ((await countUsuarios()) === 0) {
    redirect("/setup");
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: "Correo o contraseña inválidos." };
  }
  const { email, password } = parsed.data;

  // Protección contra fuerza bruta — se revisa ANTES de tocar la
  // contraseña, para que un correo bloqueado nunca llegue a comparar el
  // hash (ver lib/auth/loginRateLimit.ts).
  const lock = await checkLoginLock(email);
  if (lock.bloqueado) {
    return {
      ok: false,
      error: `Demasiados intentos fallidos. Vuelve a intentar en ${lock.minutosRestantes} minuto(s).`,
    };
  }

  const usuario = await findUsuarioByEmail(email);
  const valido = usuario ? await verifyPassword(password, usuario.passwordHash) : false;
  if (!usuario || !valido) {
    // Mismo registro de intento fallido exista o no el correo — así el
    // conteo de intentos no delata cuáles correos son reales.
    await recordFailedLoginAttempt(email);
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  await clearLoginAttempts(email);
  await createSession(usuario.id);
  redirect("/");
}
