-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DataMigration: la fila de SystemConfig ya existia antes de esta migracion
-- (es un singleton sembrado una sola vez) — sin este backfill, createdAt
-- quedaria con la fecha de HOY (cuando corre la migracion), lo que
-- limitaria incorrectamente el rango de navegacion del Dashboard a partir
-- de hoy, ocultando meses con cotizaciones reales ya existentes. Se usa la
-- fecha real mas antigua disponible: el primer Usuario creado, o si no
-- existe, la primera Cotizacion, o si tampoco existe, se deja la fecha de
-- la migracion.
UPDATE "SystemConfig"
SET "createdAt" = COALESCE(
  (SELECT MIN(u."createdAt") FROM "Usuario" u),
  (SELECT MIN(c."createdAt") FROM "Cotizacion" c),
  "createdAt"
)
WHERE "id" = 1;
