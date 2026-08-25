"use server";

import { countUsuarios, findUsuarioByEmail } from "@/lib/data/usuarios";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
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

  const usuario = await findUsuarioByEmail(parsed.data.email);
  if (!usuario) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  const valido = await verifyPassword(parsed.data.password, usuario.passwordHash);
  if (!valido) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  await createSession(usuario.id);
  redirect("/");
}
