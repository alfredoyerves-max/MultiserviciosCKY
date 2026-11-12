"use client";

import { useEffect, useState } from "react";

/** Segundos tras los cuales una operación en curso se avisa como lenta. */
export const AVISO_LENTO_MS = 15_000;

/** `true` cuando `pendiente` lleva más de `ms` encendido (por defecto 15 s). */
export function useAvisoLento(pendiente: boolean, ms = AVISO_LENTO_MS) {
  const [lento, setLento] = useState(false);
  useEffect(() => {
    if (!pendiente) return;
    const t = setTimeout(() => setLento(true), ms);
    return () => {
      clearTimeout(t);
      setLento(false);
    };
  }, [pendiente, ms]);
  return lento;
}

export const TEXTO_AVISO_LENTO =
  "Esto tarda más de lo normal. No vuelvas a pulsar: la operación puede estar registrándose. " +
  "Si no termina, cierra esta ventana y revisa la cuenta antes de reintentar.";
