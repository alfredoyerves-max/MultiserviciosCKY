-- CreateTable
CREATE TABLE "CuentaPorCobrar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacionId" TEXT NOT NULL,
    "montoTotal" REAL NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CuentaPorCobrar_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AbonoPorCobrar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaPorCobrarId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "monto" REAL NOT NULL,
    "nota" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbonoPorCobrar_cuentaPorCobrarId_fkey" FOREIGN KEY ("cuentaPorCobrarId") REFERENCES "CuentaPorCobrar" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CuentaPorPagar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "concepto" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "montoTotal" REAL NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AbonoPorPagar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaPorPagarId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "monto" REAL NOT NULL,
    "nota" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbonoPorPagar_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "umaDiaria" REAL NOT NULL,
    "umaMensual" REAL NOT NULL,
    "topeSbcUmas" REAL NOT NULL,
    "salarioMinimoDiario" REAL NOT NULL,
    "salarioMinimoMensual" REAL NOT NULL,
    "primaRiesgoPct" REAL NOT NULL,
    "imssEnfMatCuotaFijaPct" REAL NOT NULL,
    "imssEnfMatCuotaAdicPct" REAL NOT NULL,
    "imssEnfMatDineroPct" REAL NOT NULL,
    "imssGastosMedPensPct" REAL NOT NULL,
    "imssInvalidezVidaPct" REAL NOT NULL,
    "imssGuarderiasPct" REAL NOT NULL,
    "imssRetiroPct" REAL NOT NULL,
    "infonavitPct" REAL NOT NULL,
    "isnPct" REAL NOT NULL,
    "impuestoAdicionalPct" REAL NOT NULL,
    "diasAguinaldo" INTEGER NOT NULL,
    "diasVacaciones" INTEGER NOT NULL,
    "primaVacacionalPct" REAL NOT NULL,
    "ivaPct" REAL NOT NULL,
    "retencionIsrPct" REAL NOT NULL,
    "horasPorDia" INTEGER NOT NULL,
    "diasPorSemana" INTEGER NOT NULL,
    "margenUtilidadDefaultPct" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemConfig" ("diasAguinaldo", "diasPorSemana", "diasVacaciones", "horasPorDia", "id", "impuestoAdicionalPct", "imssEnfMatCuotaAdicPct", "imssEnfMatCuotaFijaPct", "imssEnfMatDineroPct", "imssGastosMedPensPct", "imssGuarderiasPct", "imssInvalidezVidaPct", "imssRetiroPct", "infonavitPct", "isnPct", "ivaPct", "margenUtilidadDefaultPct", "primaRiesgoPct", "primaVacacionalPct", "retencionIsrPct", "salarioMinimoDiario", "salarioMinimoMensual", "topeSbcUmas", "umaDiaria", "umaMensual", "updatedAt") SELECT "diasAguinaldo", "diasPorSemana", "diasVacaciones", "horasPorDia", "id", "impuestoAdicionalPct", "imssEnfMatCuotaAdicPct", "imssEnfMatCuotaFijaPct", "imssEnfMatDineroPct", "imssGastosMedPensPct", "imssGuarderiasPct", "imssInvalidezVidaPct", "imssRetiroPct", "infonavitPct", "isnPct", "ivaPct", "margenUtilidadDefaultPct", "primaRiesgoPct", "primaVacacionalPct", "retencionIsrPct", "salarioMinimoDiario", "salarioMinimoMensual", "topeSbcUmas", "umaDiaria", "umaMensual", "updatedAt" FROM "SystemConfig";
DROP TABLE "SystemConfig";
ALTER TABLE "new_SystemConfig" RENAME TO "SystemConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CuentaPorCobrar_cotizacionId_key" ON "CuentaPorCobrar"("cotizacionId");
