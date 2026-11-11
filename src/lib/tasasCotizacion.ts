/**
 * Tasas que se MUESTRAN en una cotización (rótulos "IVA trasladado (16%)" y
 * "Retención ISR (1.25%)"). Solo presentación: no calcula ni cambia ningún monto.
 *
 * La cotización guarda los montos, no las tasas, así que se deducen
 * (monto ÷ subtotal, en %, redondeado a 2 decimales) y solo se aceptan si
 * coinciden con la tasa actual de la configuración o con las legales
 * conocidas (IVA 16 %, retención 1.25 %). Si no coinciden, devuelven null y el
 * rótulo se muestra sin porcentaje. Función pura: sin Prisma ni servidor, para
 * usarla igual en el detalle, el resumen y las exportaciones.
 */

const redondear2 = (x: number) => Math.round(x * 100) / 100;

export interface TasasMostradas {
  /** En porcentaje (16, 1.25), o null si no se puede afirmar. */
  iva: number | null;
  retencionIsr: number | null;
}

function deducir(monto: number, subtotal: number, aceptadas: number[]): number | null {
  if (!(subtotal > 0) || !(monto > 0)) return null;
  const tasa = redondear2((monto / subtotal) * 100);
  return aceptadas.some((a) => redondear2(a) === tasa) ? tasa : null;
}

export function tasasMostradas(
  cotizacion: { subtotal: number; iva: number; retencionIsr: number },
  configActual: { ivaPct: number; retencionIsrPct: number }
): TasasMostradas {
  return {
    iva: deducir(cotizacion.iva, cotizacion.subtotal, [configActual.ivaPct * 100, 16]),
    retencionIsr: deducir(cotizacion.retencionIsr, cotizacion.subtotal, [configActual.retencionIsrPct * 100, 1.25]),
  };
}

/** "16%", "1.25%" o "" (sin porcentaje). */
export function textoTasa(tasa: number | null): string {
  return tasa === null ? "" : `${tasa}%`;
}

/** "IVA trasladado (16%)" o "IVA trasladado" si la tasa no se puede afirmar. */
export function rotuloConTasa(rotulo: string, tasa: number | null): string {
  return tasa === null ? rotulo : `${rotulo} (${tasa}%)`;
}
