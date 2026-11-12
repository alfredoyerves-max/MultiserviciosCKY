"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarCuentaPorCobrarAction, cancelarCuentaPorCobrarAction } from "../../actions";
import { initialActionState } from "../../form-state";
import { EliminarCuentaModal } from "../../eliminar-cuenta-modal";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";

/**
 * Menú "⋯" de una cuenta por cobrar con exactamente una acción destructiva,
 * según si tiene abonos o no: sin abonos se puede eliminar de verdad; con al
 * menos uno, solo se puede cancelar (conserva el historial). Nunca ambas.
 * Las dos piden confirmación en un modal. `verDetalleHref` agrega "Ver
 * detalle" cuando el menú vive en una fila de lista.
 */
export function AccionesCuenta({
  cuentaId,
  tieneAbonos,
  verDetalleHref,
}: {
  cuentaId: string;
  tieneAbonos: boolean;
  verDetalleHref?: string;
}) {
  const [modal, setModal] = useState<"cancelar" | "eliminar" | null>(null);

  return (
    <>
      <RowActions
        label="Más acciones de la cuenta"
        actions={[
          ...(verDetalleHref ? [{ label: "Ver detalle", href: verDetalleHref }] : []),
          tieneAbonos
            ? { label: "Cancelar cuenta", danger: true, onSelect: () => setModal("cancelar") }
            : { label: "Eliminar cuenta", danger: true, onSelect: () => setModal("eliminar") },
        ]}
      />
      {modal === "eliminar" && (
        <EliminarCuentaModal
          cuentaId={cuentaId}
          titulo="Eliminar cuenta por cobrar"
          action={eliminarCuentaPorCobrarAction}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "cancelar" && <CancelarCuentaModal cuentaId={cuentaId} onClose={() => setModal(null)} />}
    </>
  );
}

function CancelarCuentaModal({ cuentaId, onClose }: { cuentaId: string; onClose: () => void }) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialActionState, formData: FormData) => {
      const res = await cancelarCuentaPorCobrarAction(prev, formData);
      if (res.ok) {
        onClose();
        router.refresh();
      }
      return res;
    },
    initialActionState
  );

  return (
    <Modal onClose={onClose} danger>
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
          <Button type="button" variant="ghost" onClick={onClose}>
            Volver
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Cancelando…" : "Confirmar cancelación"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
