"use client";

import { useActionState, useState } from "react";
import { registrarEntradaAction, registrarSalidaAction } from "./actions";
import { initialFormState } from "./form-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Input, Select } from "@/components/ui/input";
import { MOTIVOS_SALIDA, MOTIVO_SALIDA_LABELS } from "@/lib/enums";

const hoy = () => new Date().toISOString().slice(0, 10);

export function RegistrarEntradaButton({ productoId }: { productoId: string }) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialFormState, formData: FormData) => {
      const res = await registrarEntradaAction(prev, formData);
      if (res.ok) setOpen(false);
      return res;
    },
    initialFormState
  );

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Registrar entrada
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <form action={formAction} className="flex flex-col gap-4 p-5">
            <input type="hidden" name="productoId" value={productoId} />
            <h3 className="text-sm font-semibold text-text">Registrar entrada</h3>

            <Field>
              <FieldLabel htmlFor="fecha-entrada">Fecha</FieldLabel>
              <Input id="fecha-entrada" name="fecha" type="date" defaultValue={hoy()} required />
              <FieldError>{state.fieldErrors?.fecha}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="cantidad-entrada">Cantidad</FieldLabel>
              <Input id="cantidad-entrada" name="cantidad" type="number" step="0.01" min="0.01" required />
              <FieldError>{state.fieldErrors?.cantidad}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="proveedor">Proveedor</FieldLabel>
              <Input id="proveedor" name="proveedor" placeholder="Ej. Distribuidora Campeche" required />
              <FieldError>{state.fieldErrors?.proveedor}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="costoUnitario">Costo unitario ($)</FieldLabel>
              <Input id="costoUnitario" name="costoUnitario" type="number" step="0.01" min="0" required />
              <FieldError>{state.fieldErrors?.costoUnitario}</FieldError>
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

export function RegistrarSalidaButton({ productoId }: { productoId: string }) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialFormState, formData: FormData) => {
      const res = await registrarSalidaAction(prev, formData);
      if (res.ok) setOpen(false);
      return res;
    },
    initialFormState
  );

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        + Registrar salida
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <form action={formAction} className="flex flex-col gap-4 p-5">
            <input type="hidden" name="productoId" value={productoId} />
            <h3 className="text-sm font-semibold text-text">Registrar salida</h3>

            <Field>
              <FieldLabel htmlFor="fecha-salida">Fecha</FieldLabel>
              <Input id="fecha-salida" name="fecha" type="date" defaultValue={hoy()} required />
              <FieldError>{state.fieldErrors?.fecha}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="cantidad-salida">Cantidad</FieldLabel>
              <Input id="cantidad-salida" name="cantidad" type="number" step="0.01" min="0.01" required />
              <FieldError>{state.fieldErrors?.cantidad}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="motivoSalida">Motivo</FieldLabel>
              <Select id="motivoSalida" name="motivoSalida" defaultValue={MOTIVOS_SALIDA[0]} required>
                {MOTIVOS_SALIDA.map((m) => (
                  <option key={m} value={m}>
                    {MOTIVO_SALIDA_LABELS[m]}
                  </option>
                ))}
              </Select>
              <FieldError>{state.fieldErrors?.motivoSalida}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="referencia">Referencia (opcional)</FieldLabel>
              <Input id="referencia" name="referencia" placeholder="Ej. Cliente o servicio relacionado" />
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
