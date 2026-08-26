import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // El CLI (migrate/db push/seed) siempre usa la conexión DIRECTA, sin
  // pooler — PgBouncer en modo transacción (DATABASE_URL, puerto 6543) se
  // cuelga con las operaciones del motor de migraciones (locks/introspección
  // de sesión). La app en runtime NO lee este archivo — arma su propia
  // conexión con DATABASE_URL (pooled) directo en src/lib/prisma.ts.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
