"use client";

import { retencionInicial } from "@/lib/retencion";
import { analizarRfc, normalizarRfc, tipoClienteEfectivo, tiposPermitidosPorRfc, textoTipoDeducido, MENSAJE_TIPO_CLIENTE } from "@/lib/rfc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/input";
import { TIPOS_CLIENTE, TIPO_CLIENTE_LABELS, type TipoCliente } from "@/lib/enums";
import type { Cliente } from "@/generated/prisma/client";

export interface ClienteNuevoState {
  nombreRazonSocial: string;
  rfc: string;
  contacto: string;
  /** Elegido a mano; "" = sin elegir. Si el RFC es válido, el tipo efectivo sale del RFC y este valor no cuenta. */
  tipoCliente: TipoCliente | "";
}

/** Motivo por el que el cliente nuevo todavía no se puede guardar (null = todo bien). */
export function errorClienteNuevo(c: ClienteNuevoState): string | null {
  const a = analizarRfc(c.rfc);
  if (a.estado === "invalido") return a.error;
  if (tipoClienteEfectivo(c.rfc, c.tipoCliente) === "") return MENSAJE_TIPO_CLIENTE;
  return null;
}

/** Estado del paso "1. Cliente" — idéntico en los wizards de Servicio y
 *  Material, por eso vive aquí una sola vez. */
export interface ClienteEstado {
  modoCliente: "existente" | "nuevo";
  setModoCliente: (m: "existente" | "nuevo") => void;
  clienteId: string;
  setClienteId: (id: string) => void;
  clienteNuevo: ClienteNuevoState;
  setClienteNuevo: (updater: (c: ClienteNuevoState) => ClienteNuevoState) => void;
  proyecto: string;
  setProyecto: (p: string) => void;
  /** Cliente nuevo con RFC inválido o sin tipo: la cotización no se puede crear. */
  errorCliente: string | null;
}

export function useClienteCotizacion(clientes: Cliente[]): {
  estado: ClienteEstado;
  /** Tipo del cliente elegido o capturado; null si aún no hay uno. */
  tipoClienteActivo: TipoCliente | null;
  /** Casilla "Retención ISR": arranca según el cliente, es editable y vuelve a su valor al cambiar de cliente. */
  aplicaRetencion: boolean;
  setAplicaRetencion: (v: boolean) => void;
} {
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">(
    clientes.length > 0 ? "existente" : "nuevo"
  );
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [clienteNuevo, setClienteNuevo] = useState<ClienteNuevoState>({
    nombreRazonSocial: "",
    rfc: "",
    contacto: "",
    tipoCliente: "", // sin valor por defecto: hay que elegirlo (o deducirlo del RFC)
  });
  const [proyecto, setProyecto] = useState("");

  const tipoClienteActivo: TipoCliente | null =
    modoCliente === "existente"
      ? ((clientes.find((c) => c.id === clienteId)?.tipoCliente as TipoCliente) ?? null)
      : tipoClienteEfectivo(clienteNuevo.rfc, clienteNuevo.tipoCliente) || null;

  // La decisión manual solo vale para el cliente con el que se tomó; con otro cliente (o otro tipo) vuelve al valor de ese cliente.
  const claveCliente = `${modoCliente}|${modoCliente === "existente" ? clienteId : "nuevo"}|${tipoClienteActivo ?? ""}`;
  const [retencionManual, setRetencionManual] = useState<{ clave: string; valor: boolean } | null>(null);
  const aplicaRetencion =
    retencionManual && retencionManual.clave === claveCliente ? retencionManual.valor : retencionInicial(tipoClienteActivo);

  return {
    aplicaRetencion,
    setAplicaRetencion: (valor: boolean) => setRetencionManual({ clave: claveCliente, valor }),
    estado: {
      modoCliente,
      setModoCliente,
      clienteId,
      setClienteId,
      clienteNuevo,
      setClienteNuevo,
      proyecto,
      setProyecto,
      errorCliente: modoCliente === "nuevo" ? errorClienteNuevo(clienteNuevo) : null,
    },
    tipoClienteActivo,
  };
}

/** Campos ocultos del form con lo que el servidor necesita del paso Cliente
 *  (ver leerClienteDeFormData en cotizaciones/actions.ts). */
export function ClienteHiddenFields({ estado }: { estado: ClienteEstado }) {
  return (
    <>
      <input
        type="hidden"
        name="clienteNuevoJson"
        value={
          estado.modoCliente === "nuevo"
            ? JSON.stringify({
                ...estado.clienteNuevo,
                rfc: normalizarRfc(estado.clienteNuevo.rfc),
                tipoCliente: tipoClienteEfectivo(estado.clienteNuevo.rfc, estado.clienteNuevo.tipoCliente),
              })
            : ""
        }
      />
      {estado.modoCliente === "existente" && <input type="hidden" name="clienteId" value={estado.clienteId} />}
      <input type="hidden" name="proyecto" value={estado.proyecto} />
    </>
  );
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
  errorCliente,
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
  errorCliente: string | null;
}) {
  const analisisRfc = analizarRfc(clienteNuevo.rfc);
  const permitidos = tiposPermitidosPorRfc(clienteNuevo.rfc);
  // 13 caracteres: Persona Física fija. 12: se elige entre Persona Moral (por defecto) y Gobierno.
  const tipoFijo = permitidos && permitidos.length === 1 ? permitidos[0] : null;
  const tipoConRfc = permitidos && permitidos.length > 1 ? tipoClienteEfectivo(clienteNuevo.rfc, clienteNuevo.tipoCliente) : null;
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
              <FieldLabel>RFC (opcional)</FieldLabel>
              <Input
                value={clienteNuevo.rfc}
                maxLength={13}
                autoCapitalize="characters"
                aria-invalid={analisisRfc.estado === "invalido"}
                onChange={(e) => setClienteNuevo((c) => ({ ...c, rfc: e.target.value.toUpperCase() }))}
              />
              {analisisRfc.estado === "invalido" && <p className="mt-1 text-xs text-danger">{analisisRfc.error}</p>}
            </Field>
            <Field>
              <FieldLabel>Tipo de cliente</FieldLabel>
              {tipoFijo ? (
                <Input readOnly value={textoTipoDeducido(tipoFijo)} className="cursor-default text-text-muted" />
              ) : permitidos ? (
                <Select
                  value={tipoConRfc || permitidos[0]}
                  onChange={(e) => setClienteNuevo((c) => ({ ...c, tipoCliente: e.target.value as TipoCliente }))}
                >
                  {permitidos.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_CLIENTE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              ) : (
                <Select
                  value={clienteNuevo.tipoCliente || "_none_"}
                  onChange={(e) =>
                    setClienteNuevo((c) => ({ ...c, tipoCliente: e.target.value === "_none_" ? "" : (e.target.value as TipoCliente) }))
                  }
                >
                  <option value="_none_">Selecciona…</option>
                  {TIPOS_CLIENTE.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_CLIENTE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              )}
              {errorCliente === MENSAJE_TIPO_CLIENTE && <p className="mt-1 text-xs text-text-dim">{errorCliente}</p>}
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
