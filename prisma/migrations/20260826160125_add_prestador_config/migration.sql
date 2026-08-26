-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "prestadorDireccion" TEXT,
ADD COLUMN     "prestadorEmail" TEXT,
ADD COLUMN     "prestadorNombre" TEXT NOT NULL DEFAULT 'Multiservicios Yerves',
ADD COLUMN     "prestadorRfc" TEXT,
ADD COLUMN     "prestadorTelefono" TEXT;
