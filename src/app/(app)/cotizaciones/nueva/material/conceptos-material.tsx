"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/input";
import { UnidadSelect } from "@/components/ui/unidad-select";
import { ClaveSatInput } from "./clave-sat-input";
import { formatCurrency } from "@/lib/format";
import { etiquetaUnidad } from "@/lib/enums";
import { claveSatValida, MENSAJE_CLAVE_SAT } from "@/lib/claveSat";
import type { ClaveSat, Producto, UnidadMedida } from "@/generated/prisma/client";

/** Valor del selector de atajo cuando la línea se captura libre. */
const SIN_PRODUCTO = "_none_";

/** Línea ya agregada a la cotización. */
export interface LineaMaterial {
  key: string;
  /** Atajo opcional al catálogo; "" = captura libre. */
  productoId: string;
  claveSat: string;
  descripcion: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
}

/** Lo que se está capturando (cantidad y precio como texto para poder borrarlos al teclear). */
interface Borrador {
  productoId: string;
  claveSat: string;
  descripcion: string;
  unidadMedida: string;
  cantidad: string;
  precioUnitario: string;
}

const BORRADOR_VACIO: Borrador = {
  productoId: "",
  claveSat: "",
  descripcion: "",
  unidadMedida: "PIEZA",
  cantidad: "1",
  precioUnitario: "",
};

/** Mismas columnas en el encabezado y en cada fila de la lista (desde sm). */
const COLUMNAS = "sm:grid sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_4rem_6rem_6.5rem_4.5rem]";

/**
 * Conceptos de una cotización de material: una sola fila de captura y, debajo,
 * la lista acumulada compacta con scroll interno. Enter en Precio agrega la
 * línea y devuelve el foco a Descripción; ✎ carga la línea en la fila de
 * captura (el botón pasa a "Actualizar"). Una línea sin descripción se ignora.
 */
export function ConceptosMaterial({
  productos,
  unidades,
  claves,
  lineas,
  setLineas,
}: {
  productos: Producto[];
  unidades: UnidadMedida[];
  claves: ClaveSat[];
  lineas: LineaMaterial[];
  setLineas: (fn: (prev: LineaMaterial[]) => LineaMaterial[]) => void;
}) {
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const [editandoKey, setEditandoKey] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const descripcionRef = useRef<HTMLInputElement>(null);

  const editando = editandoKey !== null;

  function cambiar(patch: Partial<Borrador>) {
    setBorrador((b) => ({ ...b, ...patch }));
    setAviso(null);
  }

  // Atajo: precarga descripción/unidad/precio desde el producto elegido.
  // Todo sigue siendo editable y nada se valida contra el inventario.
  function elegirProducto(productoId: string) {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return cambiar({ productoId: "" });
    cambiar({
      productoId,
      descripcion: producto.nombre,
      unidadMedida: producto.unidadMedida,
      precioUnitario: String(producto.precioVentaSugerido ?? 0),
    });
  }

  function limpiar() {
    setBorrador(BORRADOR_VACIO);
    setEditandoKey(null);
    setAviso(null);
    descripcionRef.current?.focus();
  }

  function agregarOActualizar() {
    const descripcion = borrador.descripcion.trim();
    if (!descripcion) {
      // Línea vacía: se ignora (no se agrega), solo se devuelve el foco.
      setAviso(null);
      descripcionRef.current?.focus();
      return;
    }
    const cantidad = Number(borrador.cantidad);
    const precio = borrador.precioUnitario.trim() === "" ? 0 : Number(borrador.precioUnitario);
    if (!claveSatValida(borrador.claveSat)) return setAviso(MENSAJE_CLAVE_SAT);
    if (!(cantidad > 0)) return setAviso("La cantidad debe ser mayor a 0.");
    if (!(precio >= 0)) return setAviso("El precio no puede ser negativo.");
    if (!borrador.unidadMedida.trim()) return setAviso("Indica la unidad.");

    const linea: LineaMaterial = {
      key: editandoKey ?? crypto.randomUUID(),
      productoId: borrador.productoId,
      claveSat: borrador.claveSat.trim(),
      descripcion,
      unidadMedida: borrador.unidadMedida.trim(),
      cantidad,
      precioUnitario: precio,
    };
    setLineas((prev) => (editandoKey ? prev.map((l) => (l.key === editandoKey ? linea : l)) : [...prev, linea]));
    limpiar();
  }

  function editar(l: LineaMaterial) {
    setEditandoKey(l.key);
    setAviso(null);
    setBorrador({
      productoId: l.productoId,
      claveSat: l.claveSat,
      descripcion: l.descripcion,
      unidadMedida: l.unidadMedida,
      cantidad: String(l.cantidad),
      precioUnitario: String(l.precioUnitario),
    });
    descripcionRef.current?.focus();
  }

  function quitar(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
    if (key === editandoKey) limpiar();
  }

  // Dentro del <form> de la cotización, Enter no debe enviarla: en Precio agrega la línea.
  function teclaCaptura(e: KeyboardEvent<HTMLElement>, esPrecio = false) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (esPrecio) agregarOActualizar();
  }

  const pendienteSinAgregar = !editando && borrador.descripcion.trim() !== "";

  return (
    <Card>
      <CardHeader className="items-start justify-between">
        <CardTitle>Conceptos ({lineas.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-lg border border-border-strong bg-surface-2 p-3">
          {productos.length > 0 && (
            <Field>
              <FieldLabel>Precargar desde producto guardado (opcional)</FieldLabel>
              <Select
                value={borrador.productoId || SIN_PRODUCTO}
                onChange={(e) => (e.target.value === SIN_PRODUCTO ? cambiar({ productoId: "" }) : elegirProducto(e.target.value))}
              >
                <option value={SIN_PRODUCTO}>— Captura libre —</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({etiquetaUnidad(p.unidadMedida)})
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1.8fr)_5rem_7rem_auto]">
            <Field className="col-span-2 sm:col-span-1">
              <FieldLabel>Descripción</FieldLabel>
              <Input
                ref={descripcionRef}
                value={borrador.descripcion}
                onChange={(e) => cambiar({ descripcion: e.target.value })}
                onKeyDown={teclaCaptura}
                placeholder="Ej. Papel higiénico jumbo"
              />
            </Field>
            <Field>
              <FieldLabel>Clave SAT</FieldLabel>
              <ClaveSatInput
                value={borrador.claveSat}
                onChange={(v) => cambiar({ claveSat: v })}
                claves={claves}
                onKeyDown={teclaCaptura}
              />
            </Field>
            <Field>
              <FieldLabel>Unidad</FieldLabel>
              <UnidadSelect value={borrador.unidadMedida} onChange={(v) => cambiar({ unidadMedida: v })} unidades={unidades} />
            </Field>
            <Field>
              <FieldLabel>Cant.</FieldLabel>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                inputMode="decimal"
                value={borrador.cantidad}
                onFocus={(e) => e.target.select()}
                onChange={(e) => cambiar({ cantidad: e.target.value })}
                onKeyDown={teclaCaptura}
              />
            </Field>
            <Field>
              <FieldLabel>Precio</FieldLabel>
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={borrador.precioUnitario}
                onFocus={(e) => e.target.select()}
                onChange={(e) => cambiar({ precioUnitario: e.target.value })}
                onKeyDown={(e) => teclaCaptura(e, true)}
              />
            </Field>
            <div className="col-span-2 flex items-end gap-2 sm:col-span-1 sm:pt-[1.375rem]">
              <Button type="button" size="sm" onClick={agregarOActualizar}>
                {editando ? "Actualizar" : "+ Agregar"}
              </Button>
              {editando && (
                <Button type="button" size="sm" variant="ghost" onClick={limpiar}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
          {aviso && <p className="text-sm text-danger">{aviso}</p>}
          {!aviso && editando && <p className="text-xs text-text-muted">Editando un concepto de la lista.</p>}
          {!aviso && pendienteSinAgregar && (
            <p className="text-xs text-warning">
              Este concepto aún no está en la lista: pulsa Enter en Precio o &quot;Agregar&quot;.
            </p>
          )}
        </div>

        {lineas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-strong px-3 py-6 text-center text-sm text-text-muted">
            Aún no hay conceptos. Captura el primero arriba y pulsa Enter en Precio.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-strong">
            <div
              className={`hidden gap-3 border-b border-border-strong bg-surface-2 px-3 py-2 text-xs uppercase tracking-wide text-text-dim ${COLUMNAS}`}
            >
              <span>Descripción</span>
              <span>Clave SAT</span>
              <span>Unidad</span>
              <span className="text-right">Cant.</span>
              <span className="text-right">Precio</span>
              <span className="text-right">Importe</span>
              <span className="text-right">Acciones</span>
            </div>
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {lineas.map((l) => (
                <li
                  key={l.key}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm ${COLUMNAS} ${
                    l.key === editandoKey ? "bg-surface-2" : ""
                  }`}
                >
                  <span className="min-w-0 basis-full truncate font-medium text-text sm:basis-auto" title={l.descripcion}>
                    {l.descripcion}
                  </span>
                  <span className="min-w-0 truncate font-mono text-xs text-text-muted">{l.claveSat || "—"}</span>
                  <span className="min-w-0 truncate text-text-muted">{etiquetaUnidad(l.unidadMedida)}</span>
                  <span className="text-right font-mono tabular-nums">{l.cantidad}</span>
                  <span className="text-right font-mono tabular-nums">{formatCurrency(l.precioUnitario)}</span>
                  <span className="text-right font-mono font-semibold tabular-nums text-primary">
                    {formatCurrency(l.cantidad * l.precioUnitario)}
                  </span>
                  <span className="ml-auto flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${l.descripcion}`}
                      title="Editar"
                      onClick={() => editar(l)}
                      className="rounded px-1.5 py-1 text-text-muted hover:bg-surface-2 hover:text-text"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      aria-label={`Quitar ${l.descripcion}`}
                      title="Quitar"
                      onClick={() => quitar(l.key)}
                      className="rounded px-1.5 py-1 text-text-muted hover:bg-surface-2 hover:text-danger"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
