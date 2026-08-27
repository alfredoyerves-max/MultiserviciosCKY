"use client";

import { useActionState, useMemo, useState } from "react";
import { saveActivoAction } from "./actions";
import { initialFormState } from "./form-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ACTIVO_CATEGORIAS,
  ACTIVO_CATEGORIA_LABELS,
  ESTADOS_ACTIVO,
  ESTADO_ACTIVO_LABELS,
  type ActivoCategoria,
  type EstadoActivo,
} from "@/lib/enums";
import type { Activo } from "@/generated/prisma/client";
import Link from "next/link";

const ESTADO_TONE: Record<EstadoActivo, "success" | "warning" | "neutral"> = {
  FUNCIONAL: "success",
  EN_REPARACION: "warning",
  DADO_DE_BAJA: "neutral",
};

const COLS = 7;

export function ActivosPanel({ activos }: { activos: Activo[] }) {
  const [editing, setEditing] = useState<Activo | null>(null);
  const [creating, setCreating] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<ActivoCategoria | "TODAS">("TODAS");
  const [filtroEstado, setFiltroEstado] = useState<EstadoActivo | "TODOS">("TODOS");

  const activosFiltrados = useMemo(
    () =>
      activos.filter((a) => {
        if (filtroCategoria !== "TODAS" && a.categoria !== filtroCategoria) return false;
        if (filtroEstado !== "TODOS" && a.estado !== filtroEstado) return false;
        return true;
      }),
    [activos, filtroCategoria, filtroEstado]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            className="h-9 w-auto"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value as ActivoCategoria | "TODAS")}
          >
            <option value="TODAS">Todas las categorías</option>
            {ACTIVO_CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {ACTIVO_CATEGORIA_LABELS[c]}
              </option>
            ))}
          </Select>
          <Select
            className="h-9 w-auto"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoActivo | "TODOS")}
          >
            <option value="TODOS">Todos los estados</option>
            {ESTADOS_ACTIVO.map((e) => (
              <option key={e} value={e}>
                {ESTADO_ACTIVO_LABELS[e]}
              </option>
            ))}
          </Select>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            + Nuevo activo
          </Button>
        )}
      </div>

      {creating && <ActivoForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Categoría</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Valor de adquisición</th>
                <th className="px-5 py-3 font-medium">Adquirido</th>
                <th className="px-5 py-3 font-medium">Proveedor</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {activosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={COLS}>
                    {activos.length === 0 ? (
                      <EmptyState
                        title="Sin activos todavía."
                        action={
                          !creating && (
                            <Button size="sm" onClick={() => setCreating(true)}>
                              + Nuevo activo
                            </Button>
                          )
                        }
                      />
                    ) : (
                      <EmptyState title="Ningún activo coincide con el filtro." />
                    )}
                  </td>
                </tr>
              )}
              {activosFiltrados.map((a) =>
                editing?.id === a.id ? (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td colSpan={COLS} className="p-4">
                      <ActivoForm activo={a} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
                    </td>
                  </tr>
                ) : (
                  <ActivoRow key={a.id} activo={a} onEdit={() => setEditing(a)} />
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ActivoRow({ activo, onEdit }: { activo: Activo; onEdit: () => void }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3">
        <Link href={`/inventario/activos/${activo.id}`} className="font-medium text-primary hover:underline">
          {activo.nombre}
        </Link>
        {activo.descripcion && <p className="mt-0.5 text-xs text-text-dim">{activo.descripcion}</p>}
      </td>
      <td className="px-5 py-3">
        <Badge tone="neutral">{ACTIVO_CATEGORIA_LABELS[activo.categoria as ActivoCategoria]}</Badge>
      </td>
      <td className="px-5 py-3">
        <Badge tone={ESTADO_TONE[activo.estado as EstadoActivo]}>
          {ESTADO_ACTIVO_LABELS[activo.estado as EstadoActivo]}
        </Badge>
      </td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-text">
        {formatCurrency(activo.valorAdquisicion)}
      </td>
      <td className="px-5 py-3 text-text-muted">{formatDate(activo.fechaAdquisicion)}</td>
      <td className="px-5 py-3 text-text-muted">{activo.proveedor || "—"}</td>
      <td className="px-5 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link
            href={`/inventario/activos/${activo.id}`}
            className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            Historial
          </Link>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ActivoForm({
  activo,
  onDone,
  onCancel,
}: {
  activo?: Activo;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialFormState, formData: FormData) => {
      const res = await saveActivoAction(prev, formData);
      if (res.ok) onDone();
      return res;
    },
    initialFormState
  );

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>{activo ? "Editar activo" : "Nuevo activo"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {activo && <input type="hidden" name="id" value={activo.id} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
              <Input id="nombre" name="nombre" defaultValue={activo?.nombre} required />
              <FieldError>{state.fieldErrors?.nombre}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="categoria">Categoría</FieldLabel>
              <Select id="categoria" name="categoria" defaultValue={activo?.categoria} required>
                {ACTIVO_CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {ACTIVO_CATEGORIA_LABELS[c]}
                  </option>
                ))}
              </Select>
              <FieldError>{state.fieldErrors?.categoria}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="descripcion">Descripción (opcional)</FieldLabel>
            <Textarea id="descripcion" name="descripcion" defaultValue={activo?.descripcion ?? ""} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fechaAdquisicion">Fecha de adquisición</FieldLabel>
              <Input
                id="fechaAdquisicion"
                name="fechaAdquisicion"
                type="date"
                defaultValue={activo ? new Date(activo.fechaAdquisicion).toISOString().slice(0, 10) : ""}
                required
              />
              <FieldError>{state.fieldErrors?.fechaAdquisicion}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="valorAdquisicion">Valor de adquisición ($)</FieldLabel>
              <Input
                id="valorAdquisicion"
                name="valorAdquisicion"
                type="number"
                step="0.01"
                min={0}
                defaultValue={activo?.valorAdquisicion ?? ""}
                required
              />
              <FieldError>{state.fieldErrors?.valorAdquisicion}</FieldError>
            </Field>
          </div>

          {activo && (
            <p className="text-xs text-text-dim">
              El estado (Funcional / En reparación / Dado de baja) se cambia desde el detalle del
              activo, no aquí — así queda siempre en su historial.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="proveedor">Proveedor (opcional)</FieldLabel>
              <Input id="proveedor" name="proveedor" defaultValue={activo?.proveedor ?? ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor="numeroFactura">Número de factura (opcional)</FieldLabel>
              <Input id="numeroFactura" name="numeroFactura" defaultValue={activo?.numeroFactura ?? ""} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="notas">Notas / ubicación (opcional)</FieldLabel>
            <Textarea
              id="notas"
              name="notas"
              placeholder='Ej. "En bodega principal", "Vehículo placa XYZ-123"'
              defaultValue={activo?.notas ?? ""}
            />
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
