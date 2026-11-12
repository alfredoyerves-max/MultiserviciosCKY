// Tratamiento fiscal de la cotización (Fase 5 del spec).

import type { TipoCliente } from "./enums";

export interface FiscalTotals {
  subtotal: number;
  iva: number;
  retencionIsr: number;
  totalAPagar: number;
  netoARecibir: number;
}

/**
 * Redondea a centavos (2 decimales), mitad hacia arriba. `toPrecision(15)`
 * limpia el ruido de la coma flotante antes de redondear (ej. 100.49999999999999
 * es en realidad 100.5), así que 8.125 → 8.13 y 1.005 → 1.01.
 */
export function redondearCentavos(importe: number): number {
  return Math.round(Number((importe * 100).toPrecision(15))) / 100;
}

/**
 * Subtotal, IVA y retención se expresan cada uno a 2 decimales (centavos
 * enteros) y el total sale de esos importes ya redondeados:
 * total = subtotal + IVA − retención. Así lo que se ve en pantalla y en el
 * documento siempre suma exactamente el total. IVA y retención se calculan
 * sobre el subtotal ya redondeado.
 */
export function calcularTotalesFiscales(
  subtotal: number,
  tipoCliente: TipoCliente,
  ivaPct: number,
  retencionIsrPct: number
): FiscalTotals {
  const subtotalRedondeado = redondearCentavos(subtotal);
  const iva = redondearCentavos(subtotalRedondeado * ivaPct);
  const totalAPagar = redondearCentavos(subtotalRedondeado + iva);

  // La retención ISR (Art. 113-J RESICO) solo aplica a Persona Moral y
  // nunca se calcula sobre el IVA.
  const retencionIsr =
    tipoCliente === "PERSONA_MORAL" ? redondearCentavos(subtotalRedondeado * retencionIsrPct) : 0;
  const netoARecibir = redondearCentavos(subtotalRedondeado + iva - retencionIsr);

  return { subtotal: subtotalRedondeado, iva, retencionIsr, totalAPagar, netoARecibir };
}
