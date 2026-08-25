// Tratamiento fiscal de la cotización (Fase 5 del spec).

import type { TipoCliente } from "./enums";

export interface FiscalTotals {
  subtotal: number;
  iva: number;
  retencionIsr: number;
  totalAPagar: number;
  netoARecibir: number;
}

export function calcularTotalesFiscales(
  subtotal: number,
  tipoCliente: TipoCliente,
  ivaPct: number,
  retencionIsrPct: number
): FiscalTotals {
  const iva = subtotal * ivaPct;
  const totalAPagar = subtotal + iva;

  // La retención ISR (Art. 113-J RESICO) solo aplica a Persona Moral y
  // nunca se calcula sobre el IVA.
  const retencionIsr = tipoCliente === "PERSONA_MORAL" ? subtotal * retencionIsrPct : 0;
  const netoARecibir = totalAPagar - retencionIsr;

  return { subtotal, iva, retencionIsr, totalAPagar, netoARecibir };
}
