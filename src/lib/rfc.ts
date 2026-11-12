// Validación SUAVE del RFC (solo un aviso al capturar; nunca bloquea el guardado
// y el campo sigue siendo opcional). Revisa únicamente la longitud según el tipo
// de contribuyente y los caracteres permitidos; no verifica que el RFC exista ni
// que la fecha o la homoclave sean válidas ante el SAT.
import type { TipoCliente } from "@/lib/enums";

const LONGITUD_ESPERADA: Record<TipoCliente, number> = {
  PERSONA_MORAL: 12,
  GOBIERNO: 12, // las entidades de gobierno se identifican con RFC de 12 caracteres
  PERSONA_FISICA: 13,
};

const TIPO_TEXTO: Record<TipoCliente, string> = {
  PERSONA_MORAL: "Persona Moral",
  GOBIERNO: "Gobierno",
  PERSONA_FISICA: "Persona Física",
};

/** Texto del aviso, o null si no hay nada que avisar (incluido RFC vacío). */
export function avisoRfc(rfc: string, tipo: TipoCliente): string | null {
  const valor = rfc.trim().toUpperCase();
  if (valor === "") return null;
  if (!/^[A-ZÑ&0-9]+$/.test(valor)) {
    return "El RFC solo debe tener letras y números (puede incluir Ñ y &).";
  }
  const esperada = LONGITUD_ESPERADA[tipo];
  if (valor.length !== esperada) {
    return `El RFC de ${TIPO_TEXTO[tipo]} tiene ${esperada} caracteres y este tiene ${valor.length}. Puedes guardarlo así, pero revísalo.`;
  }
  return null;
}
