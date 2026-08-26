-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "umaDiaria" DOUBLE PRECISION NOT NULL,
    "umaMensual" DOUBLE PRECISION NOT NULL,
    "topeSbcUmas" DOUBLE PRECISION NOT NULL,
    "salarioMinimoDiario" DOUBLE PRECISION NOT NULL,
    "salarioMinimoMensual" DOUBLE PRECISION NOT NULL,
    "primaRiesgoPct" DOUBLE PRECISION NOT NULL,
    "imssEnfMatCuotaFijaPct" DOUBLE PRECISION NOT NULL,
    "imssEnfMatCuotaAdicPct" DOUBLE PRECISION NOT NULL,
    "imssEnfMatDineroPct" DOUBLE PRECISION NOT NULL,
    "imssGastosMedPensPct" DOUBLE PRECISION NOT NULL,
    "imssInvalidezVidaPct" DOUBLE PRECISION NOT NULL,
    "imssGuarderiasPct" DOUBLE PRECISION NOT NULL,
    "imssRetiroPct" DOUBLE PRECISION NOT NULL,
    "infonavitPct" DOUBLE PRECISION NOT NULL,
    "isnPct" DOUBLE PRECISION NOT NULL,
    "impuestoAdicionalPct" DOUBLE PRECISION NOT NULL,
    "diasAguinaldo" INTEGER NOT NULL,
    "diasVacaciones" INTEGER NOT NULL,
    "primaVacacionalPct" DOUBLE PRECISION NOT NULL,
    "ivaPct" DOUBLE PRECISION NOT NULL,
    "retencionIsrPct" DOUBLE PRECISION NOT NULL,
    "horasPorDia" INTEGER NOT NULL,
    "diasPorSemana" INTEGER NOT NULL,
    "margenUtilidadDefaultPct" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CeavBanda" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "unidadLimite" TEXT NOT NULL,
    "limiteSuperior" DOUBLE PRECISION,
    "porcentajePatronal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CeavBanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puesto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sueldoMensual" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Puesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "puestoId" TEXT,
    "sueldoMensualInline" DOUBLE PRECISION,
    "nombrePuestoInline" TEXT,
    "personalPorUnidad" INTEGER NOT NULL DEFAULT 1,
    "modalidadesJson" TEXT NOT NULL DEFAULT '[]',
    "incluyeUniforme" BOOLEAN NOT NULL DEFAULT false,
    "costoUniforme" DOUBLE PRECISION,
    "vidaUtilUniformeMeses" INTEGER,
    "incluyeMaterial" BOOLEAN NOT NULL DEFAULT false,
    "costoMaterial" DOUBLE PRECISION,
    "vidaUtilMaterialMeses" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombreRazonSocial" TEXT NOT NULL,
    "rfc" TEXT,
    "contacto" TEXT,
    "tipoCliente" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "proyecto" TEXT,
    "margenUtilidadPct" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retencionIsr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAPagar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netoARecibir" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fechaVigencia" TIMESTAMP(3) NOT NULL,
    "esSoporte" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineaCotizacion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "modalidad" TEXT NOT NULL,
    "personas" INTEGER NOT NULL,
    "duracion" INTEGER NOT NULL,
    "costoRealUnitarioSnapshot" DOUBLE PRECISION NOT NULL,
    "costoRealTotal" DOUBLE PRECISION NOT NULL,
    "precioVenta" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineaCotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaPorCobrar" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaPorCobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonoPorCobrar" (
    "id" TEXT NOT NULL,
    "cuentaPorCobrarId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbonoPorCobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaPorPagar" (
    "id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaPorPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonoPorPagar" (
    "id" TEXT NOT NULL,
    "cuentaPorPagarId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbonoPorPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CeavBanda_anio_orden_key" ON "CeavBanda"("anio", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_folio_key" ON "Cotizacion"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaPorCobrar_cotizacionId_key" ON "CuentaPorCobrar"("cotizacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_usuarioId_key" ON "Session"("usuarioId");

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCotizacion" ADD CONSTRAINT "LineaCotizacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCotizacion" ADD CONSTRAINT "LineaCotizacion_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonoPorCobrar" ADD CONSTRAINT "AbonoPorCobrar_cuentaPorCobrarId_fkey" FOREIGN KEY ("cuentaPorCobrarId") REFERENCES "CuentaPorCobrar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonoPorPagar" ADD CONSTRAINT "AbonoPorPagar_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

