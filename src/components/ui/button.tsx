import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-strong",
  secondary:
    "bg-surface-2 text-text border border-border-strong hover:bg-surface-3",
  ghost: "text-text-muted hover:text-text hover:bg-surface-2",
  danger: "bg-danger-strong text-danger hover:opacity-90",
};

const sizes = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-5",
};

interface ButtonOwnProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

type ButtonProps = ButtonOwnProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}

type ButtonLinkProps = ButtonOwnProps & ComponentProps<typeof Link>;

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkProps) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
