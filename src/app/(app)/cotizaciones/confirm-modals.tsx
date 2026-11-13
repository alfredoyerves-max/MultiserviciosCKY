"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmarAceptacionAction,
  confirmarRechazoAction,
  deleteCotizacionAction,
  updateEstadoAction,
  type CotizacionActionState,
} from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { vigenciaEnDias } from "@/lib/fechaLocal";

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
  total: number;
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
            {cotizacion.folio} · {cotizacion.clienteNombre} · {formatCurrency(cotizacion.total)}
          </p>
        </div>

        <p className="text-sm text-text-muted">
          ¿Confirmas que el cliente aceptó esta cotización?{" "}
          {reutilizaCuentaExistente
            ? "Esta cotización ya tiene una cuenta por cobrar generada — se reutilizará tal cual, sin crear una nueva."
            : "Se generará automáticamente su cuenta por cobrar."}
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
            {cotizacion.folio} · {cotizacion.clienteNombre} · {formatCurrency(cotizacion.total)}
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

export function ConfirmarEliminacionModal({
  cotizacion,
  onClose,
  onDeleted,
}: {
  cotizacion: CotizacionResumen;
  onClose: () => void;
  /** Se llama tras eliminar con éxito, además de cerrar el modal — la
   *  página de detalle la usa para redirigir a /cotizaciones. */
  onDeleted?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: CotizacionActionState, formData: FormData) => {
      const res = await deleteCotizacionAction(prev, formData);
      if (res.ok) {
        onClose();
        onDeleted?.();
      }
      return res;
    },
    initialState
  );

  return (
    <Modal onClose={onClose} danger>
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="cotizacionId" value={cotizacion.id} />
        <div>
          <h3 className="text-sm font-semibold text-text">Eliminar cotización</h3>
          <p className="mt-1 text-xs text-text-dim">
            {cotizacion.folio} · {cotizacion.clienteNombre} · {formatCurrency(cotizacion.total)}
          </p>
        </div>

        <p className="text-sm text-text-muted">
          Esta acción no se puede deshacer. El folio {cotizacion.folio} no se reutilizará en ninguna
          cotización futura.
        </p>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Eliminando…" : "Eliminar cotización"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * "Marcar como enviada" sobre una cotización con la vigencia vencida: pide los días de
 * vigencia nuevos (por defecto los que tenía la cotización) y los cuenta desde hoy en México.
 */
export function ReenviarConVigenciaModal({
  cotizacion,
  diasPorDefecto,
  onClose,
}: {
  cotizacion: CotizacionResumen;
  diasPorDefecto: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [dias, setDias] = useState(String(diasPorDefecto));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const n = Number(dias);
  const valido = Number.isInteger(n) && n >= 1 && n <= 365;

  function confirmar() {
    if (!valido || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateEstadoAction(cotizacion.id, "ENVIADA", n);
        onClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo marcar como enviada.");
      }
    });
  }

  return (
    <Modal onClose={pending ? () => {} : onClose}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-text">Nueva vigencia para {cotizacion.folio}</h3>
          <p className="mt-1 text-sm text-text-muted">
            La vigencia de esta cotización ya venció. Indica cuántos días tendrá, contados desde hoy (hora de México).
          </p>
        </div>
        <Field className="max-w-[10rem]">
          <FieldLabel htmlFor="dias-vigencia">Días de vigencia</FieldLabel>
          <Input
            id="dias-vigencia"
            type="number"
            min={1}
            max={365}
            step={1}
            value={dias}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDias(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmar();
              }
            }}
          />
        </Field>
        {valido && (
          <p className="text-xs text-text-dim">Vencerá el {formatDate(vigenciaEnDias(n))}.</p>
        )}
        {!valido && <p className="text-sm text-danger">Escribe un número entero de 1 a 365.</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={!valido || pending}>
            {pending ? "Guardando…" : "Marcar como enviada"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
