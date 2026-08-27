"use client";

import { useActionState, useState } from "react";
import { savePuestoAction, deletePuestoAction } from "./actions";
import { initialFormState } from "./form-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import type { Puesto } from "@/generated/prisma/client";

export function PuestosPanel({ puestos }: { puestos: Puesto[] }) {
  const [editing, setEditing] = useState<Puesto | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Puestos y su sueldo mensual base — se reutilizan entre servicios.
        </p>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            + Nuevo puesto
          </Button>
        )}
      </div>

      {creating && (
        <PuestoForm
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      )}

      <Card>
        <CardContent className="p-0">
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
                    <EmptyState
                      title="Sin puestos todavía."
                      action={
                        !creating && (
                          <Button size="sm" onClick={() => setCreating(true)}>
                            + Nuevo puesto
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              )}
              {puestos.map((p) =>
                editing?.id === p.id ? (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td colSpan={3} className="px-5 py-4">
                      <PuestoForm
                        puesto={p}
                        onDone={() => setEditing(null)}
                        onCancel={() => setEditing(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-text">{p.nombre}</td>
                    <td className="px-5 py-3 font-mono tabular-nums text-text-muted">
                      {formatCurrency(p.sueldoMensual)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (confirm(`¿Eliminar el puesto "${p.nombre}"?`)) {
                              await deletePuestoAction(p.id).catch((e) => alert(e.message));
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
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
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>{puesto ? "Editar puesto" : "Nuevo puesto"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {puesto && <input type="hidden" name="id" value={puesto.id} />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>
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
