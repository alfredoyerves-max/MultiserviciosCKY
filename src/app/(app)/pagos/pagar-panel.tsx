"use client";

import { useActionState, useState } from "react";
import { createCuentaPorPagarAction, registrarAbonoPorPagarAction } from "./actions";
import { initialActionState } from "./form-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SidePanel } from "@/components/ui/side-panel";
import { Field, FieldError, FieldLabel, Input } from "@/components/ui/input";
import { calcularSaldo, calcularEstadoCuenta, estaVencida, ESTADO_CUENTA_LABELS_PAGAR } from "@/lib/cuentas";
import { CuentaFila } from "./cuenta-fila";
import { PagarSaldoButton } from "./pagar-saldo-button";
import { AccionesCuentaPagar } from "./pagar/[id]/acciones-cuenta-pagar";
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

  const nueva = (
    <Button size="sm" onClick={() => setCreating(true)}>
      + Nueva cuenta por pagar
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">Cuentas por pagar a proveedores/subcontratistas.</p>
        {nueva}
      </div>

      <div className="flex flex-col gap-2">
        {cuentas.length === 0 && (
          <Card>
            <EmptyState
              title="Sin cuentas por pagar todavía."
              action={
                <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
                  + Nueva cuenta por pagar
                </Button>
              }
            />
          </Card>
        )}
        {cuentas.map((c) => {
          const saldo = calcularSaldo(c.montoTotal, c.abonos);
          const estado = calcularEstadoCuenta(c.montoTotal, c.abonos);
          const vencida = estaVencida(c.fechaVencimiento, saldo);
          const pctAbonado = c.montoTotal > 0 ? ((c.montoTotal - saldo) / c.montoTotal) * 100 : 0;
          const href = `/pagos/pagar/${c.id}`;

          return (
            <CuentaFila
              key={c.id}
              href={href}
              titulo={c.concepto}
              subtitulo={c.proveedor}
              estado={{ label: ESTADO_CUENTA_LABELS_PAGAR[estado], tone: ESTADO_TONE[estado] }}
              vencida={vencida}
              fechaVencimiento={c.fechaVencimiento}
              nAbonos={c.abonos.length}
              pctAbonado={pctAbonado}
              saldo={saldo}
              montoTotal={c.montoTotal}
              acciones={
                <>
                  {estado !== "PAGADA" && (
                    <PagarSaldoButton
                      cuentaId={c.id}
                      saldo={saldo}
                      action={registrarAbonoPorPagarAction}
                      verbo="pagar"
                    />
                  )}
                  <AccionesCuentaPagar cuentaId={c.id} nAbonos={c.abonos.length} verDetalleHref={href} />
                </>
              }
            />
          );
        })}
      </div>

      {creating && <CuentaPorPagarForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />}
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
    <SidePanel
      title="Nueva cuenta por pagar"
      onClose={onCancel}
      footer={(solicitarCierre) => (
        <>
          <Button type="button" variant="ghost" onClick={solicitarCierre}>
            Cancelar
          </Button>
          <Button type="submit" form="cuenta-pagar-form" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </>
      )}
    >
      <form id="cuenta-pagar-form" action={formAction} className="flex flex-col gap-4">
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
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
      </form>
    </SidePanel>
  );
}
