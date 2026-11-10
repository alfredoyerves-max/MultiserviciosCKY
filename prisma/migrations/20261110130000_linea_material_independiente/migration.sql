-- Fase 2: la línea de cotización de material deja de depender de Inventario.
-- Aditivo: no borra ni reescribe datos existentes de forma destructiva.
--   * productoId pasa a ser opcional (atajo, ya no obligatorio).
--   * se agregan descripcion y unidadMedida propias de la línea.
--   * las líneas existentes se rellenan UNA vez con el nombre/unidad de su
--     producto (snapshot: si el producto se renombra, el documento no cambia).

ALTER TABLE "LineaCotizacionMaterial" DROP CONSTRAINT "LineaCotizacionMaterial_productoId_fkey";

ALTER TABLE "LineaCotizacionMaterial"
  ALTER COLUMN "productoId" DROP NOT NULL,
  ADD COLUMN "descripcion" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "unidadMedida" TEXT NOT NULL DEFAULT 'PIEZA';

UPDATE "LineaCotizacionMaterial" l
SET "descripcion" = p."nombre", "unidadMedida" = p."unidadMedida"
FROM "Producto" p
WHERE p."id" = l."productoId" AND l."descripcion" = '';

ALTER TABLE "LineaCotizacionMaterial"
  ADD CONSTRAINT "LineaCotizacionMaterial_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
