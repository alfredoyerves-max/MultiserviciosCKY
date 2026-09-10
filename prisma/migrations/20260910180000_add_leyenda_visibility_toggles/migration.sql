-- Interruptor por leyenda de la cotización — si está apagado, el bloque
-- completo (encabezado + texto) no aparece en el documento exportado
-- para ese tipo, aunque el texto siga guardado. Todas arrancan en true
-- (default(true)) para que nada cambie hasta que el dueño las desmarque.
ALTER TABLE "SystemConfig"
  ADD COLUMN "mostrarCondicionesComercialesServicio" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mostrarCondicionesComercialesMaterial" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mostrarCondicionesOperativasServicio" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mostrarCondicionesOperativasMaterial" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mostrarGarantiaServicio" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mostrarGarantiaMaterial" BOOLEAN NOT NULL DEFAULT true;
