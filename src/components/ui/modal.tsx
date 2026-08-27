"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Modal base reutilizable — una sola implementación para todo (candado de
 * contraseña, confirmar aceptar/rechazar cotización, cancelar cuenta, dar
 * de baja de activo, etc. — Sección 5 del documento de diseño). `danger`
 * marca visualmente las acciones destructivas (borde superior rojo) para
 * distinguirlas de una confirmación normal (borde plano, sin acento).
 */
export function Modal({
  onClose,
  danger = false,
  children,
}: {
  onClose: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  // Modal solo se monta client-side (siempre detrás de un `{open && ...}`
  // disparado por un evento de usuario), así que `document` ya existe en
  // el primer render — no hace falta un efecto para "activar" el portal.
  const [mounted] = useState(() => typeof document !== "undefined");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative w-full max-w-sm rounded-2xl border bg-surface-1 shadow-xl",
          danger ? "border-danger-strong/50 border-t-4" : "border-border"
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
