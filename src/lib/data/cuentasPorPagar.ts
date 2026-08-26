import { advisoryLock, prisma } from "@/lib/prisma";
import { calcularSaldo } from "@/lib/cuentas";
import type { CuentaPorPagarInput, AbonoInput } from "@/lib/schemas/cuentas";

const TOLERANCIA_SALDO = 0.01; // centavos, por acumulación de floats

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

/** Mismo criterio que registrarAbonoPorCobrar: lock + rechazo si el abono
 *  excede el saldo pendiente. Las cuentas por pagar no tienen "cancelada",
 *  así que no hay ese chequeo aquí. */
export async function registrarAbonoPorPagar(cuentaPorPagarId: string, input: AbonoInput) {
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, "cuentaPorPagar", cuentaPorPagarId);

    const cuenta = await tx.cuentaPorPagar.findUniqueOrThrow({
      where: { id: cuentaPorPagarId },
      include: { abonos: { select: { monto: true } } },
    });

    const saldo = calcularSaldo(cuenta.montoTotal, cuenta.abonos);
    if (input.monto > saldo + TOLERANCIA_SALDO) {
      throw new Error(
        `El abono ($${input.monto.toFixed(2)}) excede el saldo pendiente ($${saldo.toFixed(2)}).`
      );
    }

    return tx.abonoPorPagar.create({
      data: {
        cuentaPorPagarId,
        fecha: input.fecha,
        monto: input.monto,
        nota: input.nota || null,
      },
    });
  });
}
