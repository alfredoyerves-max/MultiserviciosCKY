-- Addendum v4 punto 1: tabla CEAV por bandas + salario mínimo vigente.
-- Escrita a mano (no generada por `prisma migrate dev`) porque el entorno
-- no interactivo bloquea la confirmación de "posible pérdida de datos" al
-- quitar imssCesantiaVejezPct, y para esta migración ya existen datos
-- reales (Usuario, Puesto) que no deben tocarse.

-- Salario mínimo vigente 2026 (CONASAMI, zona general) como valor inicial
-- de la fila existente de SystemConfig — luego editable con candado.
ALTER TABLE "SystemConfig" ADD COLUMN "salarioMinimoDiario" REAL NOT NULL DEFAULT 315.04;
ALTER TABLE "SystemConfig" ADD COLUMN "salarioMinimoMensual" REAL NOT NULL DEFAULT 9582.47;

-- Cesantía y Vejez deja de ser tasa fija — reemplazada por CeavBanda.
ALTER TABLE "SystemConfig" DROP COLUMN "imssCesantiaVejezPct";

-- CreateTable
CREATE TABLE "CeavBanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "anio" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "unidadLimite" TEXT NOT NULL,
    "limiteSuperior" REAL,
    "porcentajePatronal" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CeavBanda_anio_orden_key" ON "CeavBanda"("anio", "orden");
