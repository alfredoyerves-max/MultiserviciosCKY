"use client";

import { useActionState, useState } from "react";
import {
  setupAction,
  saveDatosEmpresaSetupAction,
  type SetupActionState,
  type DatosEmpresaActionState,
} from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Input, Textarea } from "@/components/ui/input";

const initialSetupState: SetupActionState = { ok: false };
const initialDatosState: DatosEmpresaActionState = { ok: false };

/**
 * Asistente de arranque de un solo uso (Anexo G): paso 1 crea la cuenta,
 * paso 2 captura los datos de la empresa — todo dentro de la misma
 * ventana de "primer arranque", nunca expuesto después como pantalla
 * aparte (una vez que existe una cuenta, /setup redirige a /login).
 */
export function SetupForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");

  if (step === 2) {
    return <DatosEmpresaStep fiscalPassword={password} />;
  }

  return <CuentaStep onCreated={(pwd) => { setPassword(pwd); setStep(2); }} />;
}

function CuentaStep({ onCreated }: { onCreated: (password: string) => void }) {
  const [passwordValue, setPasswordValue] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: SetupActionState, formData: FormData) => {
      const res = await setupAction(prev, formData);
      if (res.ok) onCreated(passwordValue);
      return res;
    },
    initialSetupState
  );

  return (
    <Card>
      <CardContent className="p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="nombre">Nombre (opcional)</FieldLabel>
            <Input id="nombre" name="nombre" autoComplete="name" />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Correo</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="email" required />
            <FieldError>{state.fieldErrors?.email}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
            />
            <FieldError>{state.fieldErrors?.password}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">Confirmar contraseña</FieldLabel>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            <FieldError>{state.fieldErrors?.confirmPassword}</FieldError>
          </Field>

          {state.error && !state.fieldErrors && (
            <p className="text-sm text-danger">{state.error}</p>
          )}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Creando cuenta…" : "Crear cuenta y continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DatosEmpresaStep({ fiscalPassword }: { fiscalPassword: string }) {
  const [state, formAction, pending] = useActionState(saveDatosEmpresaSetupAction, initialDatosState);

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Datos de la empresa</CardTitle>
        <p className="text-xs text-text-dim">
          Se usan en el membrete de las cotizaciones exportadas a Word/PDF. Puedes ajustarlos
          después en Configuración.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="fiscalPassword" value={fiscalPassword} />

          <Field>
            <FieldLabel htmlFor="prestadorNombre">Nombre / razón social</FieldLabel>
            <Input id="prestadorNombre" name="prestadorNombre" required autoFocus />
            <FieldError>{state.fieldErrors?.prestadorNombre}</FieldError>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="prestadorRfc">RFC (opcional)</FieldLabel>
              <Input id="prestadorRfc" name="prestadorRfc" />
            </Field>
            <Field>
              <FieldLabel htmlFor="prestadorRegimenFiscal">Régimen fiscal (opcional)</FieldLabel>
              <Input id="prestadorRegimenFiscal" name="prestadorRegimenFiscal" />
            </Field>
            <Field>
              <FieldLabel htmlFor="prestadorTelefono">Teléfono (opcional)</FieldLabel>
              <Input id="prestadorTelefono" name="prestadorTelefono" />
            </Field>
            <Field>
              <FieldLabel htmlFor="prestadorEmail">Correo (opcional)</FieldLabel>
              <Input id="prestadorEmail" name="prestadorEmail" />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="prestadorDireccion">Dirección (opcional)</FieldLabel>
            <Textarea id="prestadorDireccion" name="prestadorDireccion" />
          </Field>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Guardando…" : "Finalizar y entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
