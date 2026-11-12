"use client";

import { useActionState, useState } from "react";
import { savePuestoAction, deletePuestoAction } from "./actions";
import { initialFormState } from "./form-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { RowActions } from "@/components/ui/row-actions";
import { SidePanel } from "@/components/ui/side-panel";
import { formatCurrency } from "@/lib/format";
import type { Puesto } from "@/generated/prisma/client";

export function PuestosPanel({ puestos }: { puestos: Puesto[] }) {
  const [editing, setEditing] = useState<Puesto | null>(null);
  const [creating, setCreating] = useState(false);

  const nuevoPuesto = (
    <Button size="sm" onClick={() => setCreating(true)}>
      + Nuevo puesto
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          Puestos y su sueldo mensual base — se reutilizan entre servicios.
        </p>
        {nuevoPuesto}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                <th className="px-5 py-3 font-medium">Puesto</th>
                <th className="px-5 py-3 font-medium">Sueldo mensual</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {puestos.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <EmptyState title="Sin puestos todavía." action={nuevoPuesto} />
                  </td>
                </tr>
              )}
              {puestos.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-text">{p.nombre}</td>
                  <td className="px-5 py-3 font-mono tabular-nums text-text-muted">
                    {formatCurrency(p.sueldoMensual)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
                        Editar
                      </Button>
                      <RowActions
                        label={`Más acciones de ${p.nombre}`}
                        actions={[
                          {
                            label: "Eliminar",
                            danger: true,
                            onSelect: async () => {
                              if (confirm(`¿Eliminar el puesto "${p.nombre}"?`)) {
                                await deletePuestoAction(p.id).catch((e) => alert(e.message));
                              }
                            },
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {(creating || editing) && (
        <PuestoForm
          key={editing?.id ?? "nuevo"}
          puesto={editing ?? undefined}
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

function PuestoForm({
  puesto,
  onDone,
  onCancel,
}: {
  puesto?: Puesto;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialFormState, formData: FormData) => {
      const res = await savePuestoAction(prev, formData);
      if (res.ok) onDone();
      return res;
    },
    initialFormState
  );

  return (
    <SidePanel
      title={puesto ? "Editar puesto" : "Nuevo puesto"}
      onClose={onCancel}
      footer={(solicitarCierre) => (
        <>
          <Button type="button" variant="ghost" onClick={solicitarCierre}>
            Cancelar
          </Button>
          <Button type="submit" form="puesto-form" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </>
      )}
    >
      <form id="puesto-form" action={formAction} className="flex flex-col gap-4">
        {puesto && <input type="hidden" name="id" value={puesto.id} />}
        <Field>
          <FieldLabel htmlFor="nombre">Nombre del puesto</FieldLabel>
          <Input id="nombre" name="nombre" defaultValue={puesto?.nombre} required />
          <FieldError>{state.fieldErrors?.nombre}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="sueldoMensual">Sueldo mensual ($)</FieldLabel>
          <Input
            id="sueldoMensual"
            name="sueldoMensual"
            type="number"
            step="0.01"
            defaultValue={puesto?.sueldoMensual}
            required
          />
          <FieldError>{state.fieldErrors?.sueldoMensual}</FieldError>
        </Field>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
      </form>
    </SidePanel>
  );
}
