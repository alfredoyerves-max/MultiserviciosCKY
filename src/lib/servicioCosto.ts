// Helpers puros (sin Prisma) para resolver el sueldo/nombre de mano de
// obra de un Servicio, sin importar si viene de un Puesto guardado o de un
// sueldo capturado directo en el formulario (Addendum v4 punto 4).

export interface ServicioMoDeObra {
  puesto: { nombre: string; sueldoMensual: number } | null;
  sueldoMensualInline: number | null;
  nombrePuestoInline: string | null;
}

export function sueldoMensualEfectivo(servicio: ServicioMoDeObra): number {
  return servicio.puesto?.sueldoMensual ?? servicio.sueldoMensualInline ?? 0;
}

export function nombrePuestoEfectivo(servicio: ServicioMoDeObra): string {
  return servicio.puesto?.nombre ?? servicio.nombrePuestoInline ?? "(sin puesto)";
}

export function esSueldoBajoMinimo(sueldoMensual: number, salarioMinimoMensual: number): boolean {
  return sueldoMensual < salarioMinimoMensual;
}
