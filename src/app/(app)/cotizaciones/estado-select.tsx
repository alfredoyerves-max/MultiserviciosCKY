"use client";

import { useState, useTransition } from "react";
import { updateEstadoAction } from "./actions";
import { ConfirmarAceptacionModal, ConfirmarRechazoModal } from "./confirm-modals";
import { Select } from "@/components/ui/input";
import { ESTADOS_COTIZACION, ESTADO_COTIZACION_LABELS, type EstadoCotizacion } from "@/lib/enums";
import { cn } from "@/lib/cn";

interface CotizacionParaSelect {
  id: string;
  folio: string;
  estado: string;
  totalAPagar: number;
  cliente: { nombreRazonSocial: string };
  /** ¿Ya existe una cuenta por cobrar para esta cotización? Si sí, el
   *  modal de "Aceptada" la reutiliza en vez de pedir una fecha nueva. */
  tieneCuentaPorCobrar: boolean;
  /** ¿Esa cuenta por cobrar ya tiene abonos registrados? Si sí y el
   *  estado actual es ACEPTADA, no se puede mover a ningún otro estado. */
  tieneAbonos: boolean;
}

const MENSAJE_BLOQUEO =
  "No se puede cambiar el estado: esta cotización ya tiene pagos registrados en su cuenta por cobrar.";

/**
 * Select de estado compartido entre el kanban y el detalle de cotización.
 * Borrador <-> Enviada aplican de inmediato; Aceptada/Rechazada abren un
 * modal de confirmación obligatorio (Aceptada además genera/reutiliza la
 * cuenta por cobrar automáticamente) — el <select> es controlado por
 * `cotizacion.estado` server-side, así que si se cancela el modal vuelve a
 * su valor real solo.
 *
 * Si la cotización está ACEPTADA y ya tiene abonos, las demás opciones se
 * deshabilitan en el propio <select> (no se pueden ni elegir) y además el
 * servidor rechaza el cambio como defensa adicional.
 */
export function EstadoSelect({
  cotizacion,
  className,
}: {
  cotizacion: CotizacionParaSelect;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState<"ACEPTADA" | "RECHAZADA" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bloqueadoPorAbonos = cotizacion.estado === "ACEPTADA" && cotizacion.tieneAbonos;

  const resumen = {
    id: cotizacion.id,
    folio: cotizacion.folio,
    clienteNombre: cotizacion.cliente.nombreRazonSocial,
    totalAPagar: cotizacion.totalAPagar,
  };

  return (
    <div className="flex flex-col gap-1">
      <Select
        className={cn("h-9 w-auto", className)}
        value={cotizacion.estado}
        disabled={pending}
        onChange={(e) => {
          const nuevo = e.target.value;
          if (nuevo === cotizacion.estado) return;
          setError(null);

          if (nuevo === "ACEPTADA" || nuevo === "RECHAZADA") {
            setConfirmando(nuevo);
            return;
          }

          startTransition(async () => {
            try {
              await updateEstadoAction(cotizacion.id, nuevo);
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
            }
          });
        }}
      >
        {ESTADOS_COTIZACION.map((e) => (
          <option
            key={e}
            value={e}
            disabled={bloqueadoPorAbonos && e !== "ACEPTADA"}
          >
            {ESTADO_COTIZACION_LABELS[e as EstadoCotizacion]}
          </option>
        ))}
      </Select>

      {bloqueadoPorAbonos && <p className="text-xs text-danger">{MENSAJE_BLOQUEO}</p>}
      {!bloqueadoPorAbonos && error && <p className="text-xs text-danger">{error}</p>}

      {confirmando === "ACEPTADA" && (
        <ConfirmarAceptacionModal
          cotizacion={resumen}
          reutilizaCuentaExistente={cotizacion.tieneCuentaPorCobrar}
          onClose={() => setConfirmando(null)}
        />
      )}
      {confirmando === "RECHAZADA" && (
        <ConfirmarRechazoModal
          cotizacion={resumen}
          tieneCuentaPorCobrar={cotizacion.tieneCuentaPorCobrar}
          onClose={() => setConfirmando(null)}
        />
      )}
    </div>
  );
}
