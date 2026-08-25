import { Card } from "./card";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          accent ? "text-primary" : "text-text"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-text-dim">{hint}</p>}
    </Card>
  );
}
