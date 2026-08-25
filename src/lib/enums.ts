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
