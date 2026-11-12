"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { calcularSaldo, calcularEstadoCuenta, estaVencida, ESTADO_CUENTA_LABELS_COBRAR } from "@/lib/cuentas";
import { CuentaFila } from "./cuenta-fila";
import { PagarSaldoButton } from "./pagar-saldo-button";
import { AccionesCuenta } from "./cobrar/[id]/acciones-cuenta";
import { registrarAbonoPorCobrarAction } from "./actions";
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
      <Card>
        <EmptyState
          title="Sin cuentas por cobrar todavía."
          description='Se generan desde el detalle de una cotización en estado "Aceptada".'
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {cuentas.map((c) => {
        const saldo = calcularSaldo(c.montoTotal, c.abonos);
        const estado = calcularEstadoCuenta(c.montoTotal, c.abonos, c.cancelada);
        const vencida = !c.cancelada && estaVencida(c.fechaVencimiento, saldo);
        const pctAbonado = c.montoTotal > 0 ? ((c.montoTotal - saldo) / c.montoTotal) * 100 : 0;
        const href = `/pagos/cobrar/${c.id}`;
        const abierta = !c.cancelada && estado !== "PAGADA";

        return (
          <CuentaFila
            key={c.id}
            href={href}
            titulo={c.cotizacion.folio}
            tituloMono
            subtitulo={c.cotizacion.cliente.nombreRazonSocial}
            estado={{ label: ESTADO_CUENTA_LABELS_COBRAR[estado], tone: ESTADO_TONE[estado] }}
            vencida={vencida}
            fechaVencimiento={c.fechaVencimiento}
            nAbonos={c.abonos.length}
            pctAbonado={pctAbonado}
            saldo={saldo}
            montoTotal={c.montoTotal}
            acciones={
              <>
                {abierta && (
                  <PagarSaldoButton
                    cuentaId={c.id}
                    saldo={saldo}
                    action={registrarAbonoPorCobrarAction}
                    verbo="cobrar"
                  />
                )}
                {c.cancelada ? (
                  <a href={href} className="px-2 text-sm text-primary hover:underline">
                    Ver detalle
                  </a>
                ) : (
                  <AccionesCuenta cuentaId={c.id} tieneAbonos={c.abonos.length > 0} verDetalleHref={href} />
                )}
              </>
            }
          />
        );
      })}
    </div>
  );
}
