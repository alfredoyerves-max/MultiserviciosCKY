"use client";

import { useActionState, useEffect, useRef } from "react";
import { initialActionState, type ActionState } from "./form-state";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Input } from "@/components/ui/input";

export function AbonoForm({
  cuentaId,
  action,
}: {
  cuentaId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="cuentaId" value={cuentaId} />
      <Field>
        <FieldLabel htmlFor="fecha">Fecha</FieldLabel>
        <Input
          id="fecha"
          name="fecha"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
        <FieldError>{state.fieldErrors?.fecha}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="monto">Monto ($)</FieldLabel>
        <Input id="monto" name="monto" type="number" step="0.01" min="0.01" required />
        <FieldError>{state.fieldErrors?.monto}</FieldError>
      </Field>
      <Field className="min-w-[160px] flex-1">
        <FieldLabel htmlFor="nota">Nota (opcional)</FieldLabel>
        <Input id="nota" name="nota" placeholder="Ej. Anticipo" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "+ Registrar abono"}
      </Button>
      {state.error && <p className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}
