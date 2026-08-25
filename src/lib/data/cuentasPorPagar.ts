import { prisma } from "@/lib/prisma";
import type { CuentaPorPagarInput, AbonoInput } from "@/lib/schemas/cuentas";

export function createCuentaPorPagar(input: CuentaPorPagarInput) {
  return prisma.cuentaPorPagar.create({ data: input });
}

export function listCuentasPorPagar() {
  return prisma.cuentaPorPagar.findMany({
    include: { abonos: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getCuentaPorPagar(id: string) {
  return prisma.cuentaPorPagar.findUniqueOrThrow({
    where: { id },
    include: { abonos: { orderBy: { fecha: "desc" } } },
  });
}

export function registrarAbonoPorPagar(cuentaPorPagarId: string, input: AbonoInput) {
  return prisma.abonoPorPagar.create({
    data: {
      cuentaPorPagarId,
      fecha: input.fecha,
      monto: input.monto,
      nota: input.nota || null,
    },
  });
}
