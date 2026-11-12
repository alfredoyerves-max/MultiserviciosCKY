"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "./form-state";
import { initialActionState } from "./form-state";
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

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const res = await action(prev, formData);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
      return res;
    },
    initialActionState
  );

  return (
    <>
      <Button type="button" size={size} onClick={() => setOpen(true)}>
        Pagar saldo ({formatCurrency(saldo)})
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
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
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
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
