// Los campos "enum" viven como String en la BD (ver nota en schema.prisma).
// Estas listas son la única fuente de verdad de los valores válidos.
//
// Este archivo NO importa zod a propósito: lo importan componentes de cliente
// (etiquetas y tipos) y zod pesaba ~285 KB en su bundle. Los esquemas zod de
// estas listas viven en lib/schemas/enums.ts (solo servidor).

export const SERVICIO_CATEGORIAS = [
  "LIMPIEZA",
  "SEGURIDAD",
  "MANTENIMIENTO",
  "FUMIGACION",
  "JARDINES",
  "AC",
] as const;
export type ServicioCategoria = (typeof SERVICIO_CATEGORIAS)[number];

export const SERVICIO_CATEGORIA_LABELS: Record<ServicioCategoria, string> = {
  LIMPIEZA: "Limpieza",
  SEGURIDAD: "Seguridad",
  MANTENIMIENTO: "Mantenimiento",
  FUMIGACION: "Fumigación",
  JARDINES: "Jardines",
  AC: "Aire acondicionado",
};

export const MODALIDADES = ["HORA", "DIA", "SEMANA", "MES"] as const;
export type Modalidad = (typeof MODALIDADES)[number];

export const MODALIDAD_LABELS: Record<Modalidad, string> = {
  HORA: "Hora",
  DIA: "Día",
  SEMANA: "Semana",
  MES: "Mes",
};

export const TIPOS_CLIENTE = ["PERSONA_MORAL", "PERSONA_FISICA", "GOBIERNO"] as const;
export type TipoCliente = (typeof TIPOS_CLIENTE)[number];

export const TIPO_CLIENTE_LABELS: Record<TipoCliente, string> = {
  PERSONA_MORAL: "Persona Moral",
  PERSONA_FISICA: "Persona Física",
  GOBIERNO: "Gobierno",
};

export const ESTADOS_COTIZACION = [
  "BORRADOR",
  "ENVIADA",
  "ACEPTADA",
  "RECHAZADA",
] as const;
export type EstadoCotizacion = (typeof ESTADOS_COTIZACION)[number];

export const ESTADO_COTIZACION_LABELS: Record<EstadoCotizacion, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
};

export const UNIDADES_MEDIDA = [
  "PIEZA",
  "LITRO",
  "KILOGRAMO",
  "GRAMO",
  "CAJA",
  "PAQUETE",
  "ROLLO",
  "BOTE",
  "GALON",
  "METRO",
  "BOLSA",
  "PAR",
  "KIT",
] as const;
export type UnidadMedida = (typeof UNIDADES_MEDIDA)[number];

export const UNIDAD_MEDIDA_LABELS: Record<UnidadMedida, string> = {
  PIEZA: "Pieza",
  LITRO: "Litro",
  KILOGRAMO: "Kilogramo",
  GRAMO: "Gramo",
  CAJA: "Caja",
  PAQUETE: "Paquete",
  ROLLO: "Rollo",
  BOTE: "Bote",
  GALON: "Galón",
  METRO: "Metro",
  BOLSA: "Bolsa",
  PAR: "Par",
  KIT: "Kit",
};

/** Etiqueta de una unidad guardada: la del catálogo o, si es texto capturado ("Otra…"), el texto tal cual. */
export function etiquetaUnidad(unidad: string): string {
  return (UNIDAD_MEDIDA_LABELS as Record<string, string>)[unidad] ?? unidad;
}

export const MOTIVOS_SALIDA = ["VENTA_CLIENTE", "USO_INTERNO"] as const;
export type MotivoSalida = (typeof MOTIVOS_SALIDA)[number];

export const MOTIVO_SALIDA_LABELS: Record<MotivoSalida, string> = {
  VENTA_CLIENTE: "Venta a cliente",
  USO_INTERNO: "Uso interno",
};

export const TIPOS_COTIZACION = ["SERVICIO", "MATERIAL"] as const;
export type TipoCotizacion = (typeof TIPOS_COTIZACION)[number];

export const TIPO_COTIZACION_LABELS: Record<TipoCotizacion, string> = {
  SERVICIO: "Servicio",
  MATERIAL: "Material",
};

export const ACTIVO_CATEGORIAS = [
  "VEHICULO",
  "EQUIPO_LIMPIEZA",
  "HERRAMIENTA",
  "MOBILIARIO",
  "EQUIPO_COMPUTO",
  "OTRO",
] as const;
export type ActivoCategoria = (typeof ACTIVO_CATEGORIAS)[number];

export const ACTIVO_CATEGORIA_LABELS: Record<ActivoCategoria, string> = {
  VEHICULO: "Vehículo",
  EQUIPO_LIMPIEZA: "Equipo de limpieza",
  HERRAMIENTA: "Herramienta",
  MOBILIARIO: "Mobiliario",
  EQUIPO_COMPUTO: "Equipo de cómputo",
  OTRO: "Otro",
};

export const ESTADOS_ACTIVO = ["FUNCIONAL", "EN_REPARACION", "DADO_DE_BAJA"] as const;
export type EstadoActivo = (typeof ESTADOS_ACTIVO)[number];

export const ESTADO_ACTIVO_LABELS: Record<EstadoActivo, string> = {
  FUNCIONAL: "Funcional",
  EN_REPARACION: "En reparación",
  DADO_DE_BAJA: "Dado de baja",
};

export const TIPOS_EVENTO_ACTIVO = ["CAMBIO_ESTADO", "INCIDENTE", "NOTA"] as const;
export type TipoEventoActivo = (typeof TIPOS_EVENTO_ACTIVO)[number];

export const TIPO_EVENTO_ACTIVO_LABELS: Record<TipoEventoActivo, string> = {
  CAMBIO_ESTADO: "Cambio de estado",
  INCIDENTE: "Incidente",
  NOTA: "Nota",
};

/** Subconjunto de tipos que el usuario puede elegir al "Registrar
 *  incidente" — CAMBIO_ESTADO nunca se captura manualmente, siempre lo
 *  genera el sistema (ver registrarEventoManual en lib/data/activos.ts). */
export const TIPOS_EVENTO_ACTIVO_MANUAL = ["INCIDENTE", "NOTA"] as const;
export type TipoEventoActivoManual = (typeof TIPOS_EVENTO_ACTIVO_MANUAL)[number];
