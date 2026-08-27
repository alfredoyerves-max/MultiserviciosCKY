"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarCuentaPorCobrarAction, cancelarCuentaPorCobrarAction } from "../../actions";
import { initialActionState } from "../../form-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/**
 * Exactamente un botón, según si la cuenta tiene abonos o no: sin abonos
 * se puede eliminar de verdad; con al menos uno, solo se puede cancelar
 * (conserva el historial). Nunca se muestran ambos a la vez.
 */
export function AccionesCuenta({ cuentaId, tieneAbonos }: { cuentaId: string; tieneAbonos: boolean }) {
  return tieneAbonos ? (
    <CancelarCuentaButton cuentaId={cuentaId} />
  ) : (
    <EliminarCuentaButton cuentaId={cuentaId} />
  );
}

function EliminarCuentaButton({ cuentaId }: { cuentaId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialActionState, formData: FormData) => {
      const res = await eliminarCuentaPorCobrarAction(prev, formData);
      if (res.ok) {
        setOpen(false);
        router.push("/pagos");
      }
      return res;
    },
    initialActionState
  );

  return (
    <>
      <Button size="sm" variant="danger" onClick={() => setOpen(true)}>
        Eliminar
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)} danger>
          <form action={formAction} className="flex flex-col gap-4 p-5">
            <input type="hidden" name="cuentaId" value={cuentaId} />
            <h3 className="text-sm font-semibold text-text">Eliminar cuenta por cobrar</h3>
            <p className="text-sm text-text-muted">
              ¿Confirmas que quieres eliminarla? No tiene abonos registrados, así que se borra por
              completo — esta acción no se puede deshacer.
            </p>
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function CancelarCuentaButton({ cuentaId }: { cuentaId: string }) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialActionState, formData: FormData) => {
      const res = await cancelarCuentaPorCobrarAction(prev, formData);
      if (res.ok) setOpen(false);
      return res;
    },
    initialActionState
  );

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Cancelar cuenta
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)} danger>
          <form action={formAction} className="flex flex-col gap-4 p-5">
            <input type="hidden" name="cuentaId" value={cuentaId} />
            <h3 className="text-sm font-semibold text-text">Cancelar cuenta por cobrar</h3>
            <p className="text-sm text-text-muted">
              Esta cuenta ya tiene abonos registrados, así que no se puede eliminar. Al cancelarla,
              su historial de abonos se conserva para auditoría, pero deja de contar en los totales
              de &quot;por cobrar&quot;/&quot;vencido&quot; y ya no podrá recibir abonos nuevos.
              ¿Confirmas?
            </p>
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Volver
              </Button>
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Cancelando…" : "Confirmar cancelación"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
