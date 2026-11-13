"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { buscarClavesSat } from "@/lib/claveSatBusqueda";
import { claveSatValida, CLAVE_SAT_REGEX, MENSAJE_CLAVE_SAT } from "@/lib/claveSat";

export interface ClaveCatalogo {
  clave: string;
  descripcion: string;
  palabrasSimilares: string | null;
  verificada: boolean;
}

/**
 * Campo de Clave SAT de una línea: al escribir sugiere del catálogo, por clave o por descripción
 * ("bolsas", "cloro"…); al elegir una sugerencia pone su clave de 8 dígitos. Sigue exigiendo 8
 * dígitos (vacío = sin clave). Una clave válida que no está en el catálogo solo muestra un aviso
 * ámbar, sin bloquear.
 */
export function ClaveSatInput({
  value,
  onChange,
  claves,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  claves: ClaveCatalogo[];
  /** Teclas de la fila de captura (Enter no debe enviar el formulario de la cotización). */
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}) {
  const [enfocado, setEnfocado] = useState(false);
  const [activo, setActivo] = useState(0);

  const exactaEnCatalogo = claves.some((c) => c.clave === value.trim());
  const sugerencias = useMemo(
    () => (enfocado && !exactaEnCatalogo ? buscarClavesSat(claves, value, 6) : []),
    [enfocado, exactaEnCatalogo, claves, value]
  );
  const indice = Math.min(activo, Math.max(sugerencias.length - 1, 0));

  // Mientras se busca por palabras no se marca el error; aparece al salir del campo o al agregar.
  const buscandoPorTexto = enfocado && /\D/.test(value);
  const mostrarError = !claveSatValida(value) && !buscandoPorTexto;
  const fueraDeCatalogo = CLAVE_SAT_REGEX.test(value.trim()) && !exactaEnCatalogo;

  function elegir(clave: string) {
    onChange(clave);
    setActivo(0);
  }

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (sugerencias.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActivo((indice + 1) % sugerencias.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActivo((indice - 1 + sugerencias.length) % sugerencias.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        elegir(sugerencias[indice].clave);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setEnfocado(false);
        return;
      }
    }
    onKeyDown(e);
  }

  return (
    <div className="relative">
      <Input
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={sugerencias.length > 0}
        aria-invalid={mostrarError}
        placeholder="Clave o descripción"
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        onChange={(e) => {
          onChange(e.target.value);
          setActivo(0);
        }}
        onKeyDown={teclas}
      />
      {sugerencias.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-64 w-[min(28rem,80vw)] overflow-y-auto rounded-lg border border-border-strong bg-surface-1 py-1 shadow-xl"
        >
          {sugerencias.map((c, i) => (
            <li key={c.clave} role="option" aria-selected={i === indice}>
              <button
                type="button"
                // mousedown (no click) para que el campo no pierda el foco antes de elegir.
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(c.clave);
                }}
                className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-2 ${i === indice ? "bg-surface-2" : ""}`}
              >
                <span className="shrink-0 font-mono text-xs text-text-muted">{c.clave}</span>
                <span className="min-w-0 flex-1 truncate text-text">{c.descripcion}</span>
                {!c.verificada && <span className="shrink-0 text-xs text-warning-soft">no verificada</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {mostrarError && <p className="mt-1 text-xs text-danger">{MENSAJE_CLAVE_SAT}</p>}
      {!mostrarError && fueraDeCatalogo && <p className="mt-1 text-xs text-warning-soft">No está en tu catálogo</p>}
    </div>
  );
}
