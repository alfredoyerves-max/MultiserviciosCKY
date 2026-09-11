-- Protección contra fuerza bruta en /login (ver LoginAttempt en
-- schema.prisma) — una fila por correo intentado, exista o no como
-- Usuario real.
CREATE TABLE "LoginAttempt" (
    "email" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("email")
);
