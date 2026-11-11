import { z } from "zod";
import {
  ACTIVO_CATEGORIAS,
  ESTADOS_ACTIVO,
  ESTADOS_COTIZACION,
  MODALIDADES,
  MOTIVOS_SALIDA,
  SERVICIO_CATEGORIAS,
  TIPOS_CLIENTE,
  TIPOS_COTIZACION,
  TIPOS_EVENTO_ACTIVO,
  TIPOS_EVENTO_ACTIVO_MANUAL,
  UNIDADES_MEDIDA,
} from "@/lib/enums";

// Esquemas zod de las listas de lib/enums.ts. Solo para validación en servidor
// (acciones y esquemas de formularios) — nunca importar desde componentes de cliente.

export const servicioCategoriaSchema = z.enum(SERVICIO_CATEGORIAS);
export const modalidadSchema = z.enum(MODALIDADES);
export const tipoClienteSchema = z.enum(TIPOS_CLIENTE);
export const estadoCotizacionSchema = z.enum(ESTADOS_COTIZACION);
export const unidadMedidaSchema = z.enum(UNIDADES_MEDIDA);
export const motivoSalidaSchema = z.enum(MOTIVOS_SALIDA);
export const tipoCotizacionSchema = z.enum(TIPOS_COTIZACION);
export const activoCategoriaSchema = z.enum(ACTIVO_CATEGORIAS);
export const estadoActivoSchema = z.enum(ESTADOS_ACTIVO);
export const tipoEventoActivoSchema = z.enum(TIPOS_EVENTO_ACTIVO);
export const tipoEventoActivoManualSchema = z.enum(TIPOS_EVENTO_ACTIVO_MANUAL);
