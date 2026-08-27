"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createCuentaPorPagarAction } from "./actions";
import { initialActionState } from "./form-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Field, FieldError, FieldLabel, Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { calcularSaldo, calcularEstadoCuenta, estaVencida, ESTADO_CUENTA_LABELS_PAGAR } from "@/lib/cuentas";
import type { AbonoPorPagar, CuentaPorPagar } from "@/generated/prisma/client";

export type CuentaPorPagarConDatos = CuentaPorPagar & { abonos: AbonoPorPagar[] };

// CANCELADA nunca ocurre en Cuentas por Pagar (ese estado es exclusivo de
// Cuentas por Cobrar), pero el tipo EstadoCuenta es compartido, así que el
// Record debe cubrir la unión completa.
const ESTADO_TONE = {
  PENDIENTE: "neutral",
  PARCIAL: "primary",
  PAGADA: "success",
  CANCELADA: "neutral",
} as const;

function fechaDefault(diasDesdeHoy: number) {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  return d.toISOString().slice(0, 10);
}

export function PagarPanel({ cuentas }: { cuentas: CuentaPorPagarConDatos[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Cuentas por pagar a proveedores/subcontratistas.</p>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            + Nueva cuenta por pagar
          </Button>
        )}
      </div>

      {creating && <CuentaPorPagarForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />}

      <div className="flex flex-col gap-3">
        {cuentas.length === 0 && (
          <Card>
            <EmptyState
              title="Sin cuentas por pagar todavía."
              action={
                !creating && (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    + Nueva cuenta por pagar
                  </Button>
                )
              }
            />
          </Card>
        )}
        {cuentas.map((c) => {
          const saldo = calcularSaldo(c.montoTotal, c.abonos);
          const estado = calcularEstadoCuenta(c.montoTotal, c.abonos);
          const vencida = estaVencida(c.fechaVencimiento, saldo);
          const pctAbonado = c.montoTotal > 0 ? ((c.montoTotal - saldo) / c.montoTotal) * 100 : 0;

          return (
            <Link key={c.id} href={`/pagos/pagar/${c.id}`}>
              <Card
                className={
                  vencida
                    ? "border-danger-strong/50 transition-colors hover:bg-surface-2"
                    : "transition-colors hover:bg-surface-2"
                }
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text">{c.concepto}</span>
                      <Badge tone={ESTADO_TONE[estado]}>{ESTADO_CUENTA_LABELS_PAGAR[estado]}</Badge>
                      {vencida && <Badge tone="danger">Vencida</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-text-muted">{c.proveedor}</p>
                    <p className="mt-0.5 text-xs text-text-dim">
                      Vence {formatDate(c.fechaVencimiento)} · {c.abonos.length} abono(s)
                    </p>
                    <ProgressBar pct={pctAbonado} className="mt-2 max-w-48" />
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
    </div>
  );
}

function CuentaPorPagarForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialActionState, formData: FormData) => {
      const res = await createCuentaPorPagarAction(prev, formData);
      if (res.ok) onDone();
      return res;
    },
    initialActionState
  );

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Nueva cuenta por pagar</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="concepto">Concepto</FieldLabel>
              <Input id="concepto" name="concepto" placeholder="Ej. Renta de equipo" required />
              <FieldError>{state.fieldErrors?.concepto}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="proveedor">Proveedor / beneficiario</FieldLabel>
              <Input id="proveedor" name="proveedor" required />
              <FieldError>{state.fieldErrors?.proveedor}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="montoTotal">Monto total ($)</FieldLabel>
              <Input id="montoTotal" name="montoTotal" type="number" step="0.01" min="0.01" required />
              <FieldError>{state.fieldErrors?.montoTotal}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="fechaVencimiento">Fecha de vencimiento</FieldLabel>
              <Input
                id="fechaVencimiento"
                name="fechaVencimiento"
                type="date"
                defaultValue={fechaDefault(30)}
                required
              />
              <FieldError>{state.fieldErrors?.fechaVencimiento}</FieldError>
            </Field>
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
