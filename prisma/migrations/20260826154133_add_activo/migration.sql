-- CreateTable
CREATE TABLE "Activo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "fechaAdquisicion" TIMESTAMP(3) NOT NULL,
    "valorAdquisicion" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'FUNCIONAL',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activo_pkey" PRIMARY KEY ("id")
);
