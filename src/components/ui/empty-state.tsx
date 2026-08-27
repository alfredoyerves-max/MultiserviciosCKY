import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Empty state unificado (Sección 5 del documento de diseño) — ícono
 * minimalista + mensaje claro + botón de acción cuando aplica. Sin
 * envoltorio propio (ni Card ni tabla) para poder usarse tanto dentro de
 * un <Card> como dentro de un <td colSpan> de una tabla.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-10 text-center", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-dim">
        <InboxIcon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {description && <p className="max-w-xs text-xs text-text-dim">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

function InboxIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M3 12h4l2 3h6l2-3h4" />
      <path d="M5.5 6h13a1 1 0 0 1 .98.79L21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6l1.52-5.21A1 1 0 0 1 5.5 6Z" />
    </svg>
  );
}
