-- Renombra las leyendas de la cotizacion segun el documento maestro de
-- diseno: lo que era "Condiciones Comerciales" pasa a llamarse
-- "Condiciones Operativas" (mismo texto), y lo que era "Condicion de pago"
-- pasa a ser el nuevo "Condiciones Comerciales" (texto nuevo sobre
-- moneda/vigencia/modalidad de pago). Se usan RENAME COLUMN (no DROP+ADD)
-- para no perder ninguna personalizacion que el usuario ya hubiera hecho.

ALTER TABLE "SystemConfig" RENAME COLUMN "condicionesComercialesServicio" TO "condicionesOperativasServicio";
ALTER TABLE "SystemConfig" RENAME COLUMN "condicionesComercialesMaterial" TO "condicionesOperativasMaterial";

ALTER TABLE "SystemConfig" RENAME COLUMN "condicionPagoServicio" TO "condicionesComercialesServicio";
ALTER TABLE "SystemConfig" RENAME COLUMN "condicionPagoMaterial" TO "condicionesComercialesMaterial";

ALTER TABLE "SystemConfig" ALTER COLUMN "condicionesComercialesServicio" SET DEFAULT 'Precios en moneda nacional (MXN). Modalidad de pago de contado: liquidación contra entrega o al término del periodo acordado. Precios sujetos a vigencia de cotización.';
ALTER TABLE "SystemConfig" ALTER COLUMN "condicionesComercialesMaterial" SET DEFAULT 'Precios en moneda nacional (MXN) sujetos a disponibilidad de inventario. Modalidad de pago 100% anticipado previo a la preparación de pedido y entrega/embarque.';

-- El valor YA guardado en las filas existentes sigue siendo el texto viejo
-- de "condicion de pago" (el default solo aplica a filas nuevas) — como
-- esta seccion todavia no se habia editado manualmente desde
-- /configuracion, se actualiza directo al nuevo texto de "Condiciones
-- Comerciales".
UPDATE "SystemConfig" SET "condicionesComercialesServicio" = 'Precios en moneda nacional (MXN). Modalidad de pago de contado: liquidación contra entrega o al término del periodo acordado. Precios sujetos a vigencia de cotización.'
WHERE "condicionesComercialesServicio" = 'Pago contra entrega / Liquidación al cierre del periodo convenido contra entrega del servicio.';

UPDATE "SystemConfig" SET "condicionesComercialesMaterial" = 'Precios en moneda nacional (MXN) sujetos a disponibilidad de inventario. Modalidad de pago 100% anticipado previo a la preparación de pedido y entrega/embarque.'
WHERE "condicionesComercialesMaterial" = 'Pago de contado (100% anticipado previo al suministro o entrega de material).';
