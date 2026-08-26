-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "aceptaCheque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aceptaEfectivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "aceptaTransferencia" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "condicionPagoMaterial" TEXT NOT NULL DEFAULT 'Pago de contado (100% anticipado previo al suministro o entrega de material).',
ADD COLUMN     "condicionPagoServicio" TEXT NOT NULL DEFAULT 'Pago contra entrega / Liquidación al cierre del periodo convenido contra entrega del servicio.',
ADD COLUMN     "condicionesComercialesMaterial" TEXT NOT NULL DEFAULT 'Precios exclusivos para la venta y entrega de materiales o productos solicitados. No incluye aplicación ni servicios operativos.',
ADD COLUMN     "condicionesComercialesServicio" TEXT NOT NULL DEFAULT 'El servicio incluye personal uniformado y monitoreo de calidad en sitio. Los insumos y consumibles de limpieza corren por cuenta del cliente, salvo solicitud expresa de suministro independiente.',
ADD COLUMN     "garantiaMaterial" TEXT NOT NULL DEFAULT 'Garantizamos la calidad, especificaciones técnicas y óptimo estado de los materiales suministrados, asegurando un estricto control en tiempos de entrega y disponibilidad de inventario.',
ADD COLUMN     "garantiaServicio" TEXT NOT NULL DEFAULT 'Nuestro compromiso es brindar un servicio profesional y supervisado, ejecutado por personal calificado bajo estrictos estándares de calidad, seguridad y cumplimiento en cada entrega.';

-- CreateTable
CREATE TABLE "CuentaBancaria" (
    "id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "clabe" TEXT NOT NULL,
    "numeroCuenta" TEXT,
    "titular" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolioSecuencia" (
    "anio" INTEGER NOT NULL,
    "siguiente" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FolioSecuencia_pkey" PRIMARY KEY ("anio")
);

-- DataMigration: siembra FolioSecuencia a partir de los folios ya
-- existentes (uno por año, siguiente = máximo usado + 1) — así el
-- contador atómico arranca donde el viejo esquema basado en count() se
-- quedó, sin colisionar con folios reales ya emitidos.
INSERT INTO "FolioSecuencia" ("anio", "siguiente")
SELECT
  CAST(split_part(folio, '-', 2) AS INTEGER) AS anio,
  MAX(CAST(split_part(folio, '-', 3) AS INTEGER)) + 1 AS siguiente
FROM "Cotizacion"
WHERE folio ~ '^COT-\d{4}-\d{4}$'
GROUP BY CAST(split_part(folio, '-', 2) AS INTEGER)
ON CONFLICT ("anio") DO UPDATE SET "siguiente" = EXCLUDED."siguiente";
