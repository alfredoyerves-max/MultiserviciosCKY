import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Conexión con pool (pgbouncer, puerto 6543) — correcta para el runtime de
// la app; las migraciones usan DIRECT_URL en su lugar (ver prisma.config.ts).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Bloquea, dentro de una transacción, un id lógico arbitrario (producto,
 * cuenta por cobrar/pagar, etc.) vía `pg_advisory_xact_lock` — para que
 * dos operaciones concurrentes que leen y luego escriben el mismo
 * registro (ej. "¿cuánto queda de stock/saldo?" seguido de un insert) no
 * puedan ambas leer el estado "antes" de que la otra escriba. El lock se
 * libera solo al terminar la transacción. Con varios ids en la misma
 * transacción, bloquéalos en un orden determinístico (ej. ordenados) para
 * evitar deadlocks contra otra transacción que los bloquee en otro orden.
 * `namespace` evita colisiones de hash entre ids de distintas entidades
 * (ej. un Producto y una CuentaPorCobrar con el mismo cuid, improbable
 * pero no imposible).
 */
export async function advisoryLock(
  tx: { $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  namespace: string,
  id: string
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${namespace + ":" + id})::bigint)`;
}
