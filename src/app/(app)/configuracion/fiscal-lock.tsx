"use client";

import { useActionState } from "react";
import { unlockFiscalAction, type UnlockActionState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, Input } from "@/components/ui/input";

const initialUnlockState: UnlockActionState = { ok: false };

/** Indicador de cada sección: "Protegido" mientras el candado sigue puesto,
 *  "Editable" cuando se puede modificar (sin candado o ya desbloqueada). */
export function ProteccionBadge({ protegido }: { protegido: boolean }) {
  return protegido ? (
    <Badge tone="neutral" title="Se necesita tu contraseña para editar esta sección.">
      🔒 Protegido
    </Badge>
  ) : (
    <Badge tone="success">Editable</Badge>
  );
}

/**
 * Pide la contraseña UNA vez para desbloquear una pestaña. Solo verifica la
 * identidad (unlockFiscalAction no escribe nada); la contraseña verificada se
 * entrega a quien llama para retenerla únicamente en memoria de la pantalla.
 * El servidor la vuelve a verificar en cada guardado protegido.
 */
export function UnlockModal({
  titulo,
  onCancel,
  onUnlocked,
}: {
  titulo: string;
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
            {titulo} contiene datos protegidos — confirma tu identidad antes de editarlos. Solo se
            te pedirá una vez para esta pestaña.
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
