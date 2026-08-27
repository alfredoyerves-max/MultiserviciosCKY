-- Las 7 cuotas IMSS (enf. y maternidad cuota fija/adicional/dinero,
-- gastos médicos pensionados, invalidez y vida, guarderías, retiro) e
-- INFONAVIT son tasas fijas de ley (LSS/Ley del INFONAVIT), no se indexan
-- año con año. Dejan de vivir en SystemConfig (editable) y pasan a ser
-- constantes de código en src/lib/imssConstants.ts.
ALTER TABLE "SystemConfig"
  DROP COLUMN "imssEnfMatCuotaFijaPct",
  DROP COLUMN "imssEnfMatCuotaAdicPct",
  DROP COLUMN "imssEnfMatDineroPct",
  DROP COLUMN "imssGastosMedPensPct",
  DROP COLUMN "imssInvalidezVidaPct",
  DROP COLUMN "imssGuarderiasPct",
  DROP COLUMN "imssRetiroPct",
  DROP COLUMN "infonavitPct";

-- DataMigration: la tabla CEAV 2026 vigente en producción quedó sembrada
-- con las tasas de bandas 2-8 redondeadas a 2 decimales (ej. 3.68%) en
-- vez de las 3 decimales oficiales confirmadas por el dueño del negocio
-- (ej. 3.676%). prisma/seed.ts ya tenía los valores correctos — este
-- UPDATE sincroniza los datos en vivo con esa misma fuente, sin cambiar
-- ninguna fórmula ni la banda 1 (que ya estaba correcta).
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.03676 WHERE "anio" = 2026 AND "orden" = 2;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.04851 WHERE "anio" = 2026 AND "orden" = 3;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.05556 WHERE "anio" = 2026 AND "orden" = 4;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.06026 WHERE "anio" = 2026 AND "orden" = 5;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.06361 WHERE "anio" = 2026 AND "orden" = 6;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.06613 WHERE "anio" = 2026 AND "orden" = 7;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.07513 WHERE "anio" = 2026 AND "orden" = 8;
