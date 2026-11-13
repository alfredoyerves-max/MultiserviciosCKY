import { advisoryLock, prisma } from "@/lib/prisma";
import { calcularSaldo } from "@/lib/cuentas";
import type { CuentaPorPagarInput, AbonoInput } from "@/lib/schemas/cuentas";
import { errorFechaAbono } from "@/lib/abonoFecha";
import { requireSession } from "@/lib/auth/session";

const TOLERANCIA_SALDO = 0.01; // centavos, por acumulación de floats

export async function createCuentaPorPagar(input: CuentaPorPagarInput) {
  await requireSession();
  return prisma.cuentaPorPagar.create({ data: input });
}

export async function listCuentasPorPagar() {
  await requireSession();
  return prisma.cuentaPorPagar.findMany({
    include: { abonos: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCuentaPorPagar(id: string) {
  await requireSession();
  return prisma.cuentaPorPagar.findUniqueOrThrow({
    where: { id },
    include: { abonos: { orderBy: { fecha: "desc" } } },
  });
}

/** Mismo criterio que registrarAbonoPorCobrar: lock + rechazo si el abono
 *  excede el saldo pendiente. Las cuentas por pagar no tienen "cancelada",
 *  así que no hay ese chequeo aquí. */
export async function registrarAbonoPorPagar(cuentaPorPagarId: string, input: AbonoInput) {
  await requireSession();
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, "cuentaPorPagar", cuentaPorPagarId);

    const cuenta = await tx.cuentaPorPagar.findUniqueOrThrow({
      where: { id: cuentaPorPagarId },
      include: { abonos: { select: { monto: true } } },
    });

    // Por pagar no nace de una cotización: solo se exige que la fecha no sea futura.
    const errorFecha = errorFechaAbono(input.fecha.toISOString().slice(0, 10));
    if (errorFecha) throw new Error(errorFecha);

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

/**
 * Borra por completo una cuenta por pagar. Solo permitido si no tiene ningún
 * abono: la relación con los abonos es en cascada, así que sin esta revisión
 * el borrado se llevaría el historial de pagos. La revisión y el borrado van
 * en la misma transacción, con el mismo candado que registrarAbonoPorPagar,
 * para que un abono simultáneo no se pierda.
 */
export async function eliminarCuentaPorPagar(id: string) {
  await requireSession();
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, "cuentaPorPagar", id);
    const cuenta = await tx.cuentaPorPagar.findUniqueOrThrow({
      where: { id },
      select: { _count: { select: { abonos: true } } },
    });
    if (cuenta._count.abonos > 0) {
      throw new Error("No se puede eliminar: esta cuenta ya tiene abonos registrados.");
    }
    await tx.cuentaPorPagar.delete({ where: { id } });
  });
}
