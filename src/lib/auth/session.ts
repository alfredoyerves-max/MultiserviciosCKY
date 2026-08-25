import "server-only";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "quotly_session";
const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Crea (o reemplaza) la sesión de un usuario y fija la cookie. `usuarioId`
 * es único en Session, así que iniciar sesión en un segundo lugar
 * sobreescribe el token anterior — la sesión previa queda invalidada en su
 * siguiente request (getSession ya no la encontrará).
 *
 * La cookie no lleva maxAge/expires: es una cookie de sesión de navegador,
 * que la mayoría de los navegadores borran al cerrarse por completo (no
 * necesariamente al cerrar una sola pestaña si quedan otras abiertas del
 * mismo sitio — esa es una limitación del modelo de cookies, no de esta
 * implementación).
 */
export async function createSession(usuarioId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INACTIVITY_MS);

  await prisma.session.upsert({
    where: { usuarioId },
    create: { usuarioId, token, expiresAt },
    update: { token, expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/**
 * Devuelve el usuario de la sesión activa, o null. Como efecto lateral,
 * si la sesión es válida extiende expiresAt 30 min más (sliding
 * expiration) — esto es lo que implementa el auto-cierre por inactividad:
 * cualquier request autenticado (carga de página, server action, o el
 * heartbeat de actividad del cliente) cuenta como actividad.
 */
export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token }, include: { usuario: true } });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { expiresAt: new Date(Date.now() + INACTIVITY_MS) },
  });

  return session.usuario;
}

/**
 * Protege una página o server action. Si no hay ninguna cuenta creada
 * todavía, manda a /setup (bootstrap del primer usuario) en vez de a un
 * /login sin salida.
 */
export async function requireSession() {
  const count = await prisma.usuario.count();
  if (count === 0) redirect("/setup");

  const user = await getSession();
  if (!user) redirect("/login");

  return user;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}
