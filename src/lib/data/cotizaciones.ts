import { prisma } from "@/lib/prisma";
import { getSystemConfigConCeav } from "./config";
import { calcularCostoReal, costoRealPorModalidad } from "@/lib/costEngine";
import { calcularTotalesFiscales } from "@/lib/fiscalEngine";
import { sueldoMensualEfectivo } from "@/lib/servicioCosto";
import { calcularStock } from "@/lib/inventario";
import { lockProducto } from "@/lib/data/locks";
import { puedeEliminarseCotizacion } from "@/lib/cotizacionRules";
import { createCliente } from "./clientes";
import type { CotizacionInput, CotizacionMaterialInput } from "@/lib/schemas/cotizacion";
import type { TipoCliente, TipoCotizacion } from "@/lib/enums";

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
    const cliente = await createCliente(input.clienteNuevo);
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
  const config = await getSystemConfigConCeav();

  const productoIds = [...new Set(input.lineasMaterial.map((l) => l.productoId))];
  const productos = await prisma.producto.findMany({ where: { id: { in: productoIds } } });
  const productoById = new Map(productos.map((p) => [p.id, p]));

  let clienteId = input.clienteId;
  let tipoCliente: TipoCliente;

  if (clienteId) {
    const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } });
    tipoCliente = cliente.tipoCliente as TipoCliente;
  } else if (input.clienteNuevo) {
    const cliente = await createCliente(input.clienteNuevo);
    clienteId = cliente.id;
    tipoCliente = cliente.tipoCliente as TipoCliente;
  } else {
    throw new Error("Falta el cliente de la cotización.");
  }

  const lineasCalculadas = input.lineasMaterial.map((linea) => {
    const producto = productoById.get(linea.productoId);
    if (!producto) throw new Error(`Producto ${linea.productoId} no encontrado.`);
    return {
      productoId: linea.productoId,
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitario,
      importe: linea.cantidad * linea.precioUnitario,
    };
  });

  const subtotal = lineasCalculadas.reduce((sum, l) => sum + l.importe, 0);
  const fiscal = calcularTotalesFiscales(subtotal, tipoCliente, config.ivaPct, config.retencionIsrPct);

  const folio = await generarFolio();

  const fechaVigencia = new Date();
  fechaVigencia.setDate(fechaVigencia.getDate() + input.diasVigencia);

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
    include: { cliente: true, lineasMaterial: { include: { producto: true } } },
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
  /** Sin filtrar (todos) si se omite. */
  tipo?: TipoCotizacion;
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
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
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
      lineasMaterial: { include: { producto: true } },
      cuentaPorCobrar: { include: { abonos: { select: { id: true } } } },
    },
  });
}

export function getCotizacionTipo(id: string) {
  return prisma.cotizacion.findUniqueOrThrow({ where: { id }, select: { tipo: true, folio: true } });
}

export { puedeEliminarseCotizacion };

export async function deleteCotizacion(id: string) {
  const cotizacion = await prisma.cotizacion.findUniqueOrThrow({
    where: { id },
    select: { estado: true, cuentaPorCobrar: { select: { id: true } } },
  });
  if (!puedeEliminarseCotizacion(cotizacion)) {
    throw new Error(
      "No se puede eliminar: esta cotización está Aceptada o tiene una cuenta por cobrar asociada."
    );
  }
  // lineas/lineasMaterial se eliminan en cascada (onDelete: Cascade).
  await prisma.cotizacion.delete({ where: { id } });
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

/**
 * Confirma la aceptación de una cotización de MATERIAL (Fase 9): en una
 * sola transacción, valida que el stock real alcance para cada producto
 * (agregando la cantidad si el mismo producto aparece en más de una
 * línea — el stock es del producto, no de la línea), registra una salida
 * de inventario por "Venta a cliente" por cada línea (referencia = folio),
 * cambia el estado a ACEPTADA y genera la cuenta por cobrar si todavía no
 * existe. Si el stock ya no alcanza, la transacción se revierte por
 * completo y no queda ningún cambio a medias — el mensaje identifica el
 * producto exacto que falló.
 */
export async function confirmarAceptacionMaterial(cotizacionId: string, fechaVencimiento?: Date) {
  return prisma.$transaction(async (tx) => {
    const cotizacionPrevia = await tx.cotizacion.findUniqueOrThrow({
      where: { id: cotizacionId },
      include: { lineasMaterial: { select: { productoId: true } }, cuentaPorCobrar: true },
    });

    // Bloquea TODOS los productos involucrados, en orden determinístico
    // (evita deadlocks contra otra transacción que bloquee los mismos
    // productos en orden distinto), ANTES de leer su stock — así ninguna
    // otra salida/aceptación concurrente del mismo producto puede leerlo
    // "antes" de que esta transacción escriba (ver lib/inventario.ts).
    const productoIdsOrdenados = [...new Set(cotizacionPrevia.lineasMaterial.map((l) => l.productoId))].sort();
    for (const productoId of productoIdsOrdenados) {
      await lockProducto(tx, productoId);
    }

    // Con los locks ya tomados, se vuelve a leer la cotización completa —
    // el stock de la primera lectura (antes del lock) no es confiable.
    const cotizacion = await tx.cotizacion.findUniqueOrThrow({
      where: { id: cotizacionId },
      include: {
        lineasMaterial: {
          include: { producto: { include: { movimientos: { select: { tipo: true, cantidad: true } } } } },
        },
        cuentaPorCobrar: true,
      },
    });

    // Las salidas de inventario y la cuenta por cobrar SOLO se generan la
    // primera vez que esta cotización se acepta de verdad. Si ya existe
    // una cuenta (re-aceptar idempotente tras pasar por Borrador sin
    // abonos, o una segunda petición concurrente que quedó detrás del
    // lock y llegó después de que la primera ya terminó), esta corrida es
    // un no-op — nunca se vuelve a descontar stock ni a duplicar nada.
    const esPrimeraAceptacion = !cotizacion.cuentaPorCobrar;

    if (esPrimeraAceptacion) {
      const cantidadPorProducto = new Map<string, number>();
      const productoPorId = new Map(cotizacion.lineasMaterial.map((l) => [l.productoId, l.producto]));
      for (const linea of cotizacion.lineasMaterial) {
        cantidadPorProducto.set(linea.productoId, (cantidadPorProducto.get(linea.productoId) ?? 0) + linea.cantidad);
      }

      for (const [productoId, cantidadTotal] of cantidadPorProducto) {
        const producto = productoPorId.get(productoId)!;
        const stock = calcularStock(producto.movimientos);
        if (cantidadTotal > stock) {
          throw new Error(
            `Stock insuficiente de "${producto.nombre}": disponible ${stock}, se requieren ${cantidadTotal}.`
          );
        }
      }
    }

    await tx.cotizacion.update({ where: { id: cotizacionId }, data: { estado: "ACEPTADA" } });

    if (esPrimeraAceptacion) {
      for (const linea of cotizacion.lineasMaterial) {
        await tx.movimientoInventario.create({
          data: {
            productoId: linea.productoId,
            tipo: "SALIDA",
            fecha: new Date(),
            cantidad: linea.cantidad,
            motivoSalida: "VENTA_CLIENTE",
            referencia: cotizacion.folio,
          },
        });
      }

      if (!fechaVencimiento) throw new Error("Falta la fecha de vencimiento.");
      await tx.cuentaPorCobrar.create({
        data: { cotizacionId, montoTotal: cotizacion.netoARecibir, fechaVencimiento },
      });
    }
  });
}
