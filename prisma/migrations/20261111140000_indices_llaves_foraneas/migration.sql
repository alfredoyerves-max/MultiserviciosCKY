-- Índices en las 10 llaves foráneas que no tenían uno que las cubriera.
-- Solo CREATE INDEX: no modifica, mueve ni borra ningún dato. Generado con
-- `prisma migrate diff` (base de datos real -> schema.prisma), que no arrojó
-- ninguna otra diferencia.

-- CreateIndex
CREATE INDEX "AbonoPorCobrar_cuentaPorCobrarId_idx" ON "AbonoPorCobrar"("cuentaPorCobrarId");

-- CreateIndex
CREATE INDEX "AbonoPorPagar_cuentaPorPagarId_idx" ON "AbonoPorPagar"("cuentaPorPagarId");

-- CreateIndex
CREATE INDEX "Cotizacion_clienteId_idx" ON "Cotizacion"("clienteId");

-- CreateIndex
CREATE INDEX "EventoActivo_activoId_idx" ON "EventoActivo"("activoId");

-- CreateIndex
CREATE INDEX "LineaCotizacion_cotizacionId_idx" ON "LineaCotizacion"("cotizacionId");

-- CreateIndex
CREATE INDEX "LineaCotizacion_servicioId_idx" ON "LineaCotizacion"("servicioId");

-- CreateIndex
CREATE INDEX "LineaCotizacionMaterial_cotizacionId_idx" ON "LineaCotizacionMaterial"("cotizacionId");

-- CreateIndex
CREATE INDEX "LineaCotizacionMaterial_productoId_idx" ON "LineaCotizacionMaterial"("productoId");

-- CreateIndex
CREATE INDEX "MovimientoInventario_productoId_idx" ON "MovimientoInventario"("productoId");

-- CreateIndex
CREATE INDEX "Servicio_puestoId_idx" ON "Servicio"("puestoId");
