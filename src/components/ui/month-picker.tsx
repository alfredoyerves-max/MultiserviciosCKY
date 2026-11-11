"use client";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Selector de mes propio (‹ nov 2026 ›), en lugar del calendario nativo.
 *  `value` es "AAAA-MM"; `onChange` recibe el mismo formato. */
export function MonthPicker({
  value,
  onChange,
  label = "Mes",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [anio, mes] = value.split("-").map(Number);

  function mover(delta: number) {
    const d = new Date(anio, mes - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-3 hover:text-text";

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-9 items-center rounded-lg border border-border-strong bg-surface-2"
    >
      <button type="button" className={btn} onClick={() => mover(-1)} aria-label="Mes anterior">
        ‹
      </button>
      <span className="min-w-20 select-none px-1 text-center text-sm font-medium text-text" aria-live="polite">
        {MESES[mes - 1]} {anio}
      </span>
      <button type="button" className={btn} onClick={() => mover(1)} aria-label="Mes siguiente">
        ›
      </button>
    </div>
  );
}
