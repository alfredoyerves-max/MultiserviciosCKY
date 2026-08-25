-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CuentaPorCobrar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacionId" TEXT NOT NULL,
    "montoTotal" REAL NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CuentaPorCobrar_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CuentaPorCobrar" ("cotizacionId", "createdAt", "fechaVencimiento", "id", "montoTotal", "updatedAt") SELECT "cotizacionId", "createdAt", "fechaVencimiento", "id", "montoTotal", "updatedAt" FROM "CuentaPorCobrar";
DROP TABLE "CuentaPorCobrar";
ALTER TABLE "new_CuentaPorCobrar" RENAME TO "CuentaPorCobrar";
CREATE UNIQUE INDEX "CuentaPorCobrar_cotizacionId_key" ON "CuentaPorCobrar"("cotizacionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
