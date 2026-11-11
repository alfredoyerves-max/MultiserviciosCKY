"use client";

import { ResumenItem } from "@/components/ui/resumen-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/input";
import { calcularTotalesFiscales } from "@/lib/fiscalEngine";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { TipoCliente } from "@/lib/enums";

/**
 * Último paso de ambos wizards (Servicio y Material): vigencia, marca de
 * soporte, totales fiscales y botón de crear. Los totales salen de
 * calcularTotalesFiscales (misma función que usa el servidor al guardar) —
 * ya no se repite la fórmula de IVA/retención en cada wizard. Lo que es
 * propio de cada tipo (ej. el margen de Servicio) entra como `children`.
 */
export function ResumenCotizacionCard({
  titulo,
  children,
  diasVigencia,
  setDiasVigencia,
  esSoporte,
  setEsSoporte,
  subtotal,
  tipoClienteActivo,
  ivaPct,
  retencionIsrPct,
  error,
  pending,
  sinLineas,
}: {
  titulo: string;
  children?: React.ReactNode;
  diasVigencia: number;
  setDiasVigencia: (n: number) => void;
  esSoporte: boolean;
  setEsSoporte: (b: boolean) => void;
  subtotal: number;
  tipoClienteActivo: TipoCliente | null;
  ivaPct: number;
  retencionIsrPct: number;
  error?: string;
  pending: boolean;
  sinLineas: boolean;
}) {
  // Sin cliente elegido todavía no hay retención (solo aplica a Persona Moral).
  const fiscal = calcularTotalesFiscales(subtotal, tipoClienteActivo ?? "PERSONA_FISICA", ivaPct, retencionIsrPct);

  return (
    <>
      <input type="hidden" name="diasVigencia" value={diasVigencia} />
      <input type="hidden" name="esSoporte" value={esSoporte ? "on" : ""} />

      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {children}
            <Field>
              <FieldLabel>Vigencia (días)</FieldLabel>
              <Input
                type="number"
                step="1"
                min={1}
                value={diasVigencia}
                onChange={(e) => setDiasVigencia(Number(e.target.value) || 1)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={esSoporte}
              onChange={(e) => setEsSoporte(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
            />
            Es cotización de soporte (trámite interno del cliente, sin intención real de compra
            — no aparece en el pipeline del kanban por defecto)
          </label>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <ResumenItem label="Subtotal" value={formatCurrency(fiscal.subtotal)} />
            <ResumenItem label={`IVA trasladado (${formatPercent(ivaPct)})`} value={formatCurrency(fiscal.iva)} />
            {tipoClienteActivo === "PERSONA_MORAL" && (
              <ResumenItem
                label={`Retención ISR (${formatPercent(retencionIsrPct)})`}
                value={`- ${formatCurrency(fiscal.retencionIsr)}`}
              />
            )}
            <ResumenItem label="Total" value={formatCurrency(fiscal.netoARecibir)} accent />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={pending || sinLineas}>
              {pending ? "Creando…" : "Crear cotización"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
