import { cn } from "@/lib/cn";

/** Cifra etiquetada (etiqueta pequeña + valor monoespaciado) usada en los
 *  resúmenes de cotización, cuentas por cobrar/pagar, productos y activos. */
export function ResumenItem({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-dim">{label}</p>
      <p className={cn("font-mono text-lg font-semibold tabular-nums", accent ? "text-primary" : "text-text")}>
        {value}
      </p>
    </div>
  );
}
