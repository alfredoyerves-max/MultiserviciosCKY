import type { ReactNode } from "react";

/**
 * Encabezado único de pantalla: título (siempre en el acento del sistema) +
 * subtítulo opcional + UN botón primario opcional (`action`). Las demás
 * acciones van como secundarias o dentro de un menú "⋯".
 */
export function PageHeader({
  title,
  description,
  hint,
  action,
}: {
  title: string;
  description?: string;
  /** Explicación larga como tooltip junto al subtítulo (ⓘ). */
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-primary">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-text-muted">
            {description}
            {hint && (
              <span
                title={hint}
                aria-label={hint}
                tabIndex={0}
                className="ml-1.5 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border-strong align-middle text-[10px] text-text-dim"
              >
                i
              </span>
            )}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
