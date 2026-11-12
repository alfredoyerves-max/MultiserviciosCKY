import { advisoryLock, prisma } from "@/lib/prisma";
import { getSystemConfigConCeav } from "./config";
import { calcularCostoReal, costoRealPorModalidad } from "@/lib/costEngine";
import { calcularTotalesFiscales } from "@/lib/fiscalEngine";
import { sueldoMensualEfectivo } from "@/lib/servicioCosto";
import { puedeEliminarseCotizacion, MENSAJE_COTIZACION_NO_ELIMINABLE } from "@/lib/cotizacionRules";
import { createCliente } from "./clientes";
import type { CotizacionInput, CotizacionMaterialInput } from "@/lib/schemas/cotizacion";
import type { ClienteInput } from "@/lib/schemas/cliente";
import type { TipoCliente, TipoCotizacion } from "@/lib/enums";
import { requireSession } from "@/lib/auth/session";

/**
 * Genera el siguiente folio del año a partir de un contador atómico
 * (FolioSecuencia), NUNCA de `count()` de registros existentes — un
 * folio de una cotización eliminada no debe poder reutilizarse, y contar
 * filas sí bajaría al eliminar una. El UPSERT con RETURNING es una sola
 * sentencia atómica de Postgres: lee y avanza el contador sin condición
 * de carrera, sin necesitar un lock explícito.
 */
async function generarFolio(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await prisma.$queryRaw<{ numero: number }[]>`
    INSERT INTO "FolioSecuencia" ("anio", "siguiente")
    VALUES (${year}, 2)
    ON CONFLICT ("anio")
    DO UPDATE SET "siguiente" = "FolioSecuencia"."siguiente" + 1
    RETURNING "siguiente" - 1 AS "numero"
  `;
  const numero = rows[0].numero;
  return `COT-${year}-${String(numero).padStart(4, "0")}`;
}

/** Cliente de una cotización (compartido por Servicio y Material): existente
 *  (su tipoCliente se toma de BD, nunca del cliente HTTP) o nuevo, creado
 *  con los datos capturados en el wizard. */
async function resolverCliente(input: {
  clienteId?: string;
  clienteNuevo?: ClienteInput;
}): Promise<{ clienteId: string; tipoCliente: TipoCliente }> {
  if (input.clienteId) {
    const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: input.clienteId } });
    return { clienteId: cliente.id, tipoCliente: cliente.tipoCliente as TipoCliente };
  }
  if (input.clienteNuevo) {
    const cliente = await createCliente(input.clienteNuevo);
    return { clienteId: cliente.id, tipoCliente: cliente.tipoCliente as TipoCliente };
  }
  throw new Error("Falta el cliente de la cotización.");
}

function fechaVigenciaEn(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

export async function createCotizacion(input: CotizacionInput) {
  await requireSession();
  const config = await getSystemConfigConCeav();

  const servicioIds = [...new Set(input.lineas.map((l) => l.servicioId))];
  const servicios = await prisma.servicio.findMany({
    where: { id: { in: servicioIds } },
    include: { puesto: true },
  });
  const servicioById = new Map(servicios.map((s) => [s.id, s]));

  // Resolver cliente: existente (tomar su tipoCliente de BD, nunca del
  // cliente HTTP) o crear uno nuevo con los datos capturados en el wizard.
  const { clienteId, tipoCliente } = await resolverCliente(input);

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

  const fechaVigencia = fechaVigenciaEn(input.diasVigencia);

  return prisma.cotizacion.create({
    data: {
      folio,
      tipo: "SERVICIO",
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

/**
 * Cotización de venta de materiales (Fase 9) — mismo pipeline de estados
 * que las de servicio, pero sin motor de costo real: el precio de venta se
 * captura directo por línea (precargado desde Producto.precioVentaSugerido,
 * editable). Nunca lleva `lineas` (LineaCotizacion) — solo
 * `lineasMaterial`.
 */
export async function createCotizacionMaterial(input: CotizacionMaterialInput) {
  await requireSession();
  const config = await getSystemConfigConCeav();

  // El producto es un atajo opcional: solo se conserva el vínculo si el id
  // aún existe; nunca se valida stock ni se exige que haya productos.
  const productoIds = [...new Set(input.lineasMaterial.flatMap((l) => (l.productoId ? [l.productoId] : [])))];
  const productosExistentes = productoIds.length
    ? await prisma.producto.findMany({ where: { id: { in: productoIds } }, select: { id: true } })
    : [];
  const productoIdsValidos = new Set(productosExistentes.map((p) => p.id));

  const { clienteId, tipoCliente } = await resolverCliente(input);

  const lineasCalculadas = input.lineasMaterial.map((linea) => {
    return {
      productoId: linea.productoId && productoIdsValidos.has(linea.productoId) ? linea.productoId : null,
      claveSat: linea.claveSat,
      descripcion: linea.descripcion,
      unidadMedida: linea.unidadMedida,
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitario,
      importe: linea.cantidad * linea.precioUnitario,
    };
  });

  const subtotal = lineasCalculadas.reduce((sum, l) => sum + l.importe, 0);
  const fiscal = calcularTotalesFiscales(subtotal, tipoCliente, config.ivaPct, config.retencionIsrPct);

  const folio = await generarFolio();

  const fechaVigencia = fechaVigenciaEn(input.diasVigencia);

  return prisma.cotizacion.create({
    data: {
      folio,
      tipo: "MATERIAL",
      clienteId,
      proyecto: input.proyecto || null,
      margenUtilidadPct: null,
      subtotal: fiscal.subtotal,
      iva: fiscal.iva,
      retencionIsr: fiscal.retencionIsr,
      totalAPagar: fiscal.totalAPagar,
      netoARecibir: fiscal.netoARecibir,
      fechaVigencia,
      esSoporte: input.esSoporte ?? false,
      lineasMaterial: { create: lineasCalculadas },
    },
    include: { cliente: true, lineasMaterial: true },
  });
}

/** Usado por el Dashboard — excluye cotizaciones de soporte por defecto,
 *  igual que el kanban de seguimiento (Fase 6). */
export async function listCotizaciones(opts: { incluirSoporte?: boolean } = {}) {
  await requireSession();
  return prisma.cotizacion.findMany({
    where: opts.incluirSoporte ? undefined : { esSoporte: false },
    include: { cliente: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface KanbanFiltros {
  anio: number;
  mes: number; // 1-12
  /** true = histórico completo, sin recortar por mes (anio/mes se ignoran). */
  todo?: boolean;
  incluirSoporte: boolean;
  /** Sin filtrar (todos) si se omite. */
  tipo?: TipoCotizacion;
}

/** Tablero de seguimiento: Borrador y Enviada (lo abierto) se devuelven SIEMPRE,
 *  sin importar el mes; el mes calendario solo filtra el histórico (Aceptada y
 *  Rechazada, por fecha de creación). Incluye abonos de la cuenta por cobrar
 *  (solo su id) para que el tablero sepa si el cambio de estado debe bloquearse. */
export async function listCotizacionesKanban(filtros: KanbanFiltros) {
  await requireSession();
  const inicio = new Date(filtros.anio, filtros.mes - 1, 1);
  const finExclusivo = new Date(filtros.anio, filtros.mes, 1);

  return prisma.cotizacion.findMany({
    where: {
      OR: [
        { estado: { in: ["BORRADOR", "ENVIADA"] } },
        {
          estado: { in: ["ACEPTADA", "RECHAZADA"] },
          ...(filtros.todo ? {} : { createdAt: { gte: inicio, lt: finExclusivo } }),
        },
      ],
      ...(filtros.incluirSoporte ? {} : { esSoporte: false }),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    },
    include: {
      cliente: true,
      cuentaPorCobrar: { include: { abonos: { select: { id: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Resumen del histórico (Aceptadas y Rechazadas) con los mismos filtros del
 *  tablero: cuántas hay en total y de qué mes es la más reciente — para abrir
 *  el histórico en un mes que tenga datos en vez de en un mes vacío. */
export async function resumenHistorico(filtros: { incluirSoporte: boolean; tipo?: TipoCotizacion }) {
  await requireSession();
  const where = {
    estado: { in: ["ACEPTADA", "RECHAZADA"] },
    ...(filtros.incluirSoporte ? {} : { esSoporte: false }),
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
  };
  const [total, ultima] = await Promise.all([
    prisma.cotizacion.count({ where }),
    prisma.cotizacion.findFirst({ where, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  return {
    total,
    ultimoMes: ultima ? { anio: ultima.createdAt.getFullYear(), mes: ultima.createdAt.getMonth() + 1 } : null,
  };
}

export async function getCotizacion(id: string) {
  await requireSession();
  return prisma.cotizacion.findUniqueOrThrow({
    where: { id },
    include: {
      cliente: true,
      lineas: { include: { servicio: true } },
      lineasMaterial: true,
      cuentaPorCobrar: { include: { abonos: { select: { id: true } } } },
    },
  });
}

export { puedeEliminarseCotizacion };

export async function deleteCotizacion(id: string) {
  await requireSession();
  // UNA sola sentencia (antes: 2 lecturas + el borrado). El filtro aplica la
  // misma regla que puedeEliminarseCotizacion (lib/cotizacionRules.ts) —
  // estado distinto de ACEPTADA y sin cuenta por cobrar— directamente en la
  // BD, así que además no hay ventana entre revisar y borrar. Las líneas se
  // eliminan en cascada (onDelete: Cascade).
  const { count } = await prisma.cotizacion.deleteMany({
    where: { id, estado: { not: "ACEPTADA" }, cuentaPorCobrar: { is: null } },
  });
  if (count > 0) return;

  // Nada se borró: solo ahora (camino de falla) se consulta por qué.
  const existe = await prisma.cotizacion.findUnique({ where: { id }, select: { id: true } });
  throw new Error(
    existe
      ? MENSAJE_COTIZACION_NO_ELIMINABLE
      : "Esta cotización ya no existe."
  );
}

/**
 * Invariante del sistema: una CuentaPorCobrar solo existe mientras su
 * cotización está ACEPTADA (también impuesto en la BD por los triggers de
 * la migración 20261110120000). Por eso cualquier salida de ACEPTADA —a
 * Borrador, Enviada o Rechazada— elimina la cuenta en la MISMA transacción
 * que cambia el estado; y si la cuenta ya tiene abonos, el cambio se
 * bloquea por completo (nunca se pierde historial de cobros).
 */
export async function cambiarEstadoCotizacion(
  cotizacionId: string,
  nuevoEstado: "BORRADOR" | "ENVIADA" | "RECHAZADA"
) {
  await requireSession();
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, "cotizacion", cotizacionId);

    const cotizacion = await tx.cotizacion.findUniqueOrThrow({
      where: { id: cotizacionId },
      select: { cuentaPorCobrar: { select: { id: true, abonos: { select: { id: true }, take: 1 } } } },
    });

    const cuenta = cotizacion.cuentaPorCobrar;
    if (cuenta && cuenta.abonos.length > 0) {
      throw new Error(
        "No se puede cambiar el estado: esta cotización ya tiene pagos registrados en su cuenta por cobrar."
      );
    }
    if (cuenta) await tx.cuentaPorCobrar.delete({ where: { id: cuenta.id } });

    await tx.cotizacion.update({ where: { id: cotizacionId }, data: { estado: nuevoEstado } });
  });
}

/**
 * Acepta una cotización (SERVICIO o MATERIAL): estado ACEPTADA + cuenta por
 * cobrar (netoARecibir, con la fecha de vencimiento capturada en el modal) en
 * una sola transacción — si algo falla no queda "Aceptada" sin cuenta. NO
 * toca Inventario: una cotización es un documento comercial; el surtido se
 * registra a mano en el módulo de Inventario. Si la cuenta ya existe (dato
 * histórico), se reutiliza sin duplicar.
 */
export async function aceptarCotizacion(cotizacionId: string, fechaVencimiento?: Date) {
  await requireSession();
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, "cotizacion", cotizacionId);

    const cotizacion = await tx.cotizacion.findUniqueOrThrow({
      where: { id: cotizacionId },
      select: { netoARecibir: true, cuentaPorCobrar: { select: { id: true } } },
    });

    await tx.cotizacion.update({ where: { id: cotizacionId }, data: { estado: "ACEPTADA" } });

    if (!cotizacion.cuentaPorCobrar) {
      if (!fechaVencimiento) throw new Error("Falta la fecha de vencimiento.");
      await tx.cuentaPorCobrar.create({
        data: { cotizacionId, montoTotal: cotizacion.netoARecibir, fechaVencimiento },
      });
    }
  });
}
