"use client";

import { useActionState } from "react";
import { setupAction, type SetupActionState } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Input } from "@/components/ui/input";

const initialState: SetupActionState = { ok: false };

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupAction, initialState);

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
            {pending ? "Creando cuenta…" : "Crear cuenta y entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
