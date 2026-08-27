import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

const tones = {
  neutral: "bg-surface-2 text-text-muted border-border-strong",
  primary: "bg-primary/15 text-primary border-primary/30",
  success: "bg-success/15 text-success-soft border-success/30",
  danger: "bg-danger-strong/20 text-danger border-danger-strong/40",
  secondary: "bg-secondary/15 text-secondary-soft border-secondary/30",
  warning: "bg-warning/15 text-warning-soft border-warning/30",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof tones;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
