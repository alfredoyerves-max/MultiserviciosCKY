"use client";

import { useActionState, useMemo, useState } from "react";
import { saveServicioAction, toggleServicioActivoAction } from "./actions";
import { initialFormState } from "./form-state";
import { Card, CardContent } from "@/components/ui/card";
import { AnchorButton, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { SidePanel } from "@/components/ui/side-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import {
  MODALIDADES,
  MODALIDAD_LABELS,
  SERVICIO_CATEGORIAS,
  SERVICIO_CATEGORIA_LABELS,
} from "@/lib/enums";
import { calcularCostoReal, type CostConfigInput, type CostoRealResult } from "@/lib/costEngine";
import { parseModalidades } from "@/lib/modalidades";
import { sueldoMensualEfectivo, nombrePuestoEfectivo, esSueldoBajoMinimo, costoDeServicio } from "@/lib/servicioCosto";
import { cn } from "@/lib/cn";
import type { Puesto, Servicio } from "@/generated/prisma/client";

type ServicioConPuesto = Servicio & { puesto: Puesto | null };

const COLS = 6;

/** Ícono de aviso discreto con tooltip nativo (Sección 7 del documento de
 *  diseño) — reemplaza el badge grande "Por debajo del salario mínimo
 *  vigente" que competía con el título; ahora vive junto al costo real. */
function SalarioBajoAviso({ salarioMinimoMensual }: { salarioMinimoMensual: number }) {
  return (
    <span
      className="inline-flex cursor-help text-warning-soft"
      title={`El sueldo capturado está por debajo del salario mínimo mensual vigente (${formatCurrency(salarioMinimoMensual)}).`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z" />
      </svg>
    </span>
  );
}

/**
 * Desglose de cargas patronales (Punto 2) — cada categoría que el motor
 * ya calcula internamente, expuesta en vez de escondida dentro de un solo
 * total. Se reutiliza tal cual en el catálogo (fila expandible) y en el
 * formulario de alta/edición (junto al costo real estimado).
 */
function DesgloseCargasPatronales({ costo }: { costo: CostoRealResult }) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface-2 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">
        Desglose de cargas patronales (mensual)
      </p>
      {costo.pisoSalarioMinimoAplicado && (
        <p className="mb-3 text-xs italic text-warning-soft">
          Cuotas patronales calculadas sobre salario mínimo (piso legal), no sobre el sueldo
          pactado.
        </p>
      )}
      <dl className="flex flex-col gap-1.5 text-sm">
        <DesgloseLinea label="IMSS" value={costo.imssMensual} />
        <DesgloseLinea label="RCV (retiro + cesantía y vejez)" value={costo.rcvMensual} />
        <DesgloseLinea label="INFONAVIT" value={costo.infonavitMensual} />
        <DesgloseLinea label="ISN" value={costo.isnMensual} />
        <DesgloseLinea label="Impuesto adicional" value={costo.impuestoAdicionalMensual} />
        <div className="my-1 border-t border-border" />
        <DesgloseLinea label="Total de cargas patronales" value={costo.totalCargasPatronales} bold />
        <div className="my-1 border-t border-border" />
        <DesgloseLinea label="Sueldo pactado + prestaciones" value={costo.remuneracionMensualTotal} />
        <DesgloseLinea label="Costo real total" value={costo.costoRealMensual} bold accent />
      </dl>
    </div>
  );
}

function DesgloseLinea({
  label,
  value,
  bold = false,
  accent = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd
        className={cn(
          "font-mono tabular-nums",
          bold && "font-semibold",
          accent ? "text-primary" : "text-text"
        )}
      >
        {formatCurrency(value)}
      </dd>
    </div>
  );
}

export function ServiciosPanel({
  servicios,
  puestos,
  config,
}: {
  servicios: ServicioConPuesto[];
  puestos: Puesto[];
  config: CostConfigInput;
}) {
  const [editing, setEditing] = useState<ServicioConPuesto | null>(null);
  const [creating, setCreating] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);

  // Inactivos ocultos por defecto; el interruptor los muestra.
  const visibles = verInactivos ? servicios : servicios.filter((s) => s.activo);
  const inactivos = servicios.length - servicios.filter((s) => s.activo).length;
  const conSueldoBajo = visibles.filter((s) =>
    esSueldoBajoMinimo(sueldoMensualEfectivo(s), config.salarioMinimoMensual)
  ).length;

  const nuevoServicio = (
    <Button size="sm" onClick={() => setCreating(true)}>
      + Nuevo servicio
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-text-muted">
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
          />
          Ver inactivos{inactivos > 0 && <span className="text-text-dim">({inactivos})</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          <AnchorButton href="/api/servicios/export" download>
            Exportar a Excel
          </AnchorButton>
          {nuevoServicio}
        </div>
      </div>

      {conSueldoBajo > 0 && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-soft">
          ⚠ {conSueldoBajo} servicio(s) con sueldo por debajo del mínimo — costo calculado sobre piso legal
        </p>
      )}

      {visibles.length === 0 ? (
        <Card>
          <EmptyState
            title={servicios.length === 0 ? "Sin servicios todavía." : "No hay servicios activos."}
            action={nuevoServicio}
          />
        </Card>
      ) : (
        <>
          {/* Tabla — desde md (tablet) para arriba, con scroll horizontal
              propio como red de seguridad si algún día no cabe. */}
          <Card className="hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                    <th className="px-5 py-3 font-medium">Servicio</th>
                    <th className="px-5 py-3 font-medium">Categoría</th>
                    <th className="px-5 py-3 font-medium">Puesto</th>
                    <th className="px-5 py-3 font-medium">Modalidades</th>
                    <th className="px-5 py-3 text-right font-medium">Costo real / mes</th>
                    <th className="px-5 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((s) => (
                    <ServicioRow key={s.id} servicio={s} config={config} onEdit={() => setEditing(s)} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Tarjetas apiladas — por debajo de md (celular): una tabla de 6
              columnas ahí obliga a hacer zoom o se corta, así que cada
              servicio es su propia tarjeta con la misma información. */}
          <div className="flex flex-col gap-3 md:hidden">
            {visibles.map((s) => (
              <ServicioCardMobile key={s.id} servicio={s} config={config} onEdit={() => setEditing(s)} />
            ))}
          </div>
        </>
      )}

      {(creating || editing) && (
        <ServicioForm
          key={editing?.id ?? "nuevo"}
          servicio={editing ?? undefined}
          puestos={puestos}
          config={config}
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

/** Acción principal visible ("Ver desglose") + menú "⋯" (Editar, Desactivar / Activar). */
function AccionesServicio({
  servicio,
  expandido,
  onToggleDesglose,
  onEdit,
}: {
  servicio: ServicioConPuesto;
  expandido: boolean;
  onToggleDesglose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="secondary" onClick={onToggleDesglose} aria-expanded={expandido}>
        {expandido ? "Ocultar desglose" : "Ver desglose"}
      </Button>
      <RowActions
        label={`Más acciones de ${servicio.nombre}`}
        actions={[
          { label: "Editar", onSelect: onEdit },
          {
            label: servicio.activo ? "Desactivar" : "Activar",
            onSelect: () => toggleServicioActivoAction(servicio.id, !servicio.activo),
          },
        ]}
      />
    </div>
  );
}

function ServicioRow({
  servicio,
  config,
  onEdit,
}: {
  servicio: ServicioConPuesto;
  config: CostConfigInput;
  onEdit: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const { costo, bajoMinimo } = costoDeServicio(servicio, config);
  const modalidades = parseModalidades(servicio.modalidadesJson);

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <p className="font-medium text-text">{servicio.nombre}</p>
            {!servicio.activo && <Badge tone="danger">Inactivo</Badge>}
          </div>
          {servicio.descripcion && <p className="mt-0.5 text-xs text-text-dim">{servicio.descripcion}</p>}
          {(servicio.incluyeUniforme || servicio.incluyeMaterial) && (
            <p className="mt-0.5 text-xs text-text-dim">
              {servicio.incluyeUniforme && "Incluye uniforme"}
              {servicio.incluyeUniforme && servicio.incluyeMaterial && " · "}
              {servicio.incluyeMaterial && "Incluye material"}
            </p>
          )}
        </td>
        <td className="px-5 py-3">
          <Badge tone="neutral">{SERVICIO_CATEGORIA_LABELS[servicio.categoria as keyof typeof SERVICIO_CATEGORIA_LABELS]}</Badge>
        </td>
        <td className="px-5 py-3 text-text-muted">
          {nombrePuestoEfectivo(servicio)}
          <span className="block text-xs text-text-dim">{servicio.personalPorUnidad} persona(s)/unidad</span>
        </td>
        <td className="px-5 py-3 text-text-muted">{modalidades.map((m) => MODALIDAD_LABELS[m]).join(", ")}</td>
        <td className="px-5 py-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {bajoMinimo && <SalarioBajoAviso salarioMinimoMensual={config.salarioMinimoMensual} />}
            <p className="font-mono text-sm font-semibold tabular-nums text-primary">
              {formatCurrency(costo.costoRealMensual)}
            </p>
          </div>
          <p className="text-xs text-text-dim">{formatCurrency(costo.costoRealHora)}/hora</p>
        </td>
        <td className="px-5 py-3">
          <AccionesServicio
            servicio={servicio}
            expandido={expandido}
            onToggleDesglose={() => setExpandido((v) => !v)}
            onEdit={onEdit}
          />
        </td>
      </tr>
      {expandido && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={COLS} className="bg-surface px-5 py-4">
            <DesgloseCargasPatronales costo={costo} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Tarjeta de servicio — misma información que ServicioRow, para la vista
 *  apilada de celular (ver ServiciosPanel, por debajo de md). */
function ServicioCardMobile({
  servicio,
  config,
  onEdit,
}: {
  servicio: ServicioConPuesto;
  config: CostConfigInput;
  onEdit: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const { costo, bajoMinimo } = costoDeServicio(servicio, config);
  const modalidades = parseModalidades(servicio.modalidadesJson);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-text">{servicio.nombre}</p>
              {!servicio.activo && <Badge tone="danger">Inactivo</Badge>}
            </div>
            {servicio.descripcion && <p className="mt-0.5 text-xs text-text-dim">{servicio.descripcion}</p>}
          </div>
          <Badge tone="neutral" className="shrink-0">
            {SERVICIO_CATEGORIA_LABELS[servicio.categoria as keyof typeof SERVICIO_CATEGORIA_LABELS]}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-text-dim">Puesto</dt>
          <dd className="text-right text-text-muted">
            {nombrePuestoEfectivo(servicio)}
            <span className="block text-xs text-text-dim">{servicio.personalPorUnidad} persona(s)/unidad</span>
          </dd>
          <dt className="text-text-dim">Modalidades</dt>
          <dd className="text-right text-text-muted">{modalidades.map((m) => MODALIDAD_LABELS[m]).join(", ")}</dd>
        </dl>

        {(servicio.incluyeUniforme || servicio.incluyeMaterial) && (
          <p className="text-xs text-text-dim">
            {servicio.incluyeUniforme && "Incluye uniforme"}
            {servicio.incluyeUniforme && servicio.incluyeMaterial && " · "}
            {servicio.incluyeMaterial && "Incluye material"}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2.5">
          <div className="flex items-center gap-1.5">
            {bajoMinimo && <SalarioBajoAviso salarioMinimoMensual={config.salarioMinimoMensual} />}
            <div>
              <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                {formatCurrency(costo.costoRealMensual)}/mes
              </p>
              <p className="text-xs text-text-dim">{formatCurrency(costo.costoRealHora)}/hora</p>
            </div>
          </div>
          <AccionesServicio
            servicio={servicio}
            expandido={expandido}
            onToggleDesglose={() => setExpandido((v) => !v)}
            onEdit={onEdit}
          />
        </div>

        {expandido && <DesgloseCargasPatronales costo={costo} />}
      </CardContent>
    </Card>
  );
}

function ServicioForm({
  servicio,
  puestos,
  config,
  onDone,
  onCancel,
}: {
  servicio?: ServicioConPuesto;
  puestos: Puesto[];
  config: CostConfigInput;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [incluyeUniforme, setIncluyeUniforme] = useState(servicio?.incluyeUniforme ?? false);
  const [incluyeMaterial, setIncluyeMaterial] = useState(servicio?.incluyeMaterial ?? false);
  const modalidadesActuales = servicio ? parseModalidades(servicio.modalidadesJson) : [];

  const [modoMano, setModoMano] = useState<"puesto" | "inline">(() => {
    if (servicio) return servicio.puestoId ? "puesto" : "inline";
    return puestos.length > 0 ? "puesto" : "inline";
  });
  const [puestoId, setPuestoId] = useState(servicio?.puestoId ?? puestos[0]?.id ?? "");
  const [sueldoInline, setSueldoInline] = useState(servicio?.sueldoMensualInline ?? undefined);
  const [nombreInline, setNombreInline] = useState(servicio?.nombrePuestoInline ?? "");
  const [guardarComoPuesto, setGuardarComoPuesto] = useState(false);

  const sueldoActivo =
    modoMano === "puesto"
      ? (puestos.find((p) => p.id === puestoId)?.sueldoMensual ?? 0)
      : (sueldoInline ?? 0);
  const bajoMinimo = sueldoActivo > 0 && esSueldoBajoMinimo(sueldoActivo, config.salarioMinimoMensual);

  const costoPreview = useMemo(() => {
    if (sueldoActivo <= 0) return null;
    return calcularCostoReal(config, {
      sueldoMensualPuesto: sueldoActivo,
      incluyeUniforme: false,
      incluyeMaterial: false,
    });
  }, [config, sueldoActivo]);

  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialFormState, formData: FormData) => {
      const res = await saveServicioAction(prev, formData);
      if (res.ok) onDone();
      return res;
    },
    initialFormState
  );

  return (
    <SidePanel
      title={servicio ? "Editar servicio" : "Nuevo servicio"}
      onClose={onCancel}
      footer={(solicitarCierre) => (
        <>
          <Button type="button" variant="ghost" onClick={solicitarCierre}>
            Cancelar
          </Button>
          <Button type="submit" form="servicio-form" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </>
      )}
    >
        <form id="servicio-form" action={formAction} className="flex flex-col gap-4">
          {servicio && <input type="hidden" name="id" value={servicio.id} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
              <Input id="nombre" name="nombre" defaultValue={servicio?.nombre} required />
              <FieldError>{state.fieldErrors?.nombre}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="categoria">Categoría</FieldLabel>
              <Select id="categoria" name="categoria" defaultValue={servicio?.categoria} required>
                {SERVICIO_CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {SERVICIO_CATEGORIA_LABELS[c]}
                  </option>
                ))}
              </Select>
              <FieldError>{state.fieldErrors?.categoria}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="descripcion">Descripción (opcional)</FieldLabel>
            <Textarea id="descripcion" name="descripcion" defaultValue={servicio?.descripcion ?? ""} />
          </Field>

          <div className="rounded-lg border border-border-strong bg-surface-2 p-3">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel className="mb-0">Mano de obra</FieldLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={modoMano === "puesto" ? "primary" : "secondary"}
                  onClick={() => setModoMano("puesto")}
                >
                  Puesto guardado
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={modoMano === "inline" ? "primary" : "secondary"}
                  onClick={() => setModoMano("inline")}
                >
                  Capturar sueldo aquí
                </Button>
              </div>
            </div>

            <div className="mt-3">
              {modoMano === "puesto" ? (
                puestos.length === 0 ? (
                  <p className="text-sm text-text-dim">
                    Todavía no hay puestos guardados — usa &quot;Capturar sueldo aquí&quot;.
                  </p>
                ) : (
                  <Field>
                    <FieldLabel htmlFor="puestoId">Puesto</FieldLabel>
                    <Select
                      id="puestoId"
                      name="puestoId"
                      value={puestoId}
                      onChange={(e) => setPuestoId(e.target.value)}
                    >
                      {puestos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} — {formatCurrency(p.sueldoMensual)}/mes
                        </option>
                      ))}
                    </Select>
                  </Field>
                )
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="nombrePuestoInline">Nombre del puesto</FieldLabel>
                      <Input
                        id="nombrePuestoInline"
                        name="nombrePuestoInline"
                        value={nombreInline}
                        onChange={(e) => setNombreInline(e.target.value)}
                        placeholder="Ej. Personal de limpieza"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="sueldoMensualInline">Sueldo mensual ($)</FieldLabel>
                      <Input
                        id="sueldoMensualInline"
                        name="sueldoMensualInline"
                        type="number"
                        step="0.01"
                        value={sueldoInline ?? ""}
                        onChange={(e) => setSueldoInline(e.target.value === "" ? undefined : Number(e.target.value))}
                        required
                      />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-text-muted">
                    <input
                      type="checkbox"
                      name="guardarComoPuesto"
                      checked={guardarComoPuesto}
                      onChange={(e) => setGuardarComoPuesto(e.target.checked)}
                      className="h-4 w-4 rounded border-border-strong accent-[var(--color-primary)]"
                    />
                    Guardar como Puesto nuevo (para reusarlo en otros servicios)
                  </label>
                </div>
              )}

              {costoPreview && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="flex items-center gap-1.5 text-xs text-text-dim">
                    {bajoMinimo && <SalarioBajoAviso salarioMinimoMensual={config.salarioMinimoMensual} />}
                    Costo real estimado (sin uniforme/material):{" "}
                    <span className="font-mono text-text-muted">
                      {formatCurrency(costoPreview.costoRealMensual)}/mes ·{" "}
                      {formatCurrency(costoPreview.costoRealHora)}/hora
                    </span>
                  </p>
                  <DesgloseCargasPatronales costo={costoPreview} />
                </div>
              )}
              <FieldError>{state.fieldErrors?.puestoId}</FieldError>
            </div>
          </div>

          <Field className="max-w-xs">
            <FieldLabel htmlFor="personalPorUnidad">Personal requerido por unidad</FieldLabel>
            <Input
              id="personalPorUnidad"
              name="personalPorUnidad"
              type="number"
              step="1"
              min={1}
              defaultValue={servicio?.personalPorUnidad ?? 1}
              required
            />
            <FieldError>{state.fieldErrors?.personalPorUnidad}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Modalidades disponibles</FieldLabel>
            <div className="flex flex-wrap gap-3">
              {MODALIDADES.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-text-muted">
                  <input
                    type="checkbox"
                    name="modalidades"
                    value={m}
                    defaultChecked={modalidadesActuales.includes(m)}
                    className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
                  />
                  {MODALIDAD_LABELS[m]}
                </label>
              ))}
            </div>
            <FieldError>{state.fieldErrors?.modalidades}</FieldError>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border-strong bg-surface-2 p-3">
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="incluyeUniforme"
                  checked={incluyeUniforme}
                  onChange={(e) => setIncluyeUniforme(e.target.checked)}
                  className="h-4 w-4 rounded border-border-strong accent-[var(--color-primary)]"
                />
                Incluye uniforme
              </label>
              {incluyeUniforme && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="costoUniforme">Costo total ($)</FieldLabel>
                    <Input id="costoUniforme" name="costoUniforme" type="number" step="0.01" defaultValue={servicio?.costoUniforme ?? ""} />
                    <FieldError>{state.fieldErrors?.costoUniforme}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="vidaUtilUniformeMeses">Vida útil (meses)</FieldLabel>
                    <Input id="vidaUtilUniformeMeses" name="vidaUtilUniformeMeses" type="number" step="1" defaultValue={servicio?.vidaUtilUniformeMeses ?? ""} />
                  </Field>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border-strong bg-surface-2 p-3">
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="incluyeMaterial"
                  checked={incluyeMaterial}
                  onChange={(e) => setIncluyeMaterial(e.target.checked)}
                  className="h-4 w-4 rounded border-border-strong accent-[var(--color-primary)]"
                />
                Incluye material
              </label>
              {incluyeMaterial && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="costoMaterial">Costo total ($)</FieldLabel>
                    <Input id="costoMaterial" name="costoMaterial" type="number" step="0.01" defaultValue={servicio?.costoMaterial ?? ""} />
                    <FieldError>{state.fieldErrors?.costoMaterial}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="vidaUtilMaterialMeses">Vida útil (meses)</FieldLabel>
                    <Input id="vidaUtilMaterialMeses" name="vidaUtilMaterialMeses" type="number" step="1" defaultValue={servicio?.vidaUtilMaterialMeses ?? ""} />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}
        </form>
    </SidePanel>
  );
}
