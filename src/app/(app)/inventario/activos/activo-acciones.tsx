"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateEstadoActivoAction,
  darDeBajaActivoAction,
  registrarIncidenteActivoAction,
} from "../actions";
import { initialFormState, type FormActionState } from "../form-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/input";
import {
  ESTADO_ACTIVO_LABELS,
  TIPOS_EVENTO_ACTIVO_MANUAL,
  TIPO_EVENTO_ACTIVO_LABELS,
  type EstadoActivo,
  type TipoEventoActivoManual,
} from "@/lib/enums";

const ESTADOS_SIMPLES: EstadoActivo[] = ["FUNCIONAL", "EN_REPARACION"];

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

/** Selector rápido Funcional <-> En reparación — DADO_DE_BAJA nunca es una
 *  opción aquí, tiene su propio botón dedicado (DarDeBajaButton). */
export function EstadoActivoSelect({ activoId, estado }: { activoId: string; estado: EstadoActivo }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <Select
        className="h-9 w-auto"
        value={estado}
        disabled={pending}
        onChange={(e) => {
          const nuevo = e.target.value;
          if (nuevo === estado) return;
          setError(null);
          startTransition(async () => {
            try {
              await updateEstadoActivoAction(activoId, nuevo);
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
            }
          });
        }}
      >
        {ESTADOS_SIMPLES.map((e) => (
          <option key={e} value={e}>
            {ESTADO_ACTIVO_LABELS[e]}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function DarDeBajaButton({ activoId }: { activoId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: FormActionState, formData: FormData) => {
      const res = await darDeBajaActivoAction(prev, formData);
      if (res.ok) setOpen(false);
      return res;
    },
    initialFormState
  );

  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
        Dar de baja
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)} danger>
          <form action={formAction} className="flex flex-col gap-4 p-5">
            <input type="hidden" name="activoId" value={activoId} />
            <div>
              <h3 className="text-sm font-semibold text-text">Dar de baja</h3>
              <p className="mt-1 text-xs text-text-dim">
                El activo deja de contar como funcional. Esto no se puede deshacer desde aquí — se
                conserva en el historial para auditoría.
              </p>
            </div>

            <Field>
              <FieldLabel htmlFor="fecha-baja">Fecha de baja</FieldLabel>
              <Input id="fecha-baja" name="fecha" type="date" defaultValue={hoy()} required />
              <FieldError>{state.fieldErrors?.fecha}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="motivo-baja">Motivo</FieldLabel>
              <Textarea id="motivo-baja" name="motivo" required />
              <FieldError>{state.fieldErrors?.motivo}</FieldError>
            </Field>

            {state.error && <p className="text-sm text-danger">{state.error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Guardando…" : "Dar de baja"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function RegistrarIncidenteButton({ activoId }: { activoId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: FormActionState, formData: FormData) => {
      const res = await registrarIncidenteActivoAction(prev, formData);
      if (res.ok) setOpen(false);
      return res;
    },
    initialFormState
  );

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Registrar incidente
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <form action={formAction} className="flex flex-col gap-4 p-5">
            <input type="hidden" name="activoId" value={activoId} />
            <div>
              <h3 className="text-sm font-semibold text-text">Registrar incidente</h3>
              <p className="mt-1 text-xs text-text-dim">
                Queda en el historial sin cambiar el estado del activo.
              </p>
            </div>

            <Field>
              <FieldLabel htmlFor="tipo-evento">Tipo</FieldLabel>
              <Select id="tipo-evento" name="tipo" defaultValue="INCIDENTE" required>
                {TIPOS_EVENTO_ACTIVO_MANUAL.map((t: TipoEventoActivoManual) => (
                  <option key={t} value={t}>
                    {TIPO_EVENTO_ACTIVO_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="fecha-evento">Fecha</FieldLabel>
              <Input id="fecha-evento" name="fecha" type="date" defaultValue={hoy()} required />
              <FieldError>{state.fieldErrors?.fecha}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="descripcion-evento">Descripción</FieldLabel>
              <Textarea id="descripcion-evento" name="descripcion" required />
              <FieldError>{state.fieldErrors?.descripcion}</FieldError>
            </Field>

            {state.error && <p className="text-sm text-danger">{state.error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Registrar"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
