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
