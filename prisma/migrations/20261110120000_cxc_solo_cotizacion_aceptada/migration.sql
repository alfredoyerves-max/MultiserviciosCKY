-- Invariante: una CuentaPorCobrar solo puede existir sobre una Cotizacion
-- en estado ACEPTADA. Aditivo: solo agrega funciones y triggers; no toca ni
-- valida filas existentes (los triggers solo disparan en escrituras nuevas).

-- 1) No se puede crear (ni reasignar) una cuenta sobre una cotización que no esté ACEPTADA.
CREATE OR REPLACE FUNCTION "fn_cxc_requiere_cotizacion_aceptada"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Cotizacion" WHERE "id" = NEW."cotizacionId" AND "estado" = 'ACEPTADA'
  ) THEN
    RAISE EXCEPTION 'Una cuenta por cobrar solo puede existir sobre una cotizacion ACEPTADA (cotizacionId=%)', NEW."cotizacionId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_cxc_requiere_cotizacion_aceptada"
BEFORE INSERT OR UPDATE OF "cotizacionId" ON "CuentaPorCobrar"
FOR EACH ROW EXECUTE FUNCTION "fn_cxc_requiere_cotizacion_aceptada"();

-- 2) No se puede sacar de ACEPTADA una cotización que aún tiene cuenta por
--    cobrar: primero se elimina la cuenta (la app lo hace en la misma transacción).
CREATE OR REPLACE FUNCTION "fn_cotizacion_no_sale_de_aceptada_con_cxc"() RETURNS trigger AS $$
BEGIN
  IF OLD."estado" = 'ACEPTADA' AND NEW."estado" <> 'ACEPTADA' AND EXISTS (
    SELECT 1 FROM "CuentaPorCobrar" WHERE "cotizacionId" = NEW."id"
  ) THEN
    RAISE EXCEPTION 'No se puede sacar de ACEPTADA la cotizacion % mientras tenga cuenta por cobrar', NEW."folio";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_cotizacion_no_sale_de_aceptada_con_cxc"
BEFORE UPDATE OF "estado" ON "Cotizacion"
FOR EACH ROW EXECUTE FUNCTION "fn_cotizacion_no_sale_de_aceptada_con_cxc"();
