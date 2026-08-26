/**
 * ¿Se puede eliminar esta cotización? Solo si no tiene cuenta por cobrar
 * (Borrador/Enviada nunca la tienen; Rechazada ya la limpió automáticamente
 * al confirmarse el rechazo — ver confirmarRechazoAction) y si su estado
 * no es ACEPTADA. Una cotización Aceptada nunca es eliminable directamente
 * — debe pasar primero a Rechazada (lo que, sin abonos, borra su cuenta
 * por cobrar) antes de poder eliminarse. Sin dependencias de servidor
 * (Prisma) a propósito — se usa tanto en la capa de datos como en
 * componentes cliente (kanban, tabla histórica).
 */
export function puedeEliminarseCotizacion(cotizacion: {
  estado: string;
  cuentaPorCobrar: unknown | null;
}): boolean {
  return cotizacion.estado !== "ACEPTADA" && cotizacion.cuentaPorCobrar === null;
}
