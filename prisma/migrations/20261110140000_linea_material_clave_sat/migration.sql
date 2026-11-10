-- Fase 3: clave de producto/servicio SAT por línea de cotización de material.
-- Aditivo: columna nueva con default vacío; las líneas existentes quedan sin
-- clave (no se inventa ninguna). El texto lo captura el usuario.
ALTER TABLE "LineaCotizacionMaterial" ADD COLUMN "claveSat" TEXT NOT NULL DEFAULT '';
