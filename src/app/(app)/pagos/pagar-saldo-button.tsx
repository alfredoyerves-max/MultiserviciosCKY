"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "./form-state";
import { initialActionState, ejecutarSeguro } from "./form-state";
import { useAvisoLento, TEXTO_AVISO_LENTO } from "./use-aviso-lento";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

/** Fecha de hoy en hora local (AAAA-MM-DD), no en UTC. */
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * "Pagar saldo ($X)": registra un abono por el saldo completo en dos clics
 * (botón + confirmar). Usa la misma acción que el formulario de abono manual,
 * así que el servidor valida igual (cuenta no cancelada, monto ≤ saldo). El
 * monto se envía sin redondear —el mismo saldo calculado— para que la cuenta
 * quede exactamente en cero. El abono parcial sigue con monto manual.
 */
export function PagarSaldoButton({
  cuentaId,
  saldo,
  action,
  verbo,
  size = "sm",
}: {
  cuentaId: string;
  saldo: number;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** "Cobrar" (por cobrar) o "Pagar" (por pagar) en el texto de confirmación. */
  verbo: "cobrar" | "pagar";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const enviando = useRef(false);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      if (enviando.current) return prev; // sin doble envío (Enter + clic, doble clic)
      enviando.current = true;
      try {
        const res = await ejecutarSeguro(action, prev, formData);
        if (res.ok) setOpen(false);
        // Con éxito o con fallo, vuelve a leer el estado real de la cuenta:
        // si la conexión se cortó, el abono pudo haberse guardado.
        router.refresh();
        return res;
      } finally {
        enviando.current = false;
      }
    },
    initialActionState
  );
  const lento = useAvisoLento(pending);
  // Mientras se registra no se puede cerrar, salvo que ya tarde más de 15 s.
  const cerrar = () => {
    if (!pending || lento) setOpen(false);
  };

  return (
    <>
      <Button type="button" size={size} onClick={() => setOpen(true)}>
        Pagar saldo ({formatCurrency(saldo)})
      </Button>
      {open && (
        <Modal onClose={cerrar}>
          <form action={formAction} className="flex flex-col gap-4 p-5">
            <input type="hidden" name="cuentaId" value={cuentaId} />
            <input type="hidden" name="fecha" value={hoyLocal()} />
            <input type="hidden" name="monto" value={String(saldo)} />
            <input type="hidden" name="nota" value="Pago del saldo completo" />
            <div>
              <h3 className="text-sm font-semibold text-text">Registrar pago del saldo</h3>
              <p className="mt-1 text-sm text-text-muted">
                Se registrará un abono por <strong className="text-text">{formatCurrency(saldo)}</strong>{" "}
                con fecha de hoy, por el saldo completo que queda por {verbo}. La cuenta quedará en cero.
              </p>
            </div>
            {lento && (
              <p role="status" className="text-sm text-warning">
                {TEXTO_AVISO_LENTO}
              </p>
            )}
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={cerrar} disabled={pending && !lento}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Registrando…" : "Confirmar pago"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
