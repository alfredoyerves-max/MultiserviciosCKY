import { z } from "zod";

// Los campos "enum" viven como String en SQLite (ver nota en schema.prisma).
// Estas listas son la única fuente de verdad de los valores válidos.

export const SERVICIO_CATEGORIAS = [
  "LIMPIEZA",
  "SEGURIDAD",
  "MANTENIMIENTO",
  "FUMIGACION",
  "JARDINES",
  "AC",
] as const;
export const servicioCategoriaSchema = z.enum(SERVICIO_CATEGORIAS);
export type ServicioCategoria = z.infer<typeof servicioCategoriaSchema>;

export const SERVICIO_CATEGORIA_LABELS: Record<ServicioCategoria, string> = {
  LIMPIEZA: "Limpieza",
  SEGURIDAD: "Seguridad",
  MANTENIMIENTO: "Mantenimiento",
  FUMIGACION: "Fumigación",
  JARDINES: "Jardines",
  AC: "Aire acondicionado",
};

export const MODALIDADES = ["HORA", "DIA", "SEMANA", "MES"] as const;
export const modalidadSchema = z.enum(MODALIDADES);
export type Modalidad = z.infer<typeof modalidadSchema>;

export const MODALIDAD_LABELS: Record<Modalidad, string> = {
  HORA: "Hora",
  DIA: "Día",
  SEMANA: "Semana",
  MES: "Mes",
};

export const TIPOS_CLIENTE = ["PERSONA_MORAL", "PERSONA_FISICA", "GOBIERNO"] as const;
export const tipoClienteSchema = z.enum(TIPOS_CLIENTE);
export type TipoCliente = z.infer<typeof tipoClienteSchema>;

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
export const estadoCotizacionSchema = z.enum(ESTADOS_COTIZACION);
export type EstadoCotizacion = z.infer<typeof estadoCotizacionSchema>;

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
export const unidadMedidaSchema = z.enum(UNIDADES_MEDIDA);
export type UnidadMedida = z.infer<typeof unidadMedidaSchema>;

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

export const MOTIVOS_SALIDA = ["VENTA_CLIENTE", "USO_INTERNO"] as const;
export const motivoSalidaSchema = z.enum(MOTIVOS_SALIDA);
export type MotivoSalida = z.infer<typeof motivoSalidaSchema>;

export const MOTIVO_SALIDA_LABELS: Record<MotivoSalida, string> = {
  VENTA_CLIENTE: "Venta a cliente",
  USO_INTERNO: "Uso interno",
};

export const TIPOS_COTIZACION = ["SERVICIO", "MATERIAL"] as const;
export const tipoCotizacionSchema = z.enum(TIPOS_COTIZACION);
export type TipoCotizacion = z.infer<typeof tipoCotizacionSchema>;

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
export const activoCategoriaSchema = z.enum(ACTIVO_CATEGORIAS);
export type ActivoCategoria = z.infer<typeof activoCategoriaSchema>;

export const ACTIVO_CATEGORIA_LABELS: Record<ActivoCategoria, string> = {
  VEHICULO: "Vehículo",
  EQUIPO_LIMPIEZA: "Equipo de limpieza",
  HERRAMIENTA: "Herramienta",
  MOBILIARIO: "Mobiliario",
  EQUIPO_COMPUTO: "Equipo de cómputo",
  OTRO: "Otro",
};

export const ESTADOS_ACTIVO = ["FUNCIONAL", "EN_REPARACION", "DADO_DE_BAJA"] as const;
export const estadoActivoSchema = z.enum(ESTADOS_ACTIVO);
export type EstadoActivo = z.infer<typeof estadoActivoSchema>;

export const ESTADO_ACTIVO_LABELS: Record<EstadoActivo, string> = {
  FUNCIONAL: "Funcional",
  EN_REPARACION: "En reparación",
  DADO_DE_BAJA: "Dado de baja",
};

export const TIPOS_EVENTO_ACTIVO = ["CAMBIO_ESTADO", "INCIDENTE", "NOTA"] as const;
export const tipoEventoActivoSchema = z.enum(TIPOS_EVENTO_ACTIVO);
export type TipoEventoActivo = z.infer<typeof tipoEventoActivoSchema>;

export const TIPO_EVENTO_ACTIVO_LABELS: Record<TipoEventoActivo, string> = {
  CAMBIO_ESTADO: "Cambio de estado",
  INCIDENTE: "Incidente",
  NOTA: "Nota",
};

/** Subconjunto de tipos que el usuario puede elegir al "Registrar
 *  incidente" — CAMBIO_ESTADO nunca se captura manualmente, siempre lo
 *  genera el sistema (ver registrarEventoManual en lib/data/activos.ts). */
export const TIPOS_EVENTO_ACTIVO_MANUAL = ["INCIDENTE", "NOTA"] as const;
export const tipoEventoActivoManualSchema = z.enum(TIPOS_EVENTO_ACTIVO_MANUAL);
export type TipoEventoActivoManual = z.infer<typeof tipoEventoActivoManualSchema>;
