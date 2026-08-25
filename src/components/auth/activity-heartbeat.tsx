"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Marca la sesión como "activa" cada 2 min, pero solo si hubo interacción
// real (mouse/teclado/scroll/touch) desde el último ping — así 30 min sin
// tocar nada cierra la sesión aunque la pestaña siga abierta, que es lo
// que pide el auto-cierre por inactividad.
const PING_INTERVAL_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export function ActivityHeartbeat() {
  const router = useRouter();
  const activeSinceLastPing = useRef(true);

  useEffect(() => {
    const markActive = () => {
      activeSinceLastPing.current = true;
    };
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, markActive, { passive: true });
    }

    const interval = setInterval(async () => {
      if (!activeSinceLastPing.current) return;
      activeSinceLastPing.current = false;
      try {
        const res = await fetch("/api/auth/heartbeat", { method: "POST" });
        const data = await res.json();
        if (!data.authenticated) {
          router.push("/login");
        }
      } catch {
        // Falla de red puntual: no cerramos sesión por esto.
      }
    }, PING_INTERVAL_MS);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, markActive);
      }
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
