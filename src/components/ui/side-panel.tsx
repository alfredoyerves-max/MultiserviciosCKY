"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/**
 * Panel lateral para alta/edición: entra desde la derecha (560 px en escritorio,
 * ancho completo por debajo de 640 px). El contenido hace scroll dentro del
 * panel; el pie (Guardar / Cancelar) queda fijo abajo y respeta el área segura
 * de iOS. Cierra con Esc, clic en el fondo o el botón ✕; si hay cambios sin
 * guardar pide confirmación antes de descartarlos.
 *
 * El formulario va en `children` con un `id`, y su botón de envío en `footer`
 * con `form="<id>"` (el atributo `form` lo vincula aunque esté fuera del
 * <form>). `footer` recibe `solicitarCierre` para el botón Cancelar. Cuando el
 * guardado tiene éxito, el llamador cierra el panel directamente (sin aviso).
 */
export function SidePanel({
  title,
  description,
  onClose,
  footer,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  footer: (solicitarCierre: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [mounted] = useState(() => typeof document !== "undefined");
  const [sucio, setSucio] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const solicitarCierre = useCallback(() => {
    if (sucio) setConfirmando(true);
    else onClose();
  }, [sucio, onClose]);

  // Esc cierra (con la misma confirmación). Con el aviso abierto, Esc lo maneja el Modal.
  useEffect(() => {
    if (confirmando) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") solicitarCierre();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [solicitarCierre, confirmando]);

  // Evita que la página de atrás haga scroll mientras el panel está abierto.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={solicitarCierre} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="side-panel absolute inset-y-0 right-0 flex w-full flex-col border-l border-border-strong bg-surface-1 shadow-2xl outline-none sm:max-w-[560px]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-primary">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-text-dim">{description}</p>}
          </div>
          <button
            type="button"
            onClick={solicitarCierre}
            aria-label="Cerrar"
            className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            ✕
          </button>
        </header>

        {/* Cualquier cambio de un campo marca el panel como "con cambios sin guardar". */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4"
          onInput={() => setSucio(true)}
          onChange={() => setSucio(true)}
        >
          {children}
        </div>

        <footer
          className="flex justify-end gap-2 border-t border-border bg-surface-1 px-5 py-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          {footer(solicitarCierre)}
        </footer>
      </div>

      {confirmando && (
        <Modal onClose={() => setConfirmando(false)}>
          <div className="flex flex-col gap-4 p-5">
            <div>
              <h3 className="text-sm font-semibold text-text">¿Descartar los cambios?</h3>
              <p className="mt-1 text-sm text-text-muted">Hay cambios sin guardar. Si cierras ahora se perderán.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmando(false)}>
                Seguir editando
              </Button>
              <Button type="button" variant="danger" onClick={onClose}>
                Descartar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>,
    document.body
  );
}
