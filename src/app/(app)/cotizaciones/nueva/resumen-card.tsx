"use client";

import { ResumenItem } from "@/components/ui/resumen-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/input";
import { calcularTotalesFiscales } from "@/lib/fiscalEngine";
import { tipoParaCalculoFiscal } from "@/lib/retencion";
import { formatCurrency, formatPercent } from "@/lib/format";

const TOOLTIP_SOLO_TRAMITE =
  "Cotización generada solo como trámite interno del cliente (papeleo de compras), sin intención real de compra: no es una venta. Se oculta del tablero por defecto.";

/**
 * Resumen fijo (sticky en escritorio) de ambos formularios (Servicio y
 * Material): totales fiscales siempre visibles, opciones de la cotización
 * (vigencia, «Solo trámite») y el botón de crear. Los totales salen de
 * calcularTotalesFiscales (misma función que usa el servidor al guardar).
 * Lo propio de cada tipo (ej. el margen de Servicio) entra como `children`.
 */
export function ResumenCotizacionCard({
  titulo,
  children,
  diasVigencia,
  setDiasVigencia,
  esSoporte,
  setEsSoporte,
  subtotal,
  aplicaRetencion,
  setAplicaRetencion,
  ivaPct,
  retencionIsrPct,
  aviso,
  error,
  pending,
  sinLineas,
  bloqueo,
}: {
  titulo: string;
  children?: React.ReactNode;
  diasVigencia: number;
  setDiasVigencia: (n: number) => void;
  esSoporte: boolean;
  setEsSoporte: (b: boolean) => void;
  subtotal: number;
  /** Casilla de retención ISR (valor ya resuelto por el cliente elegido). */
  aplicaRetencion: boolean;
  setAplicaRetencion: (v: boolean) => void;
  ivaPct: number;
  retencionIsrPct: number;
  /** Aviso único del formulario (ej. sueldo bajo el mínimo). */
  aviso?: string;
  error?: string;
  pending: boolean;
  sinLineas: boolean;
  /** Motivo por el que no se puede crear todavía (ej. RFC inválido del cliente nuevo). */
  bloqueo?: string | null;
}) {
  // El motor fiscal no cambia: decide la retención por el tipo de cliente, así que se le pasa el equivalente a la casilla.
  const fiscal = calcularTotalesFiscales(subtotal, tipoParaCalculoFiscal(aplicaRetencion), ivaPct, retencionIsrPct);

  return (
    <Card className="lg:sticky lg:top-6">
      <input type="hidden" name="diasVigencia" value={diasVigencia} />
      <input type="hidden" name="esSoporte" value={esSoporte ? "on" : ""} />
      <input type="hidden" name="aplicaRetencion" value={aplicaRetencion ? "true" : "false"} />

      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <ResumenItem label="Subtotal" value={formatCurrency(fiscal.subtotal)} />
          <ResumenItem label={`IVA trasladado (${formatPercent(ivaPct)})`} value={formatCurrency(fiscal.iva)} />
          {aplicaRetencion && (
            <ResumenItem
              label={`Retención ISR (${formatPercent(retencionIsrPct)})`}
              value={`- ${formatCurrency(fiscal.retencionIsr)}`}
            />
          )}
          <ResumenItem label="Total" value={formatCurrency(fiscal.netoARecibir)} accent />
        </div>

        {aviso && (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-soft">
            ⚠ {aviso}
          </p>
        )}

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {children}
          <Field>
            <FieldLabel>Vigencia (días)</FieldLabel>
            <Input
              type="number"
              step="1"
              min={1}
              value={diasVigencia}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setDiasVigencia(Number(e.target.value) || 1)}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted" title={TOOLTIP_SOLO_TRAMITE}>
            <input
              type="checkbox"
              checked={esSoporte}
              onChange={(e) => setEsSoporte(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
            />
            Solo trámite (no es venta)
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={aplicaRetencion}
            onChange={(e) => setAplicaRetencion(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
          />
          Retención ISR {formatPercent(retencionIsrPct)}
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
        {bloqueo && <p className="text-sm text-danger">{bloqueo}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={pending || sinLineas || !!bloqueo}>
          {pending ? "Creando…" : "Crear cotización"}
        </Button>
      </CardContent>
    </Card>
  );
}
