"use server";

import { countUsuarios, createUsuario, findUsuarioByEmail } from "@/lib/data/usuarios";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setupSchema } from "@/lib/schemas/auth";
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
  redirect("/");
}
