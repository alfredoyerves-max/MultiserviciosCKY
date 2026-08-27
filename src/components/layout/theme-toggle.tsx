"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "quotly-theme";
type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Selector de tema oscuro/claro (Sección 2 del documento de diseño) —
 * persistente en localStorage, visible en la barra lateral. La identidad
 * de marca sigue siendo oscura por defecto (glassmorphism + acento cian);
 * claro es una alternancia explícita, no depende de la preferencia del
 * sistema operativo. El <script> bloqueante en layout.tsx ya fijó
 * data-theme antes del primer paint — aquí solo se sincroniza el estado
 * de React con lo que el DOM ya tiene, para no causar un parpadeo.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Sincroniza con el atributo que ya fijó el script bloqueante de
    // layout.tsx antes del primer paint — leer ese valor en el estado
    // inicial de useState (en vez de en un efecto) causaría un mismatch
    // de hidratación, porque el servidor nunca conoce data-theme.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza desde una fuente externa al DOM (el script de layout.tsx), no desde props/estado de React.
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      {theme === "dark" ? <MoonIcon className="h-4 w-4 shrink-0" /> : <SunIcon className="h-4 w-4 shrink-0" />}
      {theme === "dark" ? "Modo oscuro" : "Modo claro"}
    </button>
  );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
