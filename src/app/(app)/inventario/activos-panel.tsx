"use client";

import { useActionState, useMemo, useState } from "react";
import { saveActivoAction } from "./actions";
import { initialFormState } from "./form-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const ESTADO_TONE: Record<EstadoActivo, "success" | "warning" | "neutral"> = {
  FUNCIONAL: "success",
  EN_REPARACION: "warning",
  DADO_DE_BAJA: "neutral",
};

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

      <div className="flex flex-col gap-3">
        {activosFiltrados.length === 0 && (
          <Card className="p-6 text-center text-sm text-text-dim">
            {activos.length === 0 ? "Sin activos todavía." : "Ningún activo coincide con el filtro."}
          </Card>
        )}
        {activosFiltrados.map((a) =>
          editing?.id === a.id ? (
            <ActivoForm key={a.id} activo={a} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
          ) : (
            <ActivoRow key={a.id} activo={a} onEdit={() => setEditing(a)} />
          )
        )}
      </div>
    </div>
  );
}

function ActivoRow({ activo, onEdit }: { activo: Activo; onEdit: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-text">{activo.nombre}</h4>
            <Badge tone="primary">{ACTIVO_CATEGORIA_LABELS[activo.categoria as ActivoCategoria]}</Badge>
            <Badge tone={ESTADO_TONE[activo.estado as EstadoActivo]}>
              {ESTADO_ACTIVO_LABELS[activo.estado as EstadoActivo]}
            </Badge>
          </div>
          {activo.descripcion && <p className="mt-1 text-sm text-text-dim">{activo.descripcion}</p>}
          <p className="mt-2 text-xs text-text-muted">
            Adquirido {formatDate(activo.fechaAdquisicion)}
            {activo.notas && <> · {activo.notas}</>}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-text-dim">Valor de adquisición</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-primary">
            {formatCurrency(activo.valorAdquisicion)}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <Field>
              <FieldLabel htmlFor="estado">Estado</FieldLabel>
              <Select id="estado" name="estado" defaultValue={activo?.estado ?? "FUNCIONAL"} required>
                {ESTADOS_ACTIVO.map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_ACTIVO_LABELS[e]}
                  </option>
                ))}
              </Select>
              <FieldError>{state.fieldErrors?.estado}</FieldError>
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
