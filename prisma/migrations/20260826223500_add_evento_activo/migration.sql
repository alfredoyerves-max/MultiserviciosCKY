-- CreateTable
CREATE TABLE "EventoActivo" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoActivo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventoActivo" ADD CONSTRAINT "EventoActivo_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
