-- Fase 6: Seguimiento de cotizaciones (kanban). Agrega fechaVigencia
-- (NOT NULL, usada para el recordatorio de vencimiento) y esSoporte
-- (flag, filtro del kanban). SQLite no puede agregar una columna NOT NULL
-- sin default a una tabla con filas, así que se reconstruye la tabla
-- (mismo patrón que migraciones anteriores) preservando la cotización
-- real existente — se le calcula fechaVigencia = createdAt + 15 días como
-- valor de vigencia por defecto razonable, ya que no existía este campo
-- cuando se creó.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Cotizacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folio" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "proyecto" TEXT,
    "margenUtilidadPct" REAL NOT NULL,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "iva" REAL NOT NULL DEFAULT 0,
    "retencionIsr" REAL NOT NULL DEFAULT 0,
    "totalAPagar" REAL NOT NULL DEFAULT 0,
    "netoARecibir" REAL NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fechaVigencia" DATETIME NOT NULL,
    "esSoporte" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Cotizacion" (
    "id", "folio", "clienteId", "proyecto", "margenUtilidadPct",
    "subtotal", "iva", "retencionIsr", "totalAPagar", "netoARecibir",
    "estado", "fechaVigencia", "esSoporte", "createdAt", "updatedAt"
)
SELECT
    "id", "folio", "clienteId", "proyecto", "margenUtilidadPct",
    "subtotal", "iva", "retencionIsr", "totalAPagar", "netoARecibir",
    "estado", datetime("createdAt", '+15 days'), false, "createdAt", "updatedAt"
FROM "Cotizacion";

DROP TABLE "Cotizacion";
ALTER TABLE "new_Cotizacion" RENAME TO "Cotizacion";

CREATE UNIQUE INDEX "Cotizacion_folio_key" ON "Cotizacion"("folio");

PRAGMA foreign_keys=ON;
