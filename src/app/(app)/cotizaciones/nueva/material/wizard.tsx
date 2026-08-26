"use client";

import { useActionState, useMemo, useState } from "react";
import { createCotizacionMaterialAction, type CotizacionActionState } from "../../actions";
import { ClienteStep, type ClienteNuevoState } from "../cliente-step";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, Input, Select } from "@/components/ui/input";
import { formatCurrency, formatPercent } from "@/lib/format";
import { UNIDAD_MEDIDA_LABELS, type TipoCliente, type UnidadMedida } from "@/lib/enums";
import { calcularStock } from "@/lib/inventario";
import type { Cliente, Producto } from "@/generated/prisma/client";

export interface ProductoOption extends Producto {
  movimientos: { tipo: string; cantidad: number }[];
}

interface LineaState {
  key: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

const initialState: CotizacionActionState = { ok: false };

function lineaInicial(productos: ProductoOption[]): LineaState[] {
  if (productos.length === 0) return [];
  return [
    {
      key: crypto.randomUUID(),
      productoId: productos[0].id,
      cantidad: 1,
      precioUnitario: productos[0].precioVentaSugerido ?? 0,
    },
  ];
}

export function Wizard({
  productos,
  clientes,
  ivaPct,
  retencionIsrPct,
}: {
  productos: ProductoOption[];
  clientes: Cliente[];
  ivaPct: number;
  retencionIsrPct: number;
}) {
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">(
    clientes.length > 0 ? "existente" : "nuevo"
  );
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [clienteNuevo, setClienteNuevo] = useState<ClienteNuevoState>({
    nombreRazonSocial: "",
    rfc: "",
    contacto: "",
    tipoCliente: "PERSONA_MORAL",
  });
  const [proyecto, setProyecto] = useState("");
  const [diasVigencia, setDiasVigencia] = useState(15);
  const [esSoporte, setEsSoporte] = useState(false);
  const [lineas, setLineas] = useState<LineaState[]>(() => lineaInicial(productos));

  const productoById = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const stockPorProducto = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of productos) m.set(p.id, calcularStock(p.movimientos));
    return m;
  }, [productos]);

  // Cantidad total solicitada por producto a través de todas las líneas —
  // así la advertencia es correcta aunque el mismo producto aparezca en
  // más de una línea (mismo criterio que la validación del servidor al
  // aceptar, ver confirmarAceptacionMaterial).
  const cantidadSolicitadaPorProducto = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lineas) m.set(l.productoId, (m.get(l.productoId) ?? 0) + (l.cantidad || 0));
    return m;
  }, [lineas]);

  const tipoClienteActivo: TipoCliente | null =
    modoCliente === "existente"
      ? ((clientes.find((c) => c.id === clienteId)?.tipoCliente as TipoCliente) ?? null)
      : clienteNuevo.tipoCliente;

  const lineasCalculadas = lineas.map((l) => {
    const producto = productoById.get(l.productoId);
    const importe = l.cantidad * l.precioUnitario;
    return { ...l, producto, importe };
  });

  const subtotal = lineasCalculadas.reduce((sum, l) => sum + l.importe, 0);
  const iva = subtotal * ivaPct;
  const totalAPagar = subtotal + iva;
  const retencionIsr = tipoClienteActivo === "PERSONA_MORAL" ? subtotal * retencionIsrPct : 0;
  const netoARecibir = totalAPagar - retencionIsr;

  const [state, formAction, pending] = useActionState(createCotizacionMaterialAction, initialState);

  function addLinea() {
    if (productos.length === 0) return;
    setLineas((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productoId: productos[0].id,
        cantidad: 1,
        precioUnitario: productos[0].precioVentaSugerido ?? 0,
      },
    ]);
  }

  function updateLinea(key: string, patch: Partial<LineaState>) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  if (productos.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
        No hay productos activos en el catálogo. Da de alta al menos uno en{" "}
        <span className="text-primary">Inventario y Activos</span> antes de crear una cotización
        de material.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input
        type="hidden"
        name="lineasMaterialJson"
        value={JSON.stringify(lineas.map(({ productoId, cantidad, precioUnitario }) => ({ productoId, cantidad, precioUnitario })))}
      />
      <input
        type="hidden"
        name="clienteNuevoJson"
        value={modoCliente === "nuevo" ? JSON.stringify(clienteNuevo) : ""}
      />
      {modoCliente === "existente" && <input type="hidden" name="clienteId" value={clienteId} />}
      <input type="hidden" name="proyecto" value={proyecto} />
      <input type="hidden" name="diasVigencia" value={diasVigencia} />
      <input type="hidden" name="esSoporte" value={esSoporte ? "on" : ""} />

      <ClienteStep
        clientes={clientes}
        modoCliente={modoCliente}
        setModoCliente={setModoCliente}
        clienteId={clienteId}
        setClienteId={setClienteId}
        clienteNuevo={clienteNuevo}
        setClienteNuevo={setClienteNuevo}
        proyecto={proyecto}
        setProyecto={setProyecto}
      />

      <Card>
        <CardHeader className="items-start justify-between">
          <CardTitle>2. Productos</CardTitle>
          <Button type="button" size="sm" onClick={addLinea}>
            + Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lineasCalculadas.map((l) => {
            const producto = l.producto;
            const unidadLabel = producto ? UNIDAD_MEDIDA_LABELS[producto.unidadMedida as UnidadMedida] : "";
            const stock = producto ? (stockPorProducto.get(producto.id) ?? 0) : 0;
            const solicitado = producto ? (cantidadSolicitadaPorProducto.get(producto.id) ?? 0) : 0;
            const excedeStock = solicitado > stock;
            return (
              <div key={l.key} className="flex flex-col gap-2 rounded-lg border border-border-strong bg-surface-2 p-3">
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                  <Field>
                    <FieldLabel>Producto</FieldLabel>
                    <Select
                      value={l.productoId}
                      onChange={(e) => {
                        const nuevo = productoById.get(e.target.value);
                        updateLinea(l.key, {
                          productoId: e.target.value,
                          precioUnitario: nuevo?.precioVentaSugerido ?? 0,
                        });
                      }}
                    >
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({UNIDAD_MEDIDA_LABELS[p.unidadMedida as UnidadMedida]})
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
                <p className="flex items-center gap-2 text-xs text-text-dim">
                  Stock actual: {stock} {unidadLabel}
                  {excedeStock && (
                    <Badge tone="warning">Cantidad solicitada excede el stock disponible</Badge>
                  )}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Resumen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field className="max-w-xs">
            <FieldLabel>Vigencia (días)</FieldLabel>
            <Input
              type="number"
              step="1"
              min={1}
              value={diasVigencia}
              onChange={(e) => setDiasVigencia(Number(e.target.value) || 1)}
            />
          </Field>

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
            <Resumen label="Subtotal" value={formatCurrency(subtotal)} />
            <Resumen label={`IVA trasladado (${formatPercent(ivaPct)})`} value={formatCurrency(iva)} />
            {tipoClienteActivo === "PERSONA_MORAL" && (
              <Resumen
                label={`Retención ISR (${formatPercent(retencionIsrPct)})`}
                value={`- ${formatCurrency(retencionIsr)}`}
              />
            )}
            <Resumen label="Total" value={formatCurrency(netoARecibir)} accent />
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={pending || lineas.length === 0}>
              {pending ? "Creando…" : "Crear cotización"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function Resumen({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-dim">{label}</p>
      <p className={`font-mono text-lg font-semibold tabular-nums ${accent ? "text-primary" : "text-text"}`}>
        {value}
      </p>
    </div>
  );
}
