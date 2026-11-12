"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/lib/auth/actions";
import { ThemeToggle } from "./theme-toggle";
import { NuevaCotizacionMenu } from "./nueva-cotizacion-menu";
import type { ReactNode } from "react";

/**
 * Un solo acento (turquesa, --color-primary) para todo el menú: el color queda
 * reservado a los estados (rojo vencido, ámbar aviso, verde pagado).
 */
const NAV_ITEM_ACTIVE = "bg-primary/15 text-primary";

// Seis ítems, iguales en la barra lateral y en la barra inferior. "short" es la
// etiqueta de la barra inferior (390 px). Finanzas agrupa Pagos y Cobros (/pagos);
// la Fase 8 le suma Gastos y Resultados.
const NAV_ITEMS = [
  { href: "/", label: "Dashboard", short: "Dashboard", icon: DashboardIcon },
  { href: "/cotizaciones", label: "Cotizaciones", short: "Cotizaciones", icon: QuoteIcon },
  { href: "/servicios", label: "Servicios", short: "Servicios", icon: ServiceIcon },
  { href: "/pagos", label: "Finanzas", short: "Finanzas", icon: PagosIcon },
  { href: "/inventario", label: "Inventario y Activos", short: "Inventario", icon: InventarioIcon },
  { href: "/configuracion", label: "Configuración", short: "Config.", icon: SettingsIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // El botón global se oculta en las propias pantallas de nueva cotización.
  const mostrarNueva = !pathname.startsWith("/cotizaciones/nueva");

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Header compacto — solo móvil/tablet (<lg). Logo/nombre siempre
          visible + toggle de tema + menú con Configuración/Cerrar sesión,
          que no caben en la barra inferior de 5 íconos. */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 lg:hidden"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      >
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
            <Image
              src="/branding/logo-icon.png"
              alt="Carlos Yerves Multiservicios"
              width={32}
              height={32}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <p className="truncate text-sm font-semibold text-text">Carlos Yerves Multiservicios</p>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          {mostrarNueva && <NuevaCotizacionMenu />}
          <ThemeToggle compact />
          <MobileMenu />
        </div>
      </header>

      {/* Barra lateral — solo escritorio (≥lg). */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface px-4 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
            <Image
              src="/branding/logo-icon.png"
              alt="Carlos Yerves Multiservicios"
              width={36}
              height={36}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <p className="text-sm font-semibold text-text leading-tight">Carlos Yerves Multiservicios</p>
        </div>

        {/* Botón global — en escritorio vive aquí, bajo el logo; en móvil/tablet, en el header. */}
        {mostrarNueva && <NuevaCotizacionMenu block className="mb-4" />}

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? NAV_ITEM_ACTIVE
                    : "text-text-muted hover:bg-surface-2 hover:text-text"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
          <ThemeToggle />
          <p className="px-2 text-[11px] text-text-dim">© 2026 Carlos Yerves Multiservicios</p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <LogoutIcon className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>

      {/* Barra inferior — solo móvil/tablet (<lg), patrón tipo app
          (Instagram/WhatsApp). Fija, con scroll interno propio si algún
          día se agrega un ícono más — hoy los 5 caben sin problema incluso
          en 390px. safe-area-inset-bottom para el home indicator de iOS. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-surface lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-0 px-0.5 py-2 text-[10px] font-medium leading-tight tracking-tight transition-colors",
                active ? "text-primary" : "text-text-dim hover:text-text-muted"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate text-center">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Menú del header compacto — agrupa Configuración y Cerrar sesión, los
 * dos accesos de la barra lateral que no caben en la barra inferior.
 * Se cierra solo (click afuera / Escape / navegar).
 */
function MobileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cuenta"
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <LogoutIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-48 rounded-lg border border-border bg-surface-1 py-1 shadow-xl">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <LogoutIcon className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function DashboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function QuoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </svg>
  );
}

function ServiceIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M14.7 6.3a4 4 0 0 1-5.6 5.6L4 17v3h3l5.1-5.1a4 4 0 0 1 5.6-5.6L14.7 6.3Z" />
      <path d="M17 3l1 1.5L20 5l-1.5 1L18 8l-1.5-1L15 8l.5-2L14 5l2-1.5L17 3Z" />
    </svg>
  );
}

function InventarioIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M3 7l9-4 9 4-9 4-9-4Z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

function PagosIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.04Z" />
    </svg>
  );
}

function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
