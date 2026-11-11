"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEstadoAction } from "./actions";
import {
  ConfirmarAceptacionModal,
  ConfirmarEliminacionModal,
  ConfirmarRechazoModal,
} from "./confirm-modals";
import { Button } from "@/components/ui/button";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { puedeEliminarseCotizacion } from "@/lib/cotizacionRules";
import type { EstadoCotizacion } from "@/lib/enums";

export interface CotizacionParaAcciones {
  id: string;
  folio: string;
  tipo: string;
  estado: string;
  netoARecibir: number;
  cliente: { nombreRazonSocial: string };
  cuentaPorCobrar: { abonos: { id: string }[] } | null;
}

const MENSAJE_BLOQUEO = "Ya tiene pagos registrados en su cuenta por cobrar.";

// Texto de la acción que lleva A cada estado.
const ACCION_HACIA: Record<EstadoCotizacion, string> = {
  BORRADOR: "Volver a borrador",
  ENVIADA: "Marcar como enviada",
  ACEPTADA: "Registrar aceptación",
  RECHAZADA: "Marcar como rechazada",
};

/** Siguiente paso natural del flujo (acción principal visible), si lo hay. */
function siguientePaso(estado: string): EstadoCotizacion | null {
  if (estado === "BORRADOR") return "ENVIADA";
  if (estado === "ENVIADA") return "ACEPTADA";
  return null;
}

/**
 * Acciones de una cotización: el siguiente paso del flujo como botón visible
 * (solo en la tarjeta) y el resto —otros cambios de estado, ver detalle y
 * Eliminar— dentro del menú "⋯". Las reglas de bloqueo y confirmación son las
 * de siempre: Aceptada/Rechazada piden confirmación y el servidor valida todo.
 */
export function AccionesCotizacion({
  cotizacion,
  conPrincipal = false,
}: {
  cotizacion: CotizacionParaAcciones;
  conPrincipal?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<"ACEPTADA" | "RECHAZADA" | "ELIMINAR" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tieneCxc = cotizacion.cuentaPorCobrar !== null;
  const tieneAbonos = (cotizacion.cuentaPorCobrar?.abonos.length ?? 0) > 0;
  const bloqueadoPorAbonos = cotizacion.estado === "ACEPTADA" && tieneAbonos;

  const resumen = {
    id: cotizacion.id,
    folio: cotizacion.folio,
    tipo: cotizacion.tipo,
    clienteNombre: cotizacion.cliente.nombreRazonSocial,
    total: cotizacion.netoARecibir,
  };

  function irA(destino: EstadoCotizacion) {
    setError(null);
    if (destino === "ACEPTADA" || destino === "RECHAZADA") {
      setModal(destino);
      return;
    }
    startTransition(async () => {
      try {
        await updateEstadoAction(cotizacion.id, destino);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
      }
    });
  }

  const principal = conPrincipal ? siguientePaso(cotizacion.estado) : null;
  const destinos = (["BORRADOR", "ENVIADA", "ACEPTADA", "RECHAZADA"] as EstadoCotizacion[]).filter(
    (e) => e !== cotizacion.estado && e !== principal
  );

  const acciones: RowAction[] = [
    { label: "Ver detalle", href: `/cotizaciones/${cotizacion.id}` },
    ...destinos.map<RowAction>((e) => ({
      label: ACCION_HACIA[e],
      onSelect: () => irA(e),
      disabled: bloqueadoPorAbonos,
      hint: bloqueadoPorAbonos ? MENSAJE_BLOQUEO : undefined,
    })),
  ];
  if (puedeEliminarseCotizacion(cotizacion)) {
    acciones.push({ label: "Eliminar", onSelect: () => setModal("ELIMINAR"), danger: true });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {principal && (
          <Button type="button" size="sm" className="flex-1" disabled={pending} onClick={() => irA(principal)}>
            {pending ? "Guardando…" : ACCION_HACIA[principal]}
          </Button>
        )}
        <RowActions actions={acciones} label={`Más acciones de ${cotizacion.folio}`} />
      </div>
      {bloqueadoPorAbonos && conPrincipal && <p className="text-xs text-danger">{MENSAJE_BLOQUEO}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}

      {modal === "ACEPTADA" && (
        <ConfirmarAceptacionModal
          cotizacion={resumen}
          reutilizaCuentaExistente={tieneCxc}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "RECHAZADA" && (
        <ConfirmarRechazoModal
          cotizacion={resumen}
          tieneCuentaPorCobrar={tieneCxc}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "ELIMINAR" && (
        <ConfirmarEliminacionModal
          cotizacion={resumen}
          onClose={() => setModal(null)}
          onDeleted={() => router.refresh()}
        />
      )}
    </div>
  );
}
