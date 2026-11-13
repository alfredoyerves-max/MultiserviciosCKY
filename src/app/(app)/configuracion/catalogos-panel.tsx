"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  crearCategoriaServicioAction,
  crearUnidadAction,
  crearClaveSatAction,
  eliminarCategoriaAction,
  eliminarUnidadAction,
  eliminarClaveSatAction,
} from "./catalogos-actions";
import type { ResultadoAlta } from "@/lib/data/catalogos";
import type { ResultadoBorrado } from "@/lib/dependencias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FieldError, FieldLabel, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmarBorradoModal } from "@/components/ui/confirmar-borrado-modal";
import { buscarClavesSat } from "@/lib/claveSatBusqueda";
import type { Categoria, ClaveSat, UnidadMedida } from "@/generated/prisma/client";

/** Qué se está eliminando: título del modal, texto y la acción del servidor. */
interface Borrado {
  titulo: string;
  descripcion: string;
  accion: () => Promise<ResultadoBorrado>;
}

/**
 * Pestaña "Catálogos": categorías de servicio, unidades y claves SAT. Cada lista permite
 * agregar y eliminar (con modal de confirmación). Todo se guarda al instante; esta pestaña no
 * usa el botón Guardar de Configuración.
 */
export function CatalogosPanel({
  categorias,
  unidades,
  claves,
}: {
  categorias: Categoria[];
  unidades: UnidadMedida[];
  claves: ClaveSat[];
}) {
  const router = useRouter();
  const [borrado, setBorrado] = useState<Borrado | null>(null);
  const [alta, setAlta] = useState<"categoria" | "unidad" | "clave" | null>(null);
  const [filtro, setFiltro] = useState("");

  const clavesVisibles = useMemo(
    () => (filtro.trim() ? buscarClavesSat(claves, filtro, 200) : claves),
    [claves, filtro]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary" title="Agregar o eliminar un elemento se guarda en el momento; no depende del botón Guardar.">
          Se guardan al instante
        </Badge>
        <p className="text-xs text-text-dim">
          Eliminar una unidad o una clave SAT no afecta lo ya guardado: productos y líneas de cotización conservan su copia.
        </p>
      </div>

      <Seccion
        titulo="Categorías de servicio"
        conteo={categorias.length}
        accion={
          <Button type="button" size="sm" variant="secondary" onClick={() => setAlta("categoria")}>
            + Agregar categoría
          </Button>
        }
      >
        {categorias.length === 0 ? (
          <EmptyState title="Sin categorías todavía." />
        ) : (
          <ul className="divide-y divide-border">
            {categorias.map((c) => (
              <Fila
                key={c.id}
                principal={c.nombre}
                onEliminar={() =>
                  setBorrado({
                    titulo: `Eliminar la categoría «${c.nombre}»`,
                    descripcion: "Solo se puede si ningún servicio la usa. Esta acción no se puede deshacer.",
                    accion: () => eliminarCategoriaAction(c.id),
                  })
                }
              />
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion
        titulo="Unidades de medida"
        conteo={unidades.length}
        accion={
          <Button type="button" size="sm" variant="secondary" onClick={() => setAlta("unidad")}>
            + Agregar unidad
          </Button>
        }
      >
        {unidades.length === 0 ? (
          <EmptyState title="Sin unidades todavía." />
        ) : (
          <ul className="divide-y divide-border">
            {unidades.map((u) => (
              <Fila
                key={u.id}
                principal={u.nombre}
                secundario={u.claveSat ? `Clave SAT de unidad: ${u.claveSat}` : "Sin clave SAT de unidad"}
                onEliminar={() =>
                  setBorrado({
                    titulo: `Eliminar la unidad «${u.nombre}»`,
                    descripcion: "Los productos y las líneas de cotización que ya la usan conservan su texto.",
                    accion: () => eliminarUnidadAction(u.id),
                  })
                }
              />
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion
        titulo="Claves SAT (producto/servicio)"
        conteo={claves.length}
        accion={
          <Button type="button" size="sm" variant="secondary" onClick={() => setAlta("clave")}>
            + Agregar clave
          </Button>
        }
      >
        <div className="border-b border-border p-3">
          <Input
            aria-label="Buscar clave SAT"
            placeholder="Buscar por clave o por descripción…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          />
        </div>
        {clavesVisibles.length === 0 ? (
          <EmptyState title={claves.length === 0 ? "Sin claves todavía." : "Ninguna clave coincide con la búsqueda."} />
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {clavesVisibles.map((c) => (
              <Fila
                key={c.id}
                mono={c.clave}
                principal={c.descripcion}
                secundario={c.palabrasSimilares ? `También: ${c.palabrasSimilares}` : undefined}
                etiqueta={c.verificada ? undefined : <Badge tone="warning">No verificada</Badge>}
                onEliminar={() =>
                  setBorrado({
                    titulo: `Eliminar la clave ${c.clave}`,
                    descripcion: `«${c.descripcion}». Las líneas de cotización que ya la usan conservan su copia.`,
                    accion: () => eliminarClaveSatAction(c.id),
                  })
                }
              />
            ))}
          </ul>
        )}
      </Seccion>

      {borrado && (
        <ConfirmarBorradoModal
          titulo={borrado.titulo}
          descripcion={borrado.descripcion}
          onConfirm={async () => {
            const res = await borrado.accion();
            if (res.ok) router.refresh();
            return res;
          }}
          onClose={() => setBorrado(null)}
        />
      )}

      {alta === "categoria" && (
        <AltaModal
          titulo="Nueva categoría de servicio"
          campos={[{ name: "nombre", label: "Nombre", maxLength: 60, placeholder: "Ej. Jardinería" }]}
          onGuardar={(v) => crearCategoriaServicioAction({ nombre: v.nombre })}
          onClose={() => setAlta(null)}
        />
      )}
      {alta === "unidad" && (
        <AltaModal
          titulo="Nueva unidad de medida"
          campos={[
            { name: "nombre", label: "Nombre", maxLength: 30, placeholder: "Ej. Rollo" },
            { name: "claveSat", label: "Clave SAT de unidad (opcional, 3 caracteres)", maxLength: 3, placeholder: "H87", mayusculas: true, opcional: true },
          ]}
          onGuardar={(v) => crearUnidadAction({ nombre: v.nombre, claveSat: v.claveSat })}
          onClose={() => setAlta(null)}
        />
      )}
      {alta === "clave" && (
        <AltaModal
          titulo="Nueva clave SAT"
          ayuda="Las claves que agregas aquí quedan marcadas como «no verificadas»: el sistema no las ha confirmado contra el catálogo oficial del SAT."
          campos={[
            { name: "clave", label: "Clave (8 dígitos)", maxLength: 8, placeholder: "47131805", numerico: true },
            { name: "descripcion", label: "Descripción", maxLength: 200, placeholder: "Limpiadores de propósito general" },
            { name: "palabrasSimilares", label: "Palabras similares (opcional)", maxLength: 200, placeholder: "cloro, desinfectante", opcional: true },
          ]}
          onGuardar={(v) => crearClaveSatAction({ clave: v.clave, descripcion: v.descripcion, palabrasSimilares: v.palabrasSimilares })}
          onClose={() => setAlta(null)}
        />
      )}
    </div>
  );
}

function Seccion({
  titulo,
  conteo,
  accion,
  children,
}: {
  titulo: string;
  conteo: number;
  accion: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-wrap items-center justify-between gap-3">
        <CardTitle>
          {titulo} <span className="ml-1 text-xs font-normal text-text-dim">({conteo})</span>
        </CardTitle>
        {accion}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function Fila({
  principal,
  secundario,
  mono,
  etiqueta,
  onEliminar,
}: {
  principal: string;
  secundario?: string;
  mono?: string;
  etiqueta?: ReactNode;
  onEliminar: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      {mono && <span className="w-24 shrink-0 font-mono text-xs text-text-muted">{mono}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text" title={principal}>
          {principal}
        </p>
        {secundario && <p className="truncate text-xs text-text-dim">{secundario}</p>}
      </div>
      {etiqueta}
      <Button type="button" size="sm" variant="ghost" onClick={onEliminar}>
        Eliminar
      </Button>
    </li>
  );
}

interface CampoAlta {
  name: string;
  label: string;
  maxLength: number;
  placeholder?: string;
  opcional?: boolean;
  mayusculas?: boolean;
  numerico?: boolean;
}

/** Modal de alta con campos de texto; muestra el error de cada campo que devuelve el servidor. */
function AltaModal({
  titulo,
  ayuda,
  campos,
  onGuardar,
  onClose,
}: {
  titulo: string;
  ayuda?: string;
  campos: CampoAlta[];
  onGuardar: (valores: Record<string, string>) => Promise<ResultadoAlta>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAlta | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setResultado(null);
    try {
      const res = await onGuardar(valores);
      if (res.ok) {
        router.refresh();
        onClose();
        return;
      }
      setResultado(res);
    } catch {
      setResultado({ ok: false, error: "No se pudo guardar (falló la conexión). Revisa y vuelve a intentar." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal onClose={pending ? () => {} : onClose}>
      <form onSubmit={enviar} className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-semibold text-text">{titulo}</h3>
        {ayuda && <p className="text-xs text-text-dim">{ayuda}</p>}
        {campos.map((c, i) => (
          <Field key={c.name}>
            <FieldLabel htmlFor={`alta-${c.name}`}>{c.label}</FieldLabel>
            <Input
              id={`alta-${c.name}`}
              autoFocus={i === 0}
              required={!c.opcional}
              maxLength={c.maxLength}
              inputMode={c.numerico ? "numeric" : undefined}
              placeholder={c.placeholder}
              value={valores[c.name] ?? ""}
              onChange={(e) => {
                let v = e.target.value;
                if (c.mayusculas) v = v.toUpperCase();
                if (c.numerico) v = v.replace(/\D/g, "");
                setValores((prev) => ({ ...prev, [c.name]: v }));
              }}
            />
            <FieldError>{resultado?.fieldErrors?.[c.name]}</FieldError>
          </Field>
        ))}
        {resultado?.error && <p className="text-sm text-danger">{resultado.error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
