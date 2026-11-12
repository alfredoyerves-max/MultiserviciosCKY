"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { initialActionState, ejecutarSeguro, type ActionState } from "./form-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/**
 * Confirmación para eliminar una cuenta SIN abonos (por cobrar o por pagar).
 * La acción del servidor vuelve a comprobar que no tenga abonos.
 */
export function EliminarCuentaModal({
  cuentaId,
  titulo,
  action,
  onClose,
}: {
  cuentaId: string;
  titulo: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  onClose: () => void;
}) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const res = await ejecutarSeguro(action, prev, formData);
    if (res.ok) {
      onClose();
      router.push("/pagos");
    }
    router.refresh();
    return res;
  }, initialActionState);

  return (
    <Modal onClose={onClose} danger>
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="cuentaId" value={cuentaId} />
        <h3 className="text-sm font-semibold text-text">{titulo}</h3>
        <p className="text-sm text-text-muted">
          ¿Confirmas que quieres eliminarla? No tiene abonos registrados, así que se borra por
          completo — esta acción no se puede deshacer.
        </p>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Eliminando…" : "Eliminar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
