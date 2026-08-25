import { prisma } from "@/lib/prisma";
import type { GenerarCuentaPorCobrarInput, AbonoInput } from "@/lib/schemas/cuentas";

export async function generarCuentaPorCobrar(input: GenerarCuentaPorCobrarInput) {
  const cotizacion = await prisma.cotizacion.findUniqueOrThrow({
    where: { id: input.cotizacionId },
  });

  if (cotizacion.estado !== "ACEPTADA") {
    throw new Error("Solo se puede generar una cuenta por cobrar de una cotización Aceptada.");
  }

  const existente = await prisma.cuentaPorCobrar.findUnique({
    where: { cotizacionId: input.cotizacionId },
  });
  if (existente) {
    throw new Error("Esta cotización ya tiene una cuenta por cobrar generada.");
  }

  return prisma.cuentaPorCobrar.create({
    data: {
      cotizacionId: input.cotizacionId,
      montoTotal: cotizacion.netoARecibir,
      fechaVencimiento: input.fechaVencimiento,
    },
  });
}

export async function existeCuentaPorCobrar(cotizacionId: string): Promise<boolean> {
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
  return prisma.cuentaPorCobrar.update({ where: { id }, data: { cancelada: true } });
}

/**
 * Borra la cuenta por cobrar ligada a una cotización, si existe — usado
 * cuando una cotización Aceptada se mueve a Rechazada (para no dejarla
 * huérfana). Quien llama ya debe haber confirmado que no tiene abonos
 * (asegurarCambioEstadoPermitido en lib/data/cotizaciones.ts); no-op si
 * la cotización nunca tuvo una cuenta por cobrar.
 */
export async function eliminarCuentaPorCobrarPorCotizacion(cotizacionId: string) {
  const cuenta = await prisma.cuentaPorCobrar.findUnique({
    where: { cotizacionId },
    select: { id: true },
  });
  if (cuenta) {
    await prisma.cuentaPorCobrar.delete({ where: { id: cuenta.id } });
  }
}

export function listCuentasPorCobrar() {
  return prisma.cuentaPorCobrar.findMany({
    include: { cotizacion: { include: { cliente: true } }, abonos: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getCuentaPorCobrar(id: string) {
  return prisma.cuentaPorCobrar.findUniqueOrThrow({
    where: { id },
    include: {
      cotizacion: { include: { cliente: true } },
      abonos: { orderBy: { fecha: "desc" } },
    },
  });
}

export async function registrarAbonoPorCobrar(cuentaPorCobrarId: string, input: AbonoInput) {
  const cuenta = await prisma.cuentaPorCobrar.findUniqueOrThrow({
    where: { id: cuentaPorCobrarId },
    select: { cancelada: true },
  });
  if (cuenta.cancelada) {
    throw new Error("No se pueden registrar abonos en una cuenta cancelada.");
  }

  return prisma.abonoPorCobrar.create({
    data: {
      cuentaPorCobrarId,
      fecha: input.fecha,
      monto: input.monto,
      nota: input.nota || null,
    },
  });
}
