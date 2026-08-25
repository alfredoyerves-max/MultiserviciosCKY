import { prisma } from "@/lib/prisma";
import { getSystemConfigConCeav } from "./config";
import { calcularCostoReal, costoRealPorModalidad } from "@/lib/costEngine";
import { calcularTotalesFiscales } from "@/lib/fiscalEngine";
import { sueldoMensualEfectivo } from "@/lib/servicioCosto";
import type { CotizacionInput } from "@/lib/schemas/cotizacion";
import type { TipoCliente } from "@/lib/enums";

async function generarFolio(): Promise<string> {
  const year = new Date().getFullYear();
  const inicioAnio = new Date(year, 0, 1);
  const count = await prisma.cotizacion.count({ where: { createdAt: { gte: inicioAnio } } });
  return `COT-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createCotizacion(input: CotizacionInput) {
  const config = await getSystemConfigConCeav();

  const servicioIds = [...new Set(input.lineas.map((l) => l.servicioId))];
  const servicios = await prisma.servicio.findMany({
    where: { id: { in: servicioIds } },
    include: { puesto: true },
  });
  const servicioById = new Map(servicios.map((s) => [s.id, s]));

  // Resolver cliente: existente (tomar su tipoCliente de BD, nunca del
  // cliente HTTP) o crear uno nuevo con los datos capturados en el wizard.
  let clienteId = input.clienteId;
  let tipoCliente: TipoCliente;

  if (clienteId) {
    const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } });
    tipoCliente = cliente.tipoCliente as TipoCliente;
  } else if (input.clienteNuevo) {
    const cliente = await prisma.cliente.create({ data: input.clienteNuevo });
    clienteId = cliente.id;
    tipoCliente = cliente.tipoCliente as TipoCliente;
  } else {
    throw new Error("Falta el cliente de la cotización.");
  }

  const margenFraccion = input.margenUtilidadPct / 100;

  const lineasCalculadas = input.lineas.map((linea) => {
    const servicio = servicioById.get(linea.servicioId);
    if (!servicio) throw new Error(`Servicio ${linea.servicioId} no encontrado.`);

    const costo = calcularCostoReal(config, {
      sueldoMensualPuesto: sueldoMensualEfectivo(servicio),
      incluyeUniforme: servicio.incluyeUniforme,
      costoUniforme: servicio.costoUniforme,
      vidaUtilUniformeMeses: servicio.vidaUtilUniformeMeses,
      incluyeMaterial: servicio.incluyeMaterial,
      costoMaterial: servicio.costoMaterial,
      vidaUtilMaterialMeses: servicio.vidaUtilMaterialMeses,
    });
    const costoUnitario = costoRealPorModalidad(costo, linea.modalidad) * servicio.personalPorUnidad;
    const costoRealTotal = costoUnitario * linea.personas * linea.duracion;
    const precioVenta = costoRealTotal * (1 + margenFraccion);

    return {
      servicioId: linea.servicioId,
      modalidad: linea.modalidad,
      personas: linea.personas,
      duracion: linea.duracion,
      costoRealUnitarioSnapshot: costoUnitario,
      costoRealTotal,
      precioVenta,
    };
  });

  const subtotal = lineasCalculadas.reduce((sum, l) => sum + l.precioVenta, 0);
  const fiscal = calcularTotalesFiscales(subtotal, tipoCliente, config.ivaPct, config.retencionIsrPct);

  const folio = await generarFolio();

  const fechaVigencia = new Date();
  fechaVigencia.setDate(fechaVigencia.getDate() + input.diasVigencia);

  return prisma.cotizacion.create({
    data: {
      folio,
      clienteId,
      proyecto: input.proyecto || null,
      margenUtilidadPct: margenFraccion,
      subtotal: fiscal.subtotal,
      iva: fiscal.iva,
      retencionIsr: fiscal.retencionIsr,
      totalAPagar: fiscal.totalAPagar,
      netoARecibir: fiscal.netoARecibir,
      fechaVigencia,
      esSoporte: input.esSoporte ?? false,
      lineas: { create: lineasCalculadas },
    },
    include: { cliente: true, lineas: { include: { servicio: true } } },
  });
}

/** Usado por el Dashboard — excluye cotizaciones de soporte por defecto,
 *  igual que el kanban de seguimiento (Fase 6). */
export function listCotizaciones(opts: { incluirSoporte?: boolean } = {}) {
  return prisma.cotizacion.findMany({
    where: opts.incluirSoporte ? undefined : { esSoporte: false },
    include: { cliente: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface KanbanFiltros {
  anio: number;
  mes: number; // 1-12
  incluirSoporte: boolean;
}

/** Cotizaciones creadas en un mes calendario dado, para el kanban de
 *  seguimiento (Fase 6). Incluye abonos de la cuenta por cobrar (solo su
 *  id) para que el kanban sepa si el cambio de estado debe bloquearse. */
export function listCotizacionesKanban(filtros: KanbanFiltros) {
  const inicio = new Date(filtros.anio, filtros.mes - 1, 1);
  const finExclusivo = new Date(filtros.anio, filtros.mes, 1);

  return prisma.cotizacion.findMany({
    where: {
      createdAt: { gte: inicio, lt: finExclusivo },
      ...(filtros.incluirSoporte ? {} : { esSoporte: false }),
    },
    include: {
      cliente: true,
      cuentaPorCobrar: { include: { abonos: { select: { id: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getCotizacion(id: string) {
  return prisma.cotizacion.findUniqueOrThrow({
    where: { id },
    include: {
      cliente: true,
      lineas: { include: { servicio: true } },
      cuentaPorCobrar: { include: { abonos: { select: { id: true } } } },
    },
  });
}

export function updateEstadoCotizacion(id: string, estado: string) {
  return prisma.cotizacion.update({ where: { id }, data: { estado } });
}

/**
 * Hueco de seguridad cerrado: si la cotización está ACEPTADA y su cuenta
 * por cobrar ya tiene abonos registrados, no se permite moverla a ningún
 * otro estado — evita duplicar la cuenta por cobrar (o perder la relación
 * con abonos ya cobrados) si se manda a Borrador/Enviada/Rechazada y se
 * vuelve a aceptar.
 */
export async function asegurarCambioEstadoPermitido(cotizacionId: string, nuevoEstado: string) {
  const cotizacion = await prisma.cotizacion.findUniqueOrThrow({
    where: { id: cotizacionId },
    select: {
      estado: true,
      cuentaPorCobrar: { select: { abonos: { select: { id: true }, take: 1 } } },
    },
  });

  const tieneAbonos = (cotizacion.cuentaPorCobrar?.abonos.length ?? 0) > 0;
  if (cotizacion.estado === "ACEPTADA" && nuevoEstado !== "ACEPTADA" && tieneAbonos) {
    throw new Error(
      "No se puede cambiar el estado: esta cotización ya tiene pagos registrados en su cuenta por cobrar."
    );
  }
}
