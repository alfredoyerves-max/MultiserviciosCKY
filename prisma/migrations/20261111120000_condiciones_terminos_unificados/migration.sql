-- Fase 4: las 6 leyendas editables (Condiciones Comerciales, Condiciones
-- Operativas y Garantía, cada una en versión Servicio/Material) y sus 6
-- interruptores se consolidan en 2 textos "Condiciones y Términos" (uno por
-- tipo de cotización) y 2 interruptores.
--
-- Aditivo: solo AGREGA columnas. Las 12 columnas anteriores se conservan sin
-- uso (su eliminación sería una limpieza aparte). El texto inicial es la
-- fusión revisada y aprobada de los 3 textos vigentes de cada tipo; la
-- leyenda fiscal de retención ISR y el bloque de firmas no forman parte de
-- esto y no cambian.

ALTER TABLE "SystemConfig"
  ADD COLUMN "condicionesTerminosServicio" TEXT NOT NULL DEFAULT 'Precios en moneda nacional (MXN), sujetos a la vigencia de esta cotización. Pago de contado: liquidación contra entrega o al término del periodo acordado. El servicio incluye personal uniformado y monitoreo de calidad en sitio; los insumos y consumibles de limpieza corren por cuenta del cliente, salvo solicitud expresa de suministro independiente. Nuestro compromiso es brindar un servicio profesional y supervisado, ejecutado por personal calificado bajo estrictos estándares de calidad, seguridad y cumplimiento en cada entrega.',
  ADD COLUMN "condicionesTerminosMaterial" TEXT NOT NULL DEFAULT 'Precios en moneda nacional (MXN), sujetos a la vigencia de esta cotización. Pago 100% anticipado, previo a la preparación del pedido y a su entrega o embarque. Precios exclusivos para la venta y entrega de los materiales o productos solicitados; no incluye aplicación ni servicios operativos. Garantizamos la calidad, las especificaciones técnicas y el óptimo estado de los materiales suministrados, con estricto control en tiempos de entrega.',
  ADD COLUMN "mostrarCondicionesTerminosServicio" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mostrarCondicionesTerminosMaterial" BOOLEAN NOT NULL DEFAULT true;
