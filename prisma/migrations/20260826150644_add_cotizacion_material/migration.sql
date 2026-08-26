-- AlterTable
ALTER TABLE "Cotizacion" ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'SERVICIO',
ALTER COLUMN "margenUtilidadPct" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LineaCotizacionMaterial" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "importe" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineaCotizacionMaterial_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LineaCotizacionMaterial" ADD CONSTRAINT "LineaCotizacionMaterial_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCotizacionMaterial" ADD CONSTRAINT "LineaCotizacionMaterial_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
