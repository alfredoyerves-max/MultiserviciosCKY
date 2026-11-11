import "server-only";

import { randomBytes } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Usuario } from "@/generated/prisma/client";
import { INACTIVITY_MS, evaluarSesion } from "./sessionRules";

export const SESSION_COOKIE = "quotly_session";

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
 * Devuelve el usuario de la sesión activa, o null. UNA sola consulta (sesión
 * + usuario por join). Como efecto lateral, extiende expiresAt a 30 min desde
 * ahora (sliding expiration = auto-cierre por inactividad), pero solo si la
 * última escritura tiene más de RENEW_AFTER_MS (2 min): cualquier request
 * autenticado cuenta como actividad sin escribir en la BD en cada uno. Ver
 * evaluarSesion en sessionRules.ts.
 */
export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Sesión + usuario en UNA consulta (JOIN). Se usa SQL parametrizado en vez
  // de include porque relationLoadStrategy "join" sigue siendo función en
  // vista previa en Prisma 7.10 y activarla cambiaría todas las consultas.
  const rows = await prisma.$queryRaw<
    (Usuario & { sessionId: string; expiresAt: Date })[]
  >`
    SELECT s."id" AS "sessionId", s."expiresAt",
           u."id", u."email", u."passwordHash", u."nombre", u."createdAt", u."updatedAt"
    FROM "Session" s
    JOIN "Usuario" u ON u."id" = s."usuarioId"
    WHERE s."token" = ${token}
    LIMIT 1`;
  const fila = rows[0];
  if (!fila) return null;
  const { sessionId, expiresAt, ...usuario } = fila;
  const session = { id: sessionId, expiresAt, usuario: usuario as Usuario };

  const estado = evaluarSesion(session.expiresAt, new Date());
  if (estado === "expirada") {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (estado === "renovar") {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + INACTIVITY_MS) },
    });
  }

  return session.usuario;
}

/**
 * Protege una página, función de datos o server action. Se llama desde el
 * layout, desde CADA página y desde CADA función de datos: la autenticación
 * no puede depender solo del layout, que Next no vuelve a renderizar en
 * navegaciones del cliente y que no detiene el render de la página (ver
 * "Layouts and auth checks" en la guía de autenticación de Next). Envuelta en
 * cache() de React para que las llamadas de una misma petición compartan una
 * sola verificación. Si no hay ninguna cuenta creada
 * todavía, manda a /setup (bootstrap del primer usuario) en vez de a un
 * /login sin salida.
 */
export const requireSession = cache(async () => {
  // Primero la API dinámica: marca la página como dinámica antes de tocar la
  // BD, para que el build nunca intente prerenderizarla ni consultar datos.
  await cookies();

  const user = await getSession();
  if (!user) {
    // Solo en el camino de falla: sin ninguna cuenta creada se manda a /setup.
    const count = await prisma.usuario.count();
    redirect(count === 0 ? "/setup" : "/login");
  }

  return user;
});

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}
