"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmarEliminacionModal } from "./confirm-modals";
import { Button } from "@/components/ui/button";

/**
 * Botón + modal de confirmación para eliminar una cotización — reutilizado
 * en la tarjeta del kanban, la fila de la tabla histórica y el detalle.
 * El llamador ya decidió si es elegible (ver puedeEliminarseCotizacion en
 * lib/data/cotizaciones): este componente no vuelve a evaluarlo, solo
 * confía en que no se renderiza cuando no aplica.
 */
export function EliminarCotizacionButton({
  cotizacion,
  size = "sm",
  variant = "ghost",
  label = "Eliminar",
  onDeleted,
  /** Si se da, navega aquí tras eliminar con éxito (ej. el detalle vuelve
   *  a /cotizaciones porque su propia página ya no existe). */
  redirectTo,
  className,
}: {
  cotizacion: { id: string; folio: string; tipo: string; clienteNombre: string; total: number };
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "secondary" | "danger";
  label?: string;
  onDeleted?: () => void;
  redirectTo?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button type="button" size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <ConfirmarEliminacionModal
          cotizacion={cotizacion}
          onClose={() => setOpen(false)}
          onDeleted={() => {
            onDeleted?.();
            if (redirectTo) router.push(redirectTo);
          }}
        />
      )}
    </>
  );
}
