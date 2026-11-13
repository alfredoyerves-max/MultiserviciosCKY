import type { TipoCliente } from "./enums";

/**
 * Retención ISR 1.25 % (Art. 113-J) por cotización.
 * `Cotizacion.aplicaRetencion`: null = las cotizaciones anteriores a la casilla (se deriva del tipo del
 * cliente); true/false = lo que se decidió en el formulario. Valor efectivo = aplicaRetencion ?? (el cliente es Persona Moral).
 */
export function retencionEfectiva(aplicaRetencion: boolean | null | undefined, tipoCliente: string): boolean {
  return aplicaRetencion ?? tipoCliente === "PERSONA_MORAL";
}

/** Valor inicial de la casilla según el cliente: Persona Moral marcada; Persona Física, Gobierno o sin cliente, desmarcada. */
export function retencionInicial(tipoCliente: TipoCliente | null): boolean {
  return tipoCliente === "PERSONA_MORAL";
}

/**
 * `calcularTotalesFiscales` (que no se modifica) decide la retención solo por el tipo del cliente: aplica
 * únicamente con "PERSONA_MORAL". Para respetar la casilla se le pasa el tipo equivalente a lo decidido.
 */
export function tipoParaCalculoFiscal(aplicaRetencion: boolean): TipoCliente {
  return aplicaRetencion ? "PERSONA_MORAL" : "PERSONA_FISICA";
}
