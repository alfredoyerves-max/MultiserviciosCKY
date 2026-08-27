// Tasas fijas de ley — Ley del Seguro Social + INFONAVIT (LSS Art. 106,
// 107, 147, 168, 211, 212; Ley del INFONAVIT Art. 29). A diferencia de la
// UMA, el salario mínimo y la tabla CEAV — que se indexan cada año y
// viven editables bajo el candado de Configuración — estas 7 cuotas IMSS
// + INFONAVIT están fijas directo en la ley y no cambian año con año, así
// que viven como constantes de código, no como datos editables. Si algún
// día la ley las reforma, se actualizan aquí (requiere un deploy de
// código, a propósito — no es un dato que el dueño deba poder tocar por
// accidente).

/** Enfermedad y maternidad — cuota fija, % de 1 UMA mensual. */
export const IMSS_ENF_MAT_CUOTA_FIJA_PCT = 0.204;
/** Enfermedad y maternidad — cuota adicional, % del excedente sobre 3 UMA. */
export const IMSS_ENF_MAT_CUOTA_ADIC_PCT = 0.011;
/** Prestaciones en dinero, % del SBC. */
export const IMSS_PRESTACIONES_DINERO_PCT = 0.007;
/** Gastos médicos de pensionados, % del SBC. */
export const IMSS_GASTOS_MED_PENS_PCT = 0.0105;
/** Invalidez y vida, % del SBC. */
export const IMSS_INVALIDEZ_VIDA_PCT = 0.0175;
/** Guarderías y prestaciones sociales, % del SBC. */
export const IMSS_GUARDERIAS_PCT = 0.01;
/** Retiro (parte de RCV), % del SBC. */
export const IMSS_RETIRO_PCT = 0.02;
/** INFONAVIT, % del SBC. */
export const INFONAVIT_PCT = 0.05;
