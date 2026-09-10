-- Re-corrige un desfase de precisión en la tabla CEAV 2026 en vivo:
-- bandas 2-8 volvieron a quedar redondeadas a 2 decimales (ej. 3.68%) en
-- vez de las 3 decimales oficiales (ej. 3.676%) que ya se habían
-- corregido en la migración 20260827223000_hardcode_imss_infonavit_rates.
--
-- Causa raíz encontrada y corregida en config-form.tsx (CeavBandasTable):
-- el input editable de cada banda mostraba su valor por defecto redondeado
-- a 2 decimales (toPctDisplay). Como las secciones fiscales comparten un
-- solo candado, desbloquear CUALQUIERA de ellas también desbloqueaba la
-- tabla CEAV — y guardar la configuración por cualquier otro motivo (ISN,
-- datos del prestador, cuentas bancarias, etc.) reenviaba ese valor
-- redondeado como si fuera intencional, degradando la precisión guardada
-- en cada save. Ahora el input muestra 4 decimales de precisión por
-- defecto, así que un save que no toca la tabla CEAV ya no la corrompe.
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.03676 WHERE "anio" = 2026 AND "orden" = 2;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.04851 WHERE "anio" = 2026 AND "orden" = 3;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.05556 WHERE "anio" = 2026 AND "orden" = 4;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.06026 WHERE "anio" = 2026 AND "orden" = 5;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.06361 WHERE "anio" = 2026 AND "orden" = 6;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.06613 WHERE "anio" = 2026 AND "orden" = 7;
UPDATE "CeavBanda" SET "porcentajePatronal" = 0.07513 WHERE "anio" = 2026 AND "orden" = 8;
