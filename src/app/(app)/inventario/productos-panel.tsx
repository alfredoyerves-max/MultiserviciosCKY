"use client";

import { useActionState, useState } from "react";
import { saveProductoAction, toggleProductoActivoAction } from "./actions";
import { initialFormState } from "./form-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnchorButton, Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { UNIDADES_MEDIDA, UNIDAD_MEDIDA_LABELS } from "@/lib/enums";
import { calcularStock } from "@/lib/inventario";
import type { Producto } from "@/generated/prisma/client";

type ProductoConMovimientos = Producto & { movimientos: { tipo: string; cantidad: number }[] };

const COLS = 7;

export function ProductosPanel({ productos }: { productos: ProductoConMovimientos[] }) {
  const [editing, setEditing] = useState<ProductoConMovimientos | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Catálogo de productos y stock actual.</p>
        <div className="flex gap-2">
          <AnchorButton href="/api/inventario/productos/export" download>
            Exportar catálogo
          </AnchorButton>
          <AnchorButton href="/api/inventario/movimientos/export" download>
            Exportar movimientos
          </AnchorButton>
          {!creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              + Nuevo producto
            </Button>
          )}
        </div>
      </div>

      {creating && <ProductoForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Unidad</th>
                <th className="px-5 py-3 text-right font-medium">Stock</th>
                <th className="px-5 py-3 text-right font-medium">Costo de compra</th>
                <th className="px-5 py-3 text-right font-medium">Precio sugerido</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 && (
                <tr>
                  <td colSpan={COLS}>
                    <EmptyState
                      title="Sin productos todavía."
                      action={
                        !creating && (
                          <Button size="sm" onClick={() => setCreating(true)}>
                            + Nuevo producto
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              )}
              {productos.map((p) =>
                editing?.id === p.id ? (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td colSpan={COLS} className="p-4">
                      <ProductoForm producto={p} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
                    </td>
                  </tr>
                ) : (
                  <ProductoRow key={p.id} producto={p} onEdit={() => setEditing(p)} />
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ProductoRow({
  producto,
  onEdit,
}: {
  producto: ProductoConMovimientos;
  onEdit: () => void;
}) {
  const stock = calcularStock(producto.movimientos);
  const unidadLabel = UNIDAD_MEDIDA_LABELS[producto.unidadMedida as keyof typeof UNIDAD_MEDIDA_LABELS];

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3">
        <p className="font-medium text-text">{producto.nombre}</p>
        {producto.descripcion && <p className="mt-0.5 text-xs text-text-dim">{producto.descripcion}</p>}
      </td>
      <td className="px-5 py-3">
        <Badge tone="neutral">{unidadLabel}</Badge>
      </td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-primary">
        {stock} {unidadLabel}
      </td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-text-muted">
        {producto.costoCompraReciente != null ? formatCurrency(producto.costoCompraReciente) : "—"}
      </td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-text-muted">
        {producto.precioVentaSugerido != null ? formatCurrency(producto.precioVentaSugerido) : "—"}
      </td>
      <td className="px-5 py-3">{!producto.activo && <Badge tone="danger">Inactivo</Badge>}</td>
      <td className="px-5 py-3 text-right">
        <div className="flex justify-end gap-2">
          <ButtonLink href={`/inventario/${producto.id}`} size="sm" variant="secondary">
            Movimientos
          </ButtonLink>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleProductoActivoAction(producto.id, !producto.activo)}
          >
            {producto.activo ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ProductoForm({
  producto,
  onDone,
  onCancel,
}: {
  producto?: ProductoConMovimientos;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialFormState, formData: FormData) => {
      const res = await saveProductoAction(prev, formData);
      if (res.ok) onDone();
      return res;
    },
    initialFormState
  );

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>{producto ? "Editar producto" : "Nuevo producto"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {producto && <input type="hidden" name="id" value={producto.id} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
              <Input id="nombre" name="nombre" defaultValue={producto?.nombre} required />
              <FieldError>{state.fieldErrors?.nombre}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="unidadMedida">Unidad de medida</FieldLabel>
              <Select id="unidadMedida" name="unidadMedida" defaultValue={producto?.unidadMedida} required>
                {UNIDADES_MEDIDA.map((u) => (
                  <option key={u} value={u}>
                    {UNIDAD_MEDIDA_LABELS[u]}
                  </option>
                ))}
              </Select>
              <FieldError>{state.fieldErrors?.unidadMedida}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="descripcion">Descripción (opcional)</FieldLabel>
            <Textarea id="descripcion" name="descripcion" defaultValue={producto?.descripcion ?? ""} />
          </Field>

          <Field className="max-w-xs">
            <FieldLabel htmlFor="precioVentaSugerido">Precio de venta sugerido ($, opcional)</FieldLabel>
            <Input
              id="precioVentaSugerido"
              name="precioVentaSugerido"
              type="number"
              step="0.01"
              min={0}
              defaultValue={producto?.precioVentaSugerido ?? ""}
            />
            <FieldError>{state.fieldErrors?.precioVentaSugerido}</FieldError>
          </Field>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
