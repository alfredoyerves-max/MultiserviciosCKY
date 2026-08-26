"use client";

import { useActionState, useState } from "react";
import { saveProductoAction, toggleProductoActivoAction } from "./actions";
import { initialFormState } from "./form-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { UNIDADES_MEDIDA, UNIDAD_MEDIDA_LABELS } from "@/lib/enums";
import { calcularStock } from "@/lib/inventario";
import type { Producto } from "@/generated/prisma/client";

type ProductoConMovimientos = Producto & { movimientos: { tipo: string; cantidad: number }[] };

export function ProductosPanel({ productos }: { productos: ProductoConMovimientos[] }) {
  const [editing, setEditing] = useState<ProductoConMovimientos | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Catálogo de productos y stock actual.</p>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            + Nuevo producto
          </Button>
        )}
      </div>

      {creating && <ProductoForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />}

      <div className="flex flex-col gap-3">
        {productos.length === 0 && (
          <Card className="p-6 text-center text-sm text-text-dim">Sin productos todavía.</Card>
        )}
        {productos.map((p) =>
          editing?.id === p.id ? (
            <ProductoForm
              key={p.id}
              producto={p}
              onDone={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <ProductoRow key={p.id} producto={p} onEdit={() => setEditing(p)} />
          )
        )}
      </div>
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

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-text">{producto.nombre}</h4>
            <Badge tone="primary">{UNIDAD_MEDIDA_LABELS[producto.unidadMedida as keyof typeof UNIDAD_MEDIDA_LABELS]}</Badge>
            {!producto.activo && <Badge tone="danger">Inactivo</Badge>}
          </div>
          {producto.descripcion && (
            <p className="mt-1 text-sm text-text-dim">{producto.descripcion}</p>
          )}
          <p className="mt-2 text-xs text-text-muted">
            {producto.costoCompraReciente != null && (
              <>Último costo de compra: {formatCurrency(producto.costoCompraReciente)}</>
            )}
            {producto.precioVentaSugerido != null && (
              <>
                {producto.costoCompraReciente != null && " · "}
                Precio de venta sugerido: {formatCurrency(producto.precioVentaSugerido)}
              </>
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-text-dim">Stock actual</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-primary">
            {stock} {UNIDAD_MEDIDA_LABELS[producto.unidadMedida as keyof typeof UNIDAD_MEDIDA_LABELS]}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <ButtonLink href={`/inventario/${producto.id}`} size="sm" variant="secondary">
            Ver movimientos
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
      </CardContent>
    </Card>
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
