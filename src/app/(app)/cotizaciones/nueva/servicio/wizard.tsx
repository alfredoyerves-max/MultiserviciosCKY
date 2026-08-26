"use client";

import { useActionState, useMemo, useState } from "react";
import { createCotizacionAction, type CotizacionActionState } from "../../actions";
import { ClienteStep, type ClienteNuevoState } from "../cliente-step";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/input";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  MODALIDAD_LABELS,
  SERVICIO_CATEGORIA_LABELS,
  type Modalidad,
  type ServicioCategoria,
  type TipoCliente,
} from "@/lib/enums";
import type { Cliente } from "@/generated/prisma/client";

export interface ServicioOption {
  id: string;
  nombre: string;
  categoria: string;
  modalidadesDisponibles: Modalidad[];
  costoPorModalidad: Record<Modalidad, number>;
}

interface LineaState {
  key: string;
  servicioId: string;
  modalidad: Modalidad;
  personas: number;
  duracion: number;
}

const initialState: CotizacionActionState = { ok: false };

export function Wizard({
  servicios,
  clientes,
  margenDefaultPct,
  ivaPct,
  retencionIsrPct,
}: {
  servicios: ServicioOption[];
  clientes: Cliente[];
  margenDefaultPct: number;
  ivaPct: number;
  retencionIsrPct: number;
}) {
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">(
    clientes.length > 0 ? "existente" : "nuevo"
  );
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [clienteNuevo, setClienteNuevo] = useState<ClienteNuevoState>({
    nombreRazonSocial: "",
    rfc: "",
    contacto: "",
    tipoCliente: "PERSONA_MORAL",
  });
  const [proyecto, setProyecto] = useState("");
  const [margenUtilidadPct, setMargenUtilidadPct] = useState(margenDefaultPct);
  const [diasVigencia, setDiasVigencia] = useState(15);
  const [esSoporte, setEsSoporte] = useState(false);
  const [lineas, setLineas] = useState<LineaState[]>(
    servicios.length > 0
      ? [
          {
            key: crypto.randomUUID(),
            servicioId: servicios[0].id,
            modalidad: servicios[0].modalidadesDisponibles[0] ?? "MES",
            personas: 1,
            duracion: 1,
          },
        ]
      : []
  );

  const servicioById = useMemo(() => new Map(servicios.map((s) => [s.id, s])), [servicios]);

  const tipoClienteActivo: TipoCliente | null =
    modoCliente === "existente"
      ? ((clientes.find((c) => c.id === clienteId)?.tipoCliente as TipoCliente) ?? null)
      : clienteNuevo.tipoCliente;

  const lineasCalculadas = lineas.map((l) => {
    const servicio = servicioById.get(l.servicioId);
    const costoUnitario = servicio?.costoPorModalidad[l.modalidad] ?? 0;
    const costoRealTotal = costoUnitario * l.personas * l.duracion;
    const precioVenta = costoRealTotal * (1 + margenUtilidadPct / 100);
    return { ...l, servicio, precioVenta };
  });

  const subtotal = lineasCalculadas.reduce((sum, l) => sum + l.precioVenta, 0);
  const iva = subtotal * ivaPct;
  const totalAPagar = subtotal + iva;
  const retencionIsr = tipoClienteActivo === "PERSONA_MORAL" ? subtotal * retencionIsrPct : 0;
  const netoARecibir = totalAPagar - retencionIsr;

  const [state, formAction, pending] = useActionState(createCotizacionAction, initialState);

  function addLinea() {
    if (servicios.length === 0) return;
    setLineas((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        servicioId: servicios[0].id,
        modalidad: servicios[0].modalidadesDisponibles[0] ?? "MES",
        personas: 1,
        duracion: 1,
      },
    ]);
  }

  function updateLinea(key: string, patch: Partial<LineaState>) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  if (servicios.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
        No hay servicios activos en el catálogo. Da de alta al menos uno en{" "}
        <span className="text-primary">Servicios</span> antes de crear una cotización.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="lineasJson" value={JSON.stringify(lineas)} />
      <input
        type="hidden"
        name="clienteNuevoJson"
        value={modoCliente === "nuevo" ? JSON.stringify(clienteNuevo) : ""}
      />
      {modoCliente === "existente" && <input type="hidden" name="clienteId" value={clienteId} />}
      <input type="hidden" name="proyecto" value={proyecto} />
      <input type="hidden" name="margenUtilidadPct" value={margenUtilidadPct} />
      <input type="hidden" name="diasVigencia" value={diasVigencia} />
      <input type="hidden" name="esSoporte" value={esSoporte ? "on" : ""} />

      <ClienteStep
        clientes={clientes}
        modoCliente={modoCliente}
        setModoCliente={setModoCliente}
        clienteId={clienteId}
        setClienteId={setClienteId}
        clienteNuevo={clienteNuevo}
        setClienteNuevo={setClienteNuevo}
        proyecto={proyecto}
        setProyecto={setProyecto}
      />

      <Card>
        <CardHeader className="items-start justify-between">
          <CardTitle>2. Servicios</CardTitle>
          <Button type="button" size="sm" onClick={addLinea}>
            + Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lineasCalculadas.map((l) => {
            const servicio = l.servicio;
            const modalidadesDisponibles = servicio?.modalidadesDisponibles ?? [];
            return (
              <div
                key={l.key}
                className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border-strong bg-surface-2 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
              >
                <Field>
                  <FieldLabel>Servicio</FieldLabel>
                  <Select
                    value={l.servicioId}
                    onChange={(e) => {
                      const nuevoServicio = servicioById.get(e.target.value);
                      updateLinea(l.key, {
                        servicioId: e.target.value,
                        modalidad: nuevoServicio?.modalidadesDisponibles[0] ?? "MES",
                      });
                    }}
                  >
                    {servicios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({SERVICIO_CATEGORIA_LABELS[s.categoria as ServicioCategoria]})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Modalidad</FieldLabel>
                  <Select
                    value={l.modalidad}
                    onChange={(e) => updateLinea(l.key, { modalidad: e.target.value as Modalidad })}
                  >
                    {modalidadesDisponibles.map((m) => (
                      <option key={m} value={m}>
                        {MODALIDAD_LABELS[m]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Personas</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    value={l.personas}
                    onChange={(e) => updateLinea(l.key, { personas: Number(e.target.value) || 1 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Duración</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    value={l.duracion}
                    onChange={(e) => updateLinea(l.key, { duracion: Number(e.target.value) || 1 })}
                  />
                </Field>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-dim">Precio</p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                    {formatCurrency(l.precioVenta)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeLinea(l.key)}
                  disabled={lineas.length === 1}
                >
                  Quitar
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Margen y resumen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Margen de utilidad de esta cotización (%)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                value={margenUtilidadPct}
                onChange={(e) => setMargenUtilidadPct(Number(e.target.value) || 0)}
              />
            </Field>
            <Field>
              <FieldLabel>Vigencia (días)</FieldLabel>
              <Input
                type="number"
                step="1"
                min={1}
                value={diasVigencia}
                onChange={(e) => setDiasVigencia(Number(e.target.value) || 1)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={esSoporte}
              onChange={(e) => setEsSoporte(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
            />
            Es cotización de soporte (trámite interno del cliente, sin intención real de compra
            — no aparece en el pipeline del kanban por defecto)
          </label>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <Resumen label="Subtotal" value={formatCurrency(subtotal)} />
            <Resumen label={`IVA (${formatPercent(ivaPct)})`} value={formatCurrency(iva)} />
            <Resumen label="Total a pagar" value={formatCurrency(totalAPagar)} accent />
            {tipoClienteActivo === "PERSONA_MORAL" && (
              <Resumen
                label={`Retención ISR (${formatPercent(retencionIsrPct)})`}
                value={`- ${formatCurrency(retencionIsr)}`}
              />
            )}
            <Resumen label="Neto a recibir" value={formatCurrency(netoARecibir)} />
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={pending || lineas.length === 0}>
              {pending ? "Creando…" : "Crear cotización"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function Resumen({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-dim">{label}</p>
      <p className={`font-mono text-lg font-semibold tabular-nums ${accent ? "text-primary" : "text-text"}`}>
        {value}
      </p>
    </div>
  );
}
