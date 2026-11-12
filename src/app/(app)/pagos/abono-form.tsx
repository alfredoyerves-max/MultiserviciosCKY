"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { initialActionState, ejecutarSeguro, MENSAJE_FALLO_ACCION, type ActionState } from "./form-state";
import { useAvisoLento, TEXTO_AVISO_LENTO } from "./use-aviso-lento";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Input } from "@/components/ui/input";

export function AbonoForm({
  cuentaId,
  action,
}: {
  cuentaId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const router = useRouter();
  const enviando = useRef(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      if (enviando.current) return prev; // sin doble envío
      enviando.current = true;
      try {
        const res = await ejecutarSeguro(action, prev, formData);
        // Si la conexión falló, el abono pudo guardarse: vuelve a leer el estado real.
        if (!res.ok && res.error === MENSAJE_FALLO_ACCION) router.refresh();
        return res;
      } finally {
        enviando.current = false;
      }
    },
    initialActionState
  );
  const lento = useAvisoLento(pending);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    // Grid de 2 columnas en móvil (fecha + monto lado a lado, nota y botón
    // a todo el ancho debajo — cómodo con el teclado numérico/fecha del
    // celular) — vuelve a la fila horizontal original desde sm.
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
      <input type="hidden" name="cuentaId" value={cuentaId} />
      <Field className="col-span-1 sm:w-40">
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
      <Field className="col-span-1 sm:w-40">
        <FieldLabel htmlFor="monto">Monto ($)</FieldLabel>
        <Input id="monto" name="monto" type="number" step="0.01" min="0.01" inputMode="decimal" required />
        <FieldError>{state.fieldErrors?.monto}</FieldError>
      </Field>
      <Field className="col-span-2 sm:min-w-[160px] sm:flex-1">
        <FieldLabel htmlFor="nota">Nota (opcional)</FieldLabel>
        <Input id="nota" name="nota" placeholder="Ej. Anticipo" />
      </Field>
      <Button type="submit" disabled={pending} className="col-span-2 sm:w-auto">
        {pending ? "Guardando…" : "+ Registrar abono"}
      </Button>
      {lento && (
        <p role="status" className="col-span-2 w-full text-sm text-warning">
          {TEXTO_AVISO_LENTO}
        </p>
      )}
      {state.error && <p className="col-span-2 w-full text-sm text-danger sm:w-full">{state.error}</p>}
    </form>
  );
}
