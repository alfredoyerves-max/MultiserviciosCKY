"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { calcularSaldo, calcularEstadoCuenta, estaVencida, ESTADO_CUENTA_LABELS_COBRAR } from "@/lib/cuentas";
import type { AbonoPorCobrar, Cliente, Cotizacion, CuentaPorCobrar } from "@/generated/prisma/client";

export type CuentaPorCobrarConDatos = CuentaPorCobrar & {
  cotizacion: Cotizacion & { cliente: Cliente };
  abonos: AbonoPorCobrar[];
};

const ESTADO_TONE = {
  PENDIENTE: "neutral",
  PARCIAL: "primary",
  PAGADA: "success",
  CANCELADA: "neutral",
} as const;

export function CobrarPanel({ cuentas }: { cuentas: CuentaPorCobrarConDatos[] }) {
  if (cuentas.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-text-dim">
        Sin cuentas por cobrar todavía. Se generan desde el detalle de una cotización en
        estado &quot;Aceptada&quot;.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {cuentas.map((c) => {
        const saldo = calcularSaldo(c.montoTotal, c.abonos);
        const estado = calcularEstadoCuenta(c.montoTotal, c.abonos, c.cancelada);
        const vencida = !c.cancelada && estaVencida(c.fechaVencimiento, saldo);

        return (
          <Link key={c.id} href={`/pagos/cobrar/${c.id}`}>
            <Card
              className={
                vencida ? "border-danger-strong/50 transition-colors hover:bg-surface-2" : "transition-colors hover:bg-surface-2"
              }
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-primary">{c.cotizacion.folio}</span>
                    <Badge tone={ESTADO_TONE[estado]}>{ESTADO_CUENTA_LABELS_COBRAR[estado]}</Badge>
                    {vencida && <Badge tone="danger">Vencida</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-text">{c.cotizacion.cliente.nombreRazonSocial}</p>
                  <p className="mt-0.5 text-xs text-text-dim">
                    Vence {formatDate(c.fechaVencimiento)} · {c.abonos.length} abono(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-text-dim">Saldo pendiente</p>
                  <p className="font-mono text-lg font-semibold tabular-nums text-text">
                    {formatCurrency(saldo)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-dim">de {formatCurrency(c.montoTotal)}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
