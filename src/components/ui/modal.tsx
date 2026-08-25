"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
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
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface-1 shadow-xl">
        {children}
      </div>
    </div>,
    document.body
  );
}
