// Lógica pura para Cuentas por Cobrar/Pagar (Fase 7). Pendiente/Parcial/
// Pagada NUNCA se guardan en BD — se derivan siempre del saldo (montoTotal
// - suma de abonos) en tiempo de lectura. CANCELADA es la excepción: solo
// aplica a Cuentas por Cobrar, SÍ se guarda explícitamente (no es
// derivable del saldo), y cuando está presente gana sobre el cálculo por
// saldo — ver el parámetro opcional `cancelada` de calcularEstadoCuenta.

export const ESTADOS_CUENTA = ["PENDIENTE", "PARCIAL", "PAGADA", "CANCELADA"] as const;
export type EstadoCuenta = (typeof ESTADOS_CUENTA)[number];

const TOLERANCIA = 0.005; // centavos, por acumulación de floats

export function calcularSaldo(montoTotal: number, abonos: { monto: number }[]): number {
  const sumaAbonos = abonos.reduce((sum, a) => sum + a.monto, 0);
  return Math.max(montoTotal - sumaAbonos, 0);
}

export function calcularEstadoCuenta(
  montoTotal: number,
  abonos: { monto: number }[],
  cancelada = false
): EstadoCuenta {
  if (cancelada) return "CANCELADA";
  const saldo = calcularSaldo(montoTotal, abonos);
  if (saldo <= TOLERANCIA) return "PAGADA";
  const sumaAbonos = abonos.reduce((sum, a) => sum + a.monto, 0);
  if (sumaAbonos > 0) return "PARCIAL";
  return "PENDIENTE";
}

export function estaVencida(fechaVencimiento: Date, saldo: number): boolean {
  return saldo > TOLERANCIA && fechaVencimiento.getTime() < Date.now();
}

export const ESTADO_CUENTA_LABELS_COBRAR: Record<EstadoCuenta, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  PAGADA: "Cobrada",
  CANCELADA: "Cancelada",
};

export const ESTADO_CUENTA_LABELS_PAGAR: Record<EstadoCuenta, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  PAGADA: "Pagada",
  CANCELADA: "Cancelada",
};
