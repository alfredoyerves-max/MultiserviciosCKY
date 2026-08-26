"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/input";
import { TIPOS_CLIENTE, TIPO_CLIENTE_LABELS, type TipoCliente } from "@/lib/enums";
import type { Cliente } from "@/generated/prisma/client";

export interface ClienteNuevoState {
  nombreRazonSocial: string;
  rfc: string;
  contacto: string;
  tipoCliente: TipoCliente;
}

/** Paso "1. Cliente", compartido entre el wizard de Servicio y el de
 *  Material — misma UI y lógica en ambos, el estado vive en el wizard que
 *  lo usa (lo necesita para los inputs ocultos del form y para calcular el
 *  tratamiento fiscal). */
export function ClienteStep({
  clientes,
  modoCliente,
  setModoCliente,
  clienteId,
  setClienteId,
  clienteNuevo,
  setClienteNuevo,
  proyecto,
  setProyecto,
}: {
  clientes: Cliente[];
  modoCliente: "existente" | "nuevo";
  setModoCliente: (m: "existente" | "nuevo") => void;
  clienteId: string;
  setClienteId: (id: string) => void;
  clienteNuevo: ClienteNuevoState;
  setClienteNuevo: (updater: (c: ClienteNuevoState) => ClienteNuevoState) => void;
  proyecto: string;
  setProyecto: (p: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Cliente</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {clientes.length > 0 && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={modoCliente === "existente" ? "primary" : "secondary"}
              onClick={() => setModoCliente("existente")}
            >
              Cliente existente
            </Button>
            <Button
              type="button"
              size="sm"
              variant={modoCliente === "nuevo" ? "primary" : "secondary"}
              onClick={() => setModoCliente("nuevo")}
            >
              Cliente nuevo
            </Button>
          </div>
        )}

        {modoCliente === "existente" ? (
          <Field>
            <FieldLabel htmlFor="clienteSelect">Selecciona un cliente</FieldLabel>
            <Select id="clienteSelect" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreRazonSocial} — {TIPO_CLIENTE_LABELS[c.tipoCliente as TipoCliente]}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Nombre / razón social</FieldLabel>
              <Input
                value={clienteNuevo.nombreRazonSocial}
                onChange={(e) => setClienteNuevo((c) => ({ ...c, nombreRazonSocial: e.target.value }))}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Tipo de cliente</FieldLabel>
              <Select
                value={clienteNuevo.tipoCliente}
                onChange={(e) => setClienteNuevo((c) => ({ ...c, tipoCliente: e.target.value as TipoCliente }))}
              >
                {TIPOS_CLIENTE.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_CLIENTE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel>RFC (opcional)</FieldLabel>
              <Input
                value={clienteNuevo.rfc}
                onChange={(e) => setClienteNuevo((c) => ({ ...c, rfc: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Contacto (opcional)</FieldLabel>
              <Input
                value={clienteNuevo.contacto}
                onChange={(e) => setClienteNuevo((c) => ({ ...c, contacto: e.target.value }))}
              />
            </Field>
          </div>
        )}

        <Field>
          <FieldLabel>Proyecto (opcional)</FieldLabel>
          <Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} />
        </Field>
      </CardContent>
    </Card>
  );
}
