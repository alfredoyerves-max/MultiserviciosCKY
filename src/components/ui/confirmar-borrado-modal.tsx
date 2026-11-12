"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { ResultadoBorrado } from "@/lib/dependencias";

const FALLO_RED =
  "No se pudo completar la operación (falló la conexión o el servidor no respondió). Revisa el estado antes de reintentar.";

/**
 * Confirmación para eliminar algo que puede tener dependencias. Si el servidor
 * lo bloquea, el motivo se queda en el modal con los hijos nombrados y, si se
 * pasa `alternativa`, la salida que ofrece (por ejemplo "Desactivar" o ir a ver
 * los hijos). No usa confirm()/alert() del navegador.
 */
export function ConfirmarBorradoModal({
  titulo,
  descripcion,
  onConfirm,
  onClose,
  alternativa,
}: {
  titulo: string;
  descripcion: ReactNode;
  onConfirm: () => Promise<ResultadoBorrado>;
  onClose: () => void;
  /** Se pinta solo cuando el borrado fue bloqueado. */
  alternativa?: (cerrar: () => void) => ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [bloqueo, setBloqueo] = useState<ResultadoBorrado | null>(null);

  async function confirmar() {
    if (pending) return;
    setPending(true);
    try {
      const res = await onConfirm();
      if (res.ok) return onClose();
      setBloqueo(res);
    } catch {
      setBloqueo({ ok: false, error: FALLO_RED });
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal onClose={pending ? () => {} : onClose} danger>
      <div className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-semibold text-text">{titulo}</h3>
        {bloqueo ? (
          <div className="flex flex-col gap-2" role="alert">
            <p className="text-sm text-danger">{bloqueo.error}</p>
            {bloqueo.hijos && bloqueo.hijos.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-text">
                {bloqueo.hijos.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="text-sm text-text-muted">{descripcion}</div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {bloqueo ? (
            <>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
              {alternativa?.(onClose)}
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={confirmar} disabled={pending}>
                {pending ? "Eliminando…" : "Eliminar"}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
