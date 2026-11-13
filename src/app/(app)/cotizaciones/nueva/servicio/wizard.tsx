"use client";

import { useActionState, useMemo, useState } from "react";
import { createCotizacionAction, type CotizacionActionState } from "../../actions";
import { ClienteStep, ClienteHiddenFields, useClienteCotizacion } from "../cliente-step";
import { ResumenCotizacionCard } from "../resumen-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { margenSobrePrecioPct } from "@/lib/recargo";
import { textoAvisoSueldo } from "@/lib/servicioCosto";
import { MODALIDAD_LABELS, type Modalidad } from "@/lib/enums";
import type { Cliente } from "@/generated/prisma/client";

export interface ServicioOption {
  id: string;
  nombre: string;
  categoria: string;
  modalidadesDisponibles: Modalidad[];
  costoPorModalidad: Record<Modalidad, number>;
  /** Puesto y sueldo mensual: distinguen servicios con el mismo nombre. */
  puestoNombre: string;
  sueldoMensual: number;
  /** Sueldo base del puesto por debajo del salario mínimo mensual vigente
   *  — se muestra como ícono de aviso junto a esta opción específica en el
   *  selector, para no tener que seleccionarla primero para descubrirlo. */
  bajoMinimo: boolean;
  /** El motor aplicó el piso: las cargas se calcularon sobre el mínimo legal. */
  cargasSobreMinimo: boolean;
}

/** Texto de una opción del selector: nombre + puesto + sueldo mensual, para
 *  distinguir servicios con el mismo nombre sin seleccionarlos primero. */
function servicioOptionLabel(s: ServicioOption): string {
  return `${s.nombre} — ${s.puestoNombre} · ${formatCurrency(s.sueldoMensual)}/mes`;
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
  const { estado: cliente, tipoClienteActivo } = useClienteCotizacion(clientes);
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

  const lineasCalculadas = lineas.map((l) => {
    const servicio = servicioById.get(l.servicioId);
    const costoUnitario = servicio?.costoPorModalidad[l.modalidad] ?? 0;
    const costoRealTotal = costoUnitario * l.personas * l.duracion;
    const precioVenta = costoRealTotal * (1 + margenUtilidadPct / 100);
    return { ...l, servicio, precioVenta };
  });

  const subtotal = lineasCalculadas.reduce((sum, l) => sum + l.precioVenta, 0);

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
    <form action={formAction} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
      <input type="hidden" name="lineasJson" value={JSON.stringify(lineas)} />
      <input type="hidden" name="margenUtilidadPct" value={margenUtilidadPct} />
      <ClienteHiddenFields estado={cliente} />

      <div className="flex flex-col gap-6">
      <ClienteStep clientes={clientes} {...cliente} />

      <Card>
        <CardHeader className="items-start justify-between">
          <CardTitle>Servicios</CardTitle>
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
                  <FieldLabel>
                    Servicio
                    {servicio && textoAvisoSueldo(servicio) && (
                      <span title={textoAvisoSueldo(servicio)} aria-label={textoAvisoSueldo(servicio)} className="ml-1 cursor-help text-warning-soft">
                        ⚠
                      </span>
                    )}
                  </FieldLabel>
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
                        {servicioOptionLabel(s)}
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
                    onFocus={(e) => e.target.select()}
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
                    onFocus={(e) => e.target.select()}
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
      </div>

      <ResumenCotizacionCard
        titulo="Resumen"
        aviso={textoAvisoSueldo({
          bajoMinimo: lineasCalculadas.some((l) => l.servicio?.bajoMinimo),
          cargasSobreMinimo: lineasCalculadas.some((l) => l.servicio?.cargasSobreMinimo),
        })}
        diasVigencia={diasVigencia}
        setDiasVigencia={setDiasVigencia}
        esSoporte={esSoporte}
        setEsSoporte={setEsSoporte}
        subtotal={subtotal}
        tipoClienteActivo={tipoClienteActivo}
        ivaPct={ivaPct}
        retencionIsrPct={retencionIsrPct}
        error={state.error}
        pending={pending}
        sinLineas={lineas.length === 0}
        bloqueo={cliente.errorCliente}
      >
        <Field>
          <FieldLabel>Utilidad sobre costo (%)</FieldLabel>
          <Input
            type="number"
            step="0.01"
            value={margenUtilidadPct}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setMargenUtilidadPct(Number(e.target.value) || 0)}
          />
          <p className="text-xs text-text-dim">
            Precio = costo × (1 + utilidad). Equivale a {margenSobrePrecioPct(margenUtilidadPct).toFixed(2)} % de la venta.
          </p>
        </Field>
      </ResumenCotizacionCard>
    </form>
  );
}
