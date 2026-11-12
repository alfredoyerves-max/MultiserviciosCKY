"use client";

import { Input, Select } from "@/components/ui/input";
import { UNIDADES_MEDIDA, UNIDAD_MEDIDA_LABELS } from "@/lib/enums";

const OTRA = "_otra_";

/**
 * Unidad de una línea de cotización: las del catálogo más "Otra…", que abre un
 * campo para escribirla a mano (hasta 20 caracteres). El valor es siempre el
 * texto final (código del catálogo o el texto capturado).
 */
export function UnidadSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (valor: string) => void;
  className?: string;
}) {
  const conocida = (UNIDADES_MEDIDA as readonly string[]).includes(value);
  return (
    <div className={className}>
      <Select
        aria-label="Unidad"
        value={conocida ? value : OTRA}
        onChange={(e) => onChange(e.target.value === OTRA ? "" : e.target.value)}
      >
        {UNIDADES_MEDIDA.map((u) => (
          <option key={u} value={u}>
            {UNIDAD_MEDIDA_LABELS[u]}
          </option>
        ))}
        <option value={OTRA}>Otra…</option>
      </Select>
      {!conocida && (
        <Input
          aria-label="Otra unidad"
          className="mt-1"
          value={value}
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
