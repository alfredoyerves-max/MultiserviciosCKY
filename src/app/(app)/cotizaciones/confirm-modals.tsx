"use client";

import { useActionState } from "react";
import { confirmarAceptacionAction, confirmarRechazoAction, type CotizacionActionState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";

const initialState: CotizacionActionState = { ok: false };

function fechaDefault(diasDesdeHoy: number) {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  return d.toISOString().slice(0, 10);
}

interface CotizacionResumen {
  id: string;
  folio: string;
  tipo: string;
  clienteNombre: string;
  totalAPagar: number;
}

export function ConfirmarAceptacionModal({
  cotizacion,
  reutilizaCuentaExistente,
  onClose,
}: {
  cotizacion: CotizacionResumen;
  reutilizaCuentaExistente: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: CotizacionActionState, formData: FormData) => {
      const res = await confirmarAceptacionAction(prev, formData);
      if (res.ok) onClose();
      return res;
    },
    initialState
  );

  return (
    <Modal onClose={onClose}>
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="cotizacionId" value={cotizacion.id} />
        <div>
          <h3 className="text-sm font-semibold text-text">Confirmar cotización aceptada</h3>
          <p className="mt-1 text-xs text-text-dim">
            {cotizacion.folio} · {cotizacion.clienteNombre} · {formatCurrency(cotizacion.totalAPagar)}
          </p>
        </div>

        <p className="text-sm text-text-muted">
          ¿Confirmas que el cliente aceptó esta cotización?{" "}
          {reutilizaCuentaExistente
            ? "Esta cotización ya tiene una cuenta por cobrar generada — se reutilizará tal cual, sin crear una nueva."
            : "Se generará automáticamente su cuenta por cobrar."}
          {cotizacion.tipo === "MATERIAL" &&
            " También se registrará automáticamente la salida de inventario de cada producto (Venta a cliente). Si el stock ya no alcanza, la confirmación se bloqueará."}
        </p>

        {!reutilizaCuentaExistente && (
          <Field>
            <FieldLabel htmlFor="fechaVencimiento">Vencimiento de la cuenta por cobrar</FieldLabel>
            <Input
              id="fechaVencimiento"
              name="fechaVencimiento"
              type="date"
              defaultValue={fechaDefault(30)}
              required
            />
          </Field>
        )}

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Confirmando…" : "Confirmar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmarRechazoModal({
  cotizacion,
  tieneCuentaPorCobrar,
  onClose,
}: {
  cotizacion: CotizacionResumen;
  tieneCuentaPorCobrar: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: CotizacionActionState, formData: FormData) => {
      const res = await confirmarRechazoAction(prev, formData);
      if (res.ok) onClose();
      return res;
    },
    initialState
  );

  return (
    <Modal onClose={onClose}>
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="cotizacionId" value={cotizacion.id} />
        <div>
          <h3 className="text-sm font-semibold text-text">Confirmar cotización rechazada</h3>
          <p className="mt-1 text-xs text-text-dim">
            {cotizacion.folio} · {cotizacion.clienteNombre} · {formatCurrency(cotizacion.totalAPagar)}
          </p>
        </div>

        <p className="text-sm text-text-muted">
          ¿Confirmas que esta cotización fue rechazada?{" "}
          {tieneCuentaPorCobrar &&
            "Su cuenta por cobrar (sin abonos todavía) se eliminará como parte de este cambio."}
        </p>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Confirmando…" : "Confirmar rechazo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
