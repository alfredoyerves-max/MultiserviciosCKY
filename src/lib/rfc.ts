// RFC de un cliente nuevo: formato, fecha y tipo de persona deducido.
// Valida el FORMATO (3 o 4 letras, fecha AAMMDD con mes 01-12 y día 01-31, 3 de homoclave);
// no verifica que el RFC exista ni la homoclave ante el SAT.
import { TIPO_CLIENTE_LABELS, type TipoCliente } from "@/lib/enums";

export const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export const MENSAJE_RFC_FORMATO =
  "RFC inválido: 3 letras (Persona Moral) o 4 (Persona Física), 6 dígitos de fecha (AAMMDD) y 3 de homoclave.";
export const MENSAJE_RFC_FECHA = "RFC inválido: la fecha debe tener mes 01-12 y día 01-31.";
export const MENSAJE_TIPO_CLIENTE = "Selecciona el tipo de cliente.";

/** Mayúsculas y sin espacios en los extremos. */
export function normalizarRfc(rfc: string): string {
  return rfc.trim().toUpperCase();
}

export type AnalisisRfc =
  | { estado: "vacio" }
  | { estado: "invalido"; error: string }
  | { estado: "valido"; tipo: "PERSONA_MORAL" | "PERSONA_FISICA" };

/** 12 caracteres = Persona Moral; 13 = Persona Física. */
export function analizarRfc(rfc: string): AnalisisRfc {
  const valor = normalizarRfc(rfc);
  if (valor === "") return { estado: "vacio" };
  if (!RFC_REGEX.test(valor)) return { estado: "invalido", error: MENSAJE_RFC_FORMATO };
  const inicioFecha = valor.length === 13 ? 4 : 3;
  const mes = Number(valor.slice(inicioFecha + 2, inicioFecha + 4));
  const dia = Number(valor.slice(inicioFecha + 4, inicioFecha + 6));
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return { estado: "invalido", error: MENSAJE_RFC_FECHA };
  return { estado: "valido", tipo: valor.length === 12 ? "PERSONA_MORAL" : "PERSONA_FISICA" };
}

/** Tipo de cliente efectivo: el deducido del RFC si es válido; si no, el elegido a mano ("" = sin elegir). */
export function tipoClienteEfectivo(rfc: string, tipoManual: TipoCliente | ""): TipoCliente | "" {
  const a = analizarRfc(rfc);
  return a.estado === "valido" ? a.tipo : tipoManual;
}

/** Texto del tipo fijado por el RFC, p. ej. "Persona Moral (deducido del RFC)". */
export function textoTipoDeducido(tipo: TipoCliente): string {
  return `${TIPO_CLIENTE_LABELS[tipo]} (deducido del RFC)`;
}
