import { advisoryLock, prisma } from "@/lib/prisma";
import { calcularSaldo } from "@/lib/cuentas";
import type { AbonoInput } from "@/lib/schemas/cuentas";
import { errorFechaAbono } from "@/lib/abonoFecha";
import { fechaMexico } from "@/lib/fechaLocal";
import { requireSession } from "@/lib/auth/session";

const TOLERANCIA_SALDO = 0.01; // centavos, por acumulación de floats

export async function existeCuentaPorCobrar(cotizacionId: string): Promise<boolean> {
  await requireSession();
  const existente = await prisma.cuentaPorCobrar.findUnique({
    where: { cotizacionId },
    select: { id: true },
  });
  return existente !== null;
}

/**
 * Borra por completo una cuenta por cobrar. Solo permitido si no tiene
 * ningún abono registrado — si ya tiene abonos, usa cancelarCuentaPorCobrar
 * en su lugar (conserva el historial).
 */
export async function eliminarCuentaPorCobrar(id: string) {
  await requireSession();
  const cuenta = await prisma.cuentaPorCobrar.findUniqueOrThrow({
    where: { id },
    select: { abonos: { select: { id: true }, take: 1 } },
  });
  if (cuenta.abonos.length > 0) {
    throw new Error(
      "No se puede eliminar: esta cuenta ya tiene abonos registrados. Cancélala en su lugar."
    );
  }
  await prisma.cuentaPorCobrar.delete({ where: { id } });
}

/**
 * Marca una cuenta por cobrar como cancelada. Conserva su historial de
 * abonos (auditoría) pero deja de contar en los KPIs de "por cobrar"/
 * "vencido" y ya no admite abonos nuevos — ver registrarAbonoPorCobrar.
 */
export async function cancelarCuentaPorCobrar(id: string) {
  await requireSession();
  return prisma.cuentaPorCobrar.update({ where: { id }, data: { cancelada: true } });
}

export async function listCuentasPorCobrar() {
  await requireSession();
  return prisma.cuentaPorCobrar.findMany({
    include: { cotizacion: { include: { cliente: true } }, abonos: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCuentaPorCobrar(id: string) {
  await requireSession();
  return prisma.cuentaPorCobrar.findUniqueOrThrow({
    where: { id },
    include: {
      cotizacion: { include: { cliente: true } },
      abonos: { orderBy: { fecha: "desc" } },
    },
  });
}

/**
 * Registra un abono. Corre dentro de una transacción con un advisory lock
 * por cuenta (mismo criterio que lockProducto en lib/inventario.ts) para
 * que dos abonos concurrentes sobre la misma cuenta no puedan ambos leer
 * el saldo "antes" de que el otro escriba — y rechaza el abono si excede
 * el saldo pendiente (dejar un saldo negativo no tiene sentido de
 * negocio: no representa ninguna transacción real posible).
 */
export async function registrarAbonoPorCobrar(cuentaPorCobrarId: string, input: AbonoInput) {
  await requireSession();
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, "cuentaPorCobrar", cuentaPorCobrarId);

    const cuenta = await tx.cuentaPorCobrar.findUniqueOrThrow({
      where: { id: cuentaPorCobrarId },
      include: { abonos: { select: { monto: true } }, cotizacion: { select: { createdAt: true } } },
    });
    if (cuenta.cancelada) {
      throw new Error("No se pueden registrar abonos en una cuenta cancelada.");
    }

    const errorFecha = errorFechaAbono(input.fecha.toISOString().slice(0, 10), fechaMexico(cuenta.cotizacion.createdAt));
    if (errorFecha) throw new Error(errorFecha);

    const saldo = calcularSaldo(cuenta.montoTotal, cuenta.abonos);
    if (input.monto > saldo + TOLERANCIA_SALDO) {
      throw new Error(
        `El abono ($${input.monto.toFixed(2)}) excede el saldo pendiente ($${saldo.toFixed(2)}).`
      );
    }

    return tx.abonoPorCobrar.create({
      data: {
        cuentaPorCobrarId,
        fecha: input.fecha,
        monto: input.monto,
        nota: input.nota || null,
      },
    });
  });
}
