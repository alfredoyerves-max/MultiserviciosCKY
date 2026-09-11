import "server-only";

import { prisma } from "@/lib/prisma";

// Protección contra fuerza bruta — persistida en BD (ver LoginAttempt en
// schema.prisma), no en memoria del proceso: Vercel corre cada request en
// una función serverless que puede ser una instancia distinta cada vez,
// así que un contador en memoria no sobreviviría entre intentos.
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 10 * 60 * 1000; // 10 minutos

export interface LoginLockStatus {
  bloqueado: boolean;
  /** Redondeado hacia arriba — "1 minuto" en vez de "menos de 1 minuto"
   *  cuando falta poco, para que el mensaje nunca diga "0 minutos". */
  minutosRestantes?: number;
}

/**
 * ¿Este correo está bloqueado ahora mismo? Se consulta ANTES de verificar
 * la contraseña, para un correo bloqueado nunca llega a comparar el hash
 * (evita también usarlo como oráculo de temporización). Si el bloqueo ya
 * venció, lo limpia de una vez — el intento actual arranca una racha
 * nueva, no seguido del contador viejo.
 */
export async function checkLoginLock(email: string): Promise<LoginLockStatus> {
  const row = await prisma.loginAttempt.findUnique({ where: { email } });
  if (!row?.bloqueadoHasta) return { bloqueado: false };

  if (row.bloqueadoHasta > new Date()) {
    const minutosRestantes = Math.max(1, Math.ceil((row.bloqueadoHasta.getTime() - Date.now()) / 60000));
    return { bloqueado: true, minutosRestantes };
  }

  await prisma.loginAttempt.delete({ where: { email } }).catch(() => {});
  return { bloqueado: false };
}

/**
 * Registra un intento fallido (correo inexistente o contraseña
 * incorrecta — se llama igual en ambos casos, para que el conteo de
 * intentos no delate cuáles correos existen). Al llegar a MAX_INTENTOS,
 * activa el bloqueo temporal y reinicia el contador — lo que protege es
 * el bloqueo, no un contador que siga subiendo sin límite.
 */
export async function recordFailedLoginAttempt(email: string): Promise<void> {
  const row = await prisma.loginAttempt.upsert({
    where: { email },
    create: { email, intentos: 1 },
    update: { intentos: { increment: 1 } },
  });

  if (row.intentos >= MAX_INTENTOS) {
    await prisma.loginAttempt.update({
      where: { email },
      data: { intentos: 0, bloqueadoHasta: new Date(Date.now() + BLOQUEO_MS) },
    });
  }
}

/** Login exitoso — borra cualquier racha de intentos fallidos previa. */
export async function clearLoginAttempts(email: string): Promise<void> {
  await prisma.loginAttempt.delete({ where: { email } }).catch(() => {});
}
