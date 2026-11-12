"use client";

import { useActionState, useMemo, useState } from "react";
import { saveProductoAction, toggleProductoActivoAction } from "./actions";
import { initialFormState } from "./form-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportMenu } from "@/components/ui/export-menu";
import { Modal } from "@/components/ui/modal";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { Field, FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { UNIDADES_MEDIDA, UNIDAD_MEDIDA_LABELS } from "@/lib/enums";
import { calcularStock } from "@/lib/inventario";
import type { Producto } from "@/generated/prisma/client";

type ProductoConMovimientos = Producto & { movimientos: { tipo: string; cantidad: number }[] };

export function ProductosPanel({ productos }: { productos: ProductoConMovimientos[] }) {
  const [editing, setEditing] = useState<ProductoConMovimientos | null>(null);
  const [creating, setCreating] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Buscador por nombre — caso de uso real: revisar el stock de UN
  // producto puntual parado en la tienda de materiales, sin tener que
  // hacer scroll por todo el catálogo (ver Sección 4, punto "stock").
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q === "") return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const nuevoProducto = (
    <Button size="sm" onClick={() => setCreating(true)}>
      + Nuevo producto
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto por nombre…"
          aria-label="Buscar producto"
          className="h-9 w-full sm:w-72"
        />
        <div className="flex flex-wrap gap-2">
          <ExportMenu
            opciones={[
              { label: "Catálogo de productos", href: "/api/inventario/productos/export" },
              { label: "Movimientos", href: "/api/inventario/movimientos/export" },
            ]}
          />
          {nuevoProducto}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState
            title={productos.length === 0 ? "Sin productos todavía." : "Ningún producto coincide con la búsqueda."}
            action={productos.length === 0 && nuevoProducto}
          />
        </Card>
      ) : (
        <>
          <Card className="hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                    <th className="px-5 py-3 font-medium">Nombre</th>
                    <th className="px-5 py-3 font-medium">Unidad</th>
                    <th className="min-w-36 px-5 py-3 text-right font-medium">Stock</th>
                    <th className="px-5 py-3 text-right font-medium">Costo de compra</th>
                    <th className="px-5 py-3 text-right font-medium">Precio sugerido</th>
                    <th className="px-5 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p) => (
                    <ProductoRow key={p.id} producto={p} onEdit={() => setEditing(p)} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col gap-3 md:hidden">
            {filtrados.map((p) => (
              <ProductoCardMobile key={p.id} producto={p} onEdit={() => setEditing(p)} />
            ))}
          </div>
        </>
      )}

      {(creating || editing) && (
        <ProductoForm
          key={editing?.id ?? "nuevo"}
          producto={editing ?? undefined}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/** "Movimientos" como acción principal visible + ⋯ (Editar, Desactivar / Activar). */
function AccionesProducto({ producto, onEdit }: { producto: ProductoConMovimientos; onEdit: () => void }) {
  const acciones: RowAction[] = [
    { label: "Editar", onSelect: onEdit },
    {
      label: producto.activo ? "Desactivar" : "Activar",
      onSelect: () => toggleProductoActivoAction(producto.id, !producto.activo),
    },
  ];
  return (
    <div className="flex items-center justify-end gap-1">
      <ButtonLink href={`/inventario/${producto.id}`} size="sm" variant="secondary">
        Movimientos
      </ButtonLink>
      <RowActions label={`Más acciones de ${producto.nombre}`} actions={acciones} />
    </div>
  );
}

function ProductoRow({ producto, onEdit }: { producto: ProductoConMovimientos; onEdit: () => void }) {
  const stock = calcularStock(producto.movimientos);
  const unidadLabel = UNIDAD_MEDIDA_LABELS[producto.unidadMedida as keyof typeof UNIDAD_MEDIDA_LABELS];

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="font-medium text-text">{producto.nombre}</p>
          {!producto.activo && <Badge tone="danger">Inactivo</Badge>}
        </div>
        {producto.descripcion && <p className="mt-0.5 text-xs text-text-dim">{producto.descripcion}</p>}
      </td>
      <td className="px-5 py-3">
        <Badge tone="neutral">{unidadLabel}</Badge>
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-right font-mono tabular-nums text-primary">
        {stock <= 0 && <Badge tone="warning" className="mr-2 align-middle">Sin stock</Badge>}
        {stock} {unidadLabel}
      </td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-text-muted">
        {producto.costoCompraReciente != null ? formatCurrency(producto.costoCompraReciente) : "—"}
      </td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-text-muted">
        {producto.precioVentaSugerido != null ? formatCurrency(producto.precioVentaSugerido) : "—"}
      </td>
      <td className="px-5 py-3">
        <AccionesProducto producto={producto} onEdit={onEdit} />
      </td>
    </tr>
  );
}

/** Tarjeta de producto — misma información que ProductoRow, para la vista
 *  apilada de celular (ver ProductosPanel, por debajo de md). El stock va
 *  primero y grande: es el dato que se busca parado en la tienda. */
function ProductoCardMobile({ producto, onEdit }: { producto: ProductoConMovimientos; onEdit: () => void }) {
  const stock = calcularStock(producto.movimientos);
  const unidadLabel = UNIDAD_MEDIDA_LABELS[producto.unidadMedida as keyof typeof UNIDAD_MEDIDA_LABELS];

  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-text">{producto.nombre}</p>
              {!producto.activo && <Badge tone="danger">Inactivo</Badge>}
            </div>
            {producto.descripcion && <p className="mt-0.5 text-xs text-text-dim">{producto.descripcion}</p>}
          </div>
          <Badge tone="neutral" className="shrink-0">
            {unidadLabel}
          </Badge>
        </div>

        <p className="whitespace-nowrap font-mono text-2xl font-semibold tabular-nums text-primary">
          {stock} <span className="text-sm font-normal text-text-dim">{unidadLabel}</span>
          {stock <= 0 && <Badge tone="warning" className="ml-2 align-middle">Sin stock</Badge>}
        </p>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt className="text-text-dim">Costo de compra</dt>
          <dd className="text-right font-mono tabular-nums text-text-muted">
            {producto.costoCompraReciente != null ? formatCurrency(producto.costoCompraReciente) : "—"}
          </dd>
          <dt className="text-text-dim">Precio sugerido</dt>
          <dd className="text-right font-mono tabular-nums text-text-muted">
            {producto.precioVentaSugerido != null ? formatCurrency(producto.precioVentaSugerido) : "—"}
          </dd>
        </dl>

        <div className="flex justify-end border-t border-border pt-2.5">
          <AccionesProducto producto={producto} onEdit={onEdit} />
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
    <Modal onClose={onCancel} size="md">
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-semibold text-primary">{producto ? "Editar producto" : "Nuevo producto"}</h3>
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

        <Field>
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
    </Modal>
  );
}
