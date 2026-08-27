import { prisma } from "@/lib/prisma";
import type { ActivoInput } from "@/lib/schemas/activo";
import type { EventoActivoManualInput, DarDeBajaActivoInput } from "@/lib/schemas/eventoActivo";

export function listActivos() {
  return prisma.activo.findMany({ orderBy: { createdAt: "desc" } });
}

export function getActivo(id: string) {
  return prisma.activo.findUniqueOrThrow({
    where: { id },
    include: { eventos: { orderBy: { fecha: "desc" } } },
  });
}

export function createActivo(input: ActivoInput) {
  return prisma.activo.create({ data: input });
}

export function updateActivo(id: string, input: ActivoInput) {
  return prisma.activo.update({ where: { id }, data: input });
}

/**
 * Transición simple de estado (Funcional <-> En reparación) — DADO_DE_BAJA
 * nunca pasa por aquí, tiene su propio flujo dedicado (ver
 * darDeBajaActivo) porque además pide un motivo obligatorio. Registra
 * automáticamente un EventoActivo tipo CAMBIO_ESTADO en la misma
 * transacción — ningún cambio de estado queda sin historial.
 */
export async function updateEstadoActivo(id: string, nuevoEstado: "FUNCIONAL" | "EN_REPARACION") {
  return prisma.$transaction(async (tx) => {
    const activo = await tx.activo.findUniqueOrThrow({ where: { id }, select: { estado: true } });
    if (activo.estado === "DADO_DE_BAJA") {
      throw new Error("Este activo está dado de baja — no se puede reactivar desde aquí.");
    }

    await tx.activo.update({ where: { id }, data: { estado: nuevoEstado } });
    await tx.eventoActivo.create({
      data: {
        activoId: id,
        fecha: new Date(),
        tipo: "CAMBIO_ESTADO",
        descripcion: "Cambio de estado",
        estadoAnterior: activo.estado,
        estadoNuevo: nuevoEstado,
      },
    });
  });
}

/**
 * "Dar de baja" — modal dedicado de un solo paso (fecha + motivo). Pone
 * estado=DADO_DE_BAJA, guarda fechaBaja, y registra el EventoActivo con el
 * motivo capturado como descripción (a diferencia de updateEstadoActivo,
 * que usa un texto genérico porque ese flujo no pide motivo).
 */
export async function darDeBajaActivo(id: string, input: DarDeBajaActivoInput) {
  return prisma.$transaction(async (tx) => {
    const activo = await tx.activo.findUniqueOrThrow({ where: { id }, select: { estado: true } });
    if (activo.estado === "DADO_DE_BAJA") {
      throw new Error("Este activo ya está dado de baja.");
    }

    await tx.activo.update({
      where: { id },
      data: { estado: "DADO_DE_BAJA", fechaBaja: input.fecha },
    });
    await tx.eventoActivo.create({
      data: {
        activoId: id,
        fecha: input.fecha,
        tipo: "CAMBIO_ESTADO",
        descripcion: input.motivo,
        estadoAnterior: activo.estado,
        estadoNuevo: "DADO_DE_BAJA",
      },
    });
  });
}

/** "Registrar incidente" — evento manual (Incidente o Nota), nunca cambia
 *  el estado del activo. */
export function registrarEventoManual(activoId: string, input: EventoActivoManualInput) {
  return prisma.eventoActivo.create({
    data: {
      activoId,
      fecha: input.fecha,
      tipo: input.tipo,
      descripcion: input.descripcion,
    },
  });
}
