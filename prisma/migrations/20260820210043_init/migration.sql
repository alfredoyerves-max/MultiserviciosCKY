-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "umaDiaria" REAL NOT NULL,
    "umaMensual" REAL NOT NULL,
    "topeSbcUmas" REAL NOT NULL,
    "primaRiesgoPct" REAL NOT NULL,
    "imssEnfMatCuotaFijaPct" REAL NOT NULL,
    "imssEnfMatCuotaAdicPct" REAL NOT NULL,
    "imssEnfMatDineroPct" REAL NOT NULL,
    "imssGastosMedPensPct" REAL NOT NULL,
    "imssInvalidezVidaPct" REAL NOT NULL,
    "imssGuarderiasPct" REAL NOT NULL,
    "imssRetiroPct" REAL NOT NULL,
    "imssCesantiaVejezPct" REAL NOT NULL,
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

-- CreateTable
CREATE TABLE "Puesto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "sueldoMensual" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
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
    CONSTRAINT "Servicio_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombreRazonSocial" TEXT NOT NULL,
    "rfc" TEXT,
    "contacto" TEXT,
    "tipoCliente" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cotizacion" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LineaCotizacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacionId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "modalidad" TEXT NOT NULL,
    "personas" INTEGER NOT NULL,
    "duracion" INTEGER NOT NULL,
    "costoRealUnitarioSnapshot" REAL NOT NULL,
    "costoRealTotal" REAL NOT NULL,
    "precioVenta" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LineaCotizacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LineaCotizacion_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_folio_key" ON "Cotizacion"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_usuarioId_key" ON "Session"("usuarioId");
