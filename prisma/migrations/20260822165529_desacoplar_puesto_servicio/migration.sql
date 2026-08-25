-- Addendum v4 punto 4: Servicio ya no depende de tener un Puesto
-- pre-guardado. SQLite no soporta "ALTER COLUMN ... DROP NOT NULL" ni
-- cambiar la acción de un FOREIGN KEY con ALTER TABLE simple, así que se
-- reconstruye la tabla (patrón estándar de Prisma para SQLite) preservando
-- los datos reales existentes (2 servicios "Limpieza" ligados a Puesto).

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Servicio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "puestoId" TEXT,
    "sueldoMensualInline" REAL,
    "nombrePuestoInline" TEXT,
    "personalPorUnidad" INTEGER NOT NULL DEFAULT 1,
    "modalidadesJson" TEXT NOT NULL DEFAULT '[]',
    "incluyeUniforme" BOOLEAN NOT NULL DEFAULT false,
    "costoUniforme" REAL,
    "vidaUtilUniformeMeses" INTEGER,
    "incluyeMaterial" BOOLEAN NOT NULL DEFAULT false,
    "costoMaterial" REAL,
    "vidaUtilMaterialMeses" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Servicio_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Servicio" (
    "id", "nombre", "descripcion", "categoria", "puestoId",
    "sueldoMensualInline", "nombrePuestoInline", "personalPorUnidad",
    "modalidadesJson", "incluyeUniforme", "costoUniforme", "vidaUtilUniformeMeses",
    "incluyeMaterial", "costoMaterial", "vidaUtilMaterialMeses",
    "activo", "createdAt", "updatedAt"
)
SELECT
    "id", "nombre", "descripcion", "categoria", "puestoId",
    NULL, NULL, "personalPorUnidad",
    "modalidadesJson", "incluyeUniforme", "costoUniforme", "vidaUtilUniformeMeses",
    "incluyeMaterial", "costoMaterial", "vidaUtilMaterialMeses",
    "activo", "createdAt", "updatedAt"
FROM "Servicio";

DROP TABLE "Servicio";
ALTER TABLE "new_Servicio" RENAME TO "Servicio";

PRAGMA foreign_keys=ON;
