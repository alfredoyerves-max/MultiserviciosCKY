import { MODALIDAD_LABELS, TIPO_CLIENTE_LABELS, UNIDAD_MEDIDA_LABELS, type Modalidad, type TipoCliente, type UnidadMedida } from "@/lib/enums";
import type { getCotizacion } from "@/lib/data/cotizaciones";
import type { CuentaBancaria, SystemConfig } from "@/generated/prisma/client";

type CotizacionConLineas = Awaited<ReturnType<typeof getCotizacion>>;

export interface CotizacionExportData {
  folio: string;
  tipo: "SERVICIO" | "MATERIAL";
  fechaEmision: Date;
  fechaVigencia: Date;
  proyecto: string | null;

  prestador: {
    nombre: string;
    rfc: string | null;
    regimenFiscal: string | null;
    direccion: string | null;
    telefono: string | null;
    email: string | null;
  };

  cliente: {
    nombre: string;
    rfc: string | null;
    contacto: string | null;
    tipoCliente: TipoCliente;
    tipoLabel: string;
  };

  lineasServicio: {
    servicioNombre: string;
    modalidadLabel: string;
    personas: number;
    duracion: number;
    precioVenta: number;
  }[];

  lineasMaterial: {
    productoNombre: string;
    cantidad: number;
    unidadLabel: string;
    precioUnitario: number;
    importe: number;
  }[];

  subtotal: number;
  iva: number;
  retencionIsr: number;
  /** NUNCA se muestra — se conserva solo como referencia interna (el
   *  monto bruto antes de descontar la retención). El documento y toda
   *  la UI de la app muestran un solo "Total": `netoARecibir`, igual que
   *  el campo "Total" de un CFDI real con retención ya viene neto. */
  totalAPagar: number;
  /** El único total que se muestra al usuario: subtotal + iva −
   *  retención. Etiquétalo siempre "Total", nunca "Neto a recibir". */
  netoARecibir: number;

  /** Condición de pago / condiciones comerciales / garantía — ya
   *  seleccionadas según el tipo de cotización (Servicio o Material) al
   *  construir estos datos, para que el exportador no tenga que decidir. */
  condicionPago: string;
  condicionesComerciales: string;
  garantia: string;

  cuentasBancarias: {
    banco: string;
    clabe: string;
    numeroCuenta: string | null;
    titular: string;
  }[];
  metodosPago: {
    efectivo: boolean;
    transferencia: boolean;
    cheque: boolean;
  };
}

/**
 * Da forma a los datos de una cotización (ya con su snapshot fiscal
 * guardado en BD) para los exportadores de Word/PDF. Nunca recalcula
 * subtotal/iva/retención/totales con la configuración fiscal actual —
 * los toma tal cual quedaron guardados al crear/aceptar la cotización,
 * para que una cotización vieja no cambie si las tasas se actualizan
 * después. `prestador` sí viene de SystemConfig porque es identidad de la
 * empresa (nombre/RFC/contacto), no una tasa que deba quedar congelada.
 */
export function buildCotizacionExportData(
  cotizacion: CotizacionConLineas,
  config: SystemConfig,
  cuentasBancariasActivas: CuentaBancaria[]
): CotizacionExportData {
  const esServicio = cotizacion.tipo === "SERVICIO";

  return {
    folio: cotizacion.folio,
    tipo: cotizacion.tipo as "SERVICIO" | "MATERIAL",
    fechaEmision: cotizacion.createdAt,
    fechaVigencia: cotizacion.fechaVigencia,
    proyecto: cotizacion.proyecto,

    prestador: {
      nombre: config.prestadorNombre,
      rfc: config.prestadorRfc,
      regimenFiscal: config.prestadorRegimenFiscal,
      direccion: config.prestadorDireccion,
      telefono: config.prestadorTelefono,
      email: config.prestadorEmail,
    },

    cliente: {
      nombre: cotizacion.cliente.nombreRazonSocial,
      rfc: cotizacion.cliente.rfc,
      contacto: cotizacion.cliente.contacto,
      tipoCliente: cotizacion.cliente.tipoCliente as TipoCliente,
      tipoLabel: TIPO_CLIENTE_LABELS[cotizacion.cliente.tipoCliente as TipoCliente],
    },

    lineasServicio: cotizacion.lineas.map((l) => ({
      servicioNombre: l.servicio.nombre,
      modalidadLabel: MODALIDAD_LABELS[l.modalidad as Modalidad],
      personas: l.personas,
      duracion: l.duracion,
      precioVenta: l.precioVenta,
    })),

    lineasMaterial: cotizacion.lineasMaterial.map((l) => ({
      productoNombre: l.producto.nombre,
      cantidad: l.cantidad,
      unidadLabel: UNIDAD_MEDIDA_LABELS[l.producto.unidadMedida as UnidadMedida],
      precioUnitario: l.precioUnitario,
      importe: l.importe,
    })),

    subtotal: cotizacion.subtotal,
    iva: cotizacion.iva,
    retencionIsr: cotizacion.retencionIsr,
    totalAPagar: cotizacion.totalAPagar,
    netoARecibir: cotizacion.netoARecibir,

    condicionPago: esServicio ? config.condicionPagoServicio : config.condicionPagoMaterial,
    condicionesComerciales: esServicio
      ? config.condicionesComercialesServicio
      : config.condicionesComercialesMaterial,
    garantia: esServicio ? config.garantiaServicio : config.garantiaMaterial,

    cuentasBancarias: cuentasBancariasActivas.map((c) => ({
      banco: c.banco,
      clabe: c.clabe,
      numeroCuenta: c.numeroCuenta,
      titular: c.titular,
    })),
    metodosPago: {
      efectivo: config.aceptaEfectivo,
      transferencia: config.aceptaTransferencia,
      cheque: config.aceptaCheque,
    },
  };
}
