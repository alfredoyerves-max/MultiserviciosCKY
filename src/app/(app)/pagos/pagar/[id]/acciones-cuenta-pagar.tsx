"use client";

import { useState } from "react";
import { eliminarCuentaPorPagarAction } from "../../actions";
import { EliminarCuentaModal } from "../../eliminar-cuenta-modal";
import { RowActions } from "@/components/ui/row-actions";

/**
 * Menú "⋯" de una cuenta por pagar, igual al de por cobrar: "Ver detalle" (solo
 * en la fila de lista) y "Eliminar cuenta", que solo se puede usar cuando no hay
 * abonos y siempre pide confirmación. Con abonos queda bloqueada y dice por qué:
 * las cuentas por pagar no tienen "cancelar", así que el historial no se borra.
 */
export function AccionesCuentaPagar({
  cuentaId,
  nAbonos,
  verDetalleHref,
}: {
  cuentaId: string;
  nAbonos: number;
  verDetalleHref?: string;
}) {
  const [eliminando, setEliminando] = useState(false);

  return (
    <>
      <RowActions
        label="Más acciones de la cuenta"
        actions={[
          ...(verDetalleHref ? [{ label: "Ver detalle", href: verDetalleHref }] : []),
          {
            label: nAbonos > 0 ? "Eliminar (tiene abonos)" : "Eliminar cuenta",
            danger: true,
            disabled: nAbonos > 0,
            hint: nAbonos > 0 ? `Tiene ${nAbonos} abono${nAbonos === 1 ? "" : "s"}: no se puede eliminar` : undefined,
            onSelect: () => setEliminando(true),
          },
        ]}
      />
      {eliminando && (
        <EliminarCuentaModal
          cuentaId={cuentaId}
          titulo="Eliminar cuenta por pagar"
          action={eliminarCuentaPorPagarAction}
          onClose={() => setEliminando(false)}
        />
      )}
    </>
  );
}
