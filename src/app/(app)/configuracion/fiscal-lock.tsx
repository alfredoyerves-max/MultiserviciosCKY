"use client";

import { useActionState, useState } from "react";
import { unlockFiscalAction, type UnlockActionState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/input";
import { CardHeader, CardTitle } from "@/components/ui/card";

const initialUnlockState: UnlockActionState = { ok: false };

export function FiscalSectionHeader({
  title,
  hint,
  unlocked,
  onUnlock,
}: {
  title: string;
  hint?: string;
  unlocked: boolean;
  /** Recibe la contraseña que se acaba de verificar — el formulario
   *  principal la reenvía como campo oculto para que el servidor la
   *  vuelva a verificar al guardar (ver saveSystemConfigAction). */
  onUnlock: (password: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <CardHeader className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {unlocked ? (
            <span className="text-xs font-medium text-success-soft">Desbloqueado</span>
          ) : (
            <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
              🔒 Editar valores fiscales
            </Button>
          )}
        </div>
        {hint && <p className="text-xs text-text-dim">{hint}</p>}
      </CardHeader>

      {open && (
        <UnlockModal
          onCancel={() => setOpen(false)}
          onUnlocked={(password) => {
            onUnlock(password);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function UnlockModal({
  onCancel,
  onUnlocked,
}: {
  onCancel: () => void;
  onUnlocked: (password: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: UnlockActionState, formData: FormData) => {
      const res = await unlockFiscalAction(prev, formData);
      if (res.ok) onUnlocked(String(formData.get("password") ?? ""));
      return res;
    },
    initialUnlockState
  );

  return (
    <Modal onClose={onCancel}>
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-text">Confirma tu contraseña</h3>
          <p className="mt-1 text-xs text-text-dim">
            Los valores fiscales son datos normativos — confirma tu identidad antes de
            editarlos.
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="unlock-password">Contraseña</FieldLabel>
          <Input
            id="unlock-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
          />
        </Field>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Verificando…" : "Desbloquear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
