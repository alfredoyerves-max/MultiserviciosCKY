"use client";

import { useActionState, useState } from "react";
import {
  addCuentaBancariaAction,
  deleteCuentaBancariaAction,
  toggleCuentaBancariaActivaAction,
  type CuentaBancariaActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CuentaBancaria } from "@/generated/prisma/client";

const initialState: CuentaBancariaActionState = { ok: false };

export function CuentasBancariasPanel({
  cuentas,
  locked,
  fiscalPassword,
}: {
  cuentas: CuentaBancaria[];
  locked: boolean;
  fiscalPassword: string;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-text-dim">Cuentas bancarias</p>
        {!locked && !creating && (
          <Button type="button" size="sm" variant="secondary" onClick={() => setCreating(true)}>
            + Agregar cuenta
          </Button>
        )}
      </div>

      {creating && (
        <CuentaBancariaForm fiscalPassword={fiscalPassword} onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
              <th className="px-4 py-2 font-medium">Banco</th>
              <th className="px-4 py-2 font-medium">CLABE</th>
              <th className="px-4 py-2 font-medium">Cuenta</th>
              <th className="px-4 py-2 font-medium">Titular</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              {!locked && <th className="px-4 py-2 text-right font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {cuentas.length === 0 && (
              <tr>
                <td colSpan={locked ? 5 : 6} className="px-4 py-5 text-center text-text-dim">
                  Sin cuentas bancarias registradas.
                </td>
              </tr>
            )}
            {cuentas.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-text">{c.banco}</td>
                <td className="px-4 py-2 font-mono text-text-muted">{c.clabe}</td>
                <td className="px-4 py-2 text-text-muted">{c.numeroCuenta || "—"}</td>
                <td className="px-4 py-2 text-text-muted">{c.titular}</td>
                <td className="px-4 py-2">
                  <Badge tone={c.activa ? "primary" : "secondary"}>{c.activa ? "Activa" : "Inactiva"}</Badge>
                </td>
                {!locked && (
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleCuentaBancariaActivaAction(c.id, !c.activa, fiscalPassword).catch((e) =>
                            alert(e.message)
                          )
                        }
                      >
                        {c.activa ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`¿Eliminar la cuenta de "${c.banco}"?`)) {
                            deleteCuentaBancariaAction(c.id, fiscalPassword).catch((e) => alert(e.message));
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CuentaBancariaForm({
  fiscalPassword,
  onDone,
  onCancel,
}: {
  fiscalPassword: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: CuentaBancariaActionState, formData: FormData) => {
      const res = await addCuentaBancariaAction(prev, formData);
      if (res.ok) onDone();
      return res;
    },
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-surface-2 p-4">
      <input type="hidden" name="fiscalPassword" value={fiscalPassword} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="banco">Banco</FieldLabel>
          <Input id="banco" name="banco" required />
          <FieldError>{state.fieldErrors?.banco}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="clabe">CLABE (18 dígitos)</FieldLabel>
          <Input id="clabe" name="clabe" inputMode="numeric" maxLength={18} required />
          <FieldError>{state.fieldErrors?.clabe}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="numeroCuenta">Número de cuenta (opcional)</FieldLabel>
          <Input id="numeroCuenta" name="numeroCuenta" />
        </Field>
        <Field>
          <FieldLabel htmlFor="titular">Titular</FieldLabel>
          <Input id="titular" name="titular" required />
          <FieldError>{state.fieldErrors?.titular}</FieldError>
        </Field>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cuenta"}
        </Button>
      </div>
    </form>
  );
}
