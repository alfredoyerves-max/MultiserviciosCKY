"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/input";

const initialState: LoginActionState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card>
      <CardContent className="p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="email">Correo</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
