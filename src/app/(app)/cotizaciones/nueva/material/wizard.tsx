"use client";

import { useActionState, useMemo, useState } from "react";
import { createCotizacionMaterialAction, type CotizacionActionState } from "../../actions";
import { ClienteStep, ClienteHiddenFields, useClienteCotizacion } from "../cliente-step";
import { ResumenCotizacionCard } from "../resumen-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { UNIDADES_MEDIDA, UNIDAD_MEDIDA_LABELS, type UnidadMedida } from "@/lib/enums";
import type { Cliente, Producto } from "@/generated/prisma/client";

/** Valor del selector de atajo cuando la línea se captura libre. */
const SIN_PRODUCTO = "_none_";

interface LineaState {
  key: string;
  /** Atajo opcional al catálogo; "" = captura libre. */
  productoId: string;
  claveSat: string;
  descripcion: string;
  unidadMedida: UnidadMedida;
  cantidad: number;
  precioUnitario: number;
}

const initialState: CotizacionActionState = { ok: false };

function lineaVacia(): LineaState {
  return {
    key: crypto.randomUUID(),
    productoId: "",
    claveSat: "",
    descripcion: "",
    unidadMedida: "PIEZA",
    cantidad: 1,
    precioUnitario: 0,
  };
}

export function Wizard({
  productos,
  clientes,
  ivaPct,
  retencionIsrPct,
}: {
  productos: Producto[];
  clientes: Cliente[];
  ivaPct: number;
  retencionIsrPct: number;
}) {
  const { estado: cliente, tipoClienteActivo } = useClienteCotizacion(clientes);
  const [diasVigencia, setDiasVigencia] = useState(15);
  const [esSoporte, setEsSoporte] = useState(false);
  const [lineas, setLineas] = useState<LineaState[]>(() => [lineaVacia()]);

  const productoById = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const lineasCalculadas = lineas.map((l) => {
    const importe = l.cantidad * l.precioUnitario;
    return { ...l, importe };
  });

  const subtotal = lineasCalculadas.reduce((sum, l) => sum + l.importe, 0);

  const [state, formAction, pending] = useActionState(createCotizacionMaterialAction, initialState);

  function addLinea() {
    setLineas((prev) => [...prev, lineaVacia()]);
  }

  // Atajo: precarga descripción/unidad/precio desde el producto elegido.
  // Todo sigue siendo editable y nada se valida contra el inventario.
  function elegirProducto(key: string, productoId: string) {
    const producto = productoById.get(productoId);
    if (!producto) {
      updateLinea(key, { productoId: "" });
      return;
    }
    updateLinea(key, {
      productoId,
      descripcion: producto.nombre,
      unidadMedida: producto.unidadMedida as UnidadMedida,
      precioUnitario: producto.precioVentaSugerido ?? 0,
    });
  }

  function updateLinea(key: string, patch: Partial<LineaState>) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
      <input
        type="hidden"
        name="lineasMaterialJson"
        value={JSON.stringify(lineas.map(({ productoId, claveSat, descripcion, unidadMedida, cantidad, precioUnitario }) => ({ productoId, claveSat, descripcion, unidadMedida, cantidad, precioUnitario })))}
      />
      <ClienteHiddenFields estado={cliente} />

      <div className="flex flex-col gap-6">
      <ClienteStep clientes={clientes} {...cliente} />

      <Card>
        <CardHeader className="items-start justify-between">
          <CardTitle>Materiales</CardTitle>
          <Button type="button" size="sm" onClick={addLinea}>
            + Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lineasCalculadas.map((l) => (
            <div key={l.key} className="flex flex-col gap-3 rounded-lg border border-border-strong bg-surface-2 p-3">
              {productos.length > 0 && (
                <Field>
                  <FieldLabel>Precargar desde producto guardado (opcional)</FieldLabel>
                  <Select
                    value={l.productoId || SIN_PRODUCTO}
                    onChange={(e) =>
                      e.target.value === SIN_PRODUCTO
                        ? updateLinea(l.key, { productoId: "" })
                        : elegirProducto(l.key, e.target.value)
                    }
                  >
                    <option value={SIN_PRODUCTO}>— Captura libre —</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({UNIDAD_MEDIDA_LABELS[p.unidadMedida as UnidadMedida]})
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1.2fr_3fr_1fr_1fr_1fr_1fr_auto]">
                <Field>
                  <FieldLabel>Clave SAT</FieldLabel>
                  <Input
                    value={l.claveSat}
                    maxLength={20}
                    onChange={(e) => updateLinea(l.key, { claveSat: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Descripción</FieldLabel>
                  <Input
                    value={l.descripcion}
                    onChange={(e) => updateLinea(l.key, { descripcion: e.target.value })}
                    placeholder="Ej. Papel higiénico jumbo"
                  />
                </Field>
                <Field>
                  <FieldLabel>Unidad</FieldLabel>
                  <Select
                    value={l.unidadMedida}
                    onChange={(e) => updateLinea(l.key, { unidadMedida: e.target.value as UnidadMedida })}
                  >
                    {UNIDADES_MEDIDA.map((u) => (
                      <option key={u} value={u}>
                        {UNIDAD_MEDIDA_LABELS[u]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Cantidad</FieldLabel>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={l.cantidad}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => updateLinea(l.key, { cantidad: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Precio unitario</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.precioUnitario}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => updateLinea(l.key, { precioUnitario: Number(e.target.value) || 0 })}
                  />
                </Field>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-dim">Importe</p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                    {formatCurrency(l.importe)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeLinea(l.key)}
                  disabled={lineas.length === 1}
                >
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </div>

      <ResumenCotizacionCard
        titulo="Resumen"
        diasVigencia={diasVigencia}
        setDiasVigencia={setDiasVigencia}
        esSoporte={esSoporte}
        setEsSoporte={setEsSoporte}
        subtotal={subtotal}
        tipoClienteActivo={tipoClienteActivo}
        ivaPct={ivaPct}
        retencionIsrPct={retencionIsrPct}
        error={state.error}
        pending={pending}
        sinLineas={lineas.length === 0}
      />
    </form>
  );
}
