"use client";

import { Input, Select } from "@/components/ui/input";
import { etiquetaUnidad } from "@/lib/enums";

const OTRA = "_otra_";
const SIN_ELEGIR = "_none_";

/**
 * Unidad de medida a partir del catálogo (Configuración › Catálogos). En una línea de cotización
 * (`permitirOtra`) se puede elegir "Otra…" y escribirla a mano en la misma fila (hasta 20
 * caracteres); en el formulario de Producto solo se elige del catálogo. El valor es siempre el
 * texto final de la unidad. Un valor que ya está guardado pero no está en el catálogo (por ejemplo
 * el código antiguo "GALON") se sigue mostrando. Si se pasa `name`, también viaja en un campo oculto.
 */
export function UnidadSelect({
  value,
  onChange,
  unidades,
  permitirOtra = true,
  name,
  className,
}: {
  value: string;
  onChange: (valor: string) => void;
  unidades: { nombre: string }[];
  permitirOtra?: boolean;
  name?: string;
  className?: string;
}) {
  const etiqueta = value ? etiquetaUnidad(value) : "";
  const enCatalogo = unidades.find((u) => u.nombre.toLowerCase() === etiqueta.toLowerCase());
  // Sin "Otra…": el valor guardado que no está en el catálogo se ofrece como una opción más.
  const huerfana = !permitirOtra && value !== "" && !enCatalogo;

  const seleccionada = enCatalogo ? enCatalogo.nombre : permitirOtra ? OTRA : value === "" ? SIN_ELEGIR : value;
  const modoOtra = permitirOtra && !enCatalogo;

  return (
    // Con "Otra…" el texto va a un lado del selector, dentro de la misma fila (no debajo).
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <Select
        aria-label="Unidad"
        className={modoOtra ? "w-[5.25rem] shrink-0 px-2" : undefined}
        value={seleccionada}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === OTRA || v === SIN_ELEGIR ? "" : v);
        }}
      >
        {!permitirOtra && value === "" && <option value={SIN_ELEGIR}>Selecciona…</option>}
        {huerfana && <option value={value}>{etiqueta}</option>}
        {unidades.map((u) => (
          <option key={u.nombre} value={u.nombre}>
            {u.nombre}
          </option>
        ))}
        {permitirOtra && <option value={OTRA}>Otra…</option>}
      </Select>
      {modoOtra && (
        <Input
          aria-label="Otra unidad"
          className="min-w-0 flex-1"
          value={etiqueta}
          maxLength={20}
          autoFocus={value === ""}
          placeholder="Escribe la unidad"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        />
      )}
    </div>
  );
}
