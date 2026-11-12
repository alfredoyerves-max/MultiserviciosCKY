"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Pantalla de error amigable: sin stack ni mensaje técnico (esos solo van a la
 * consola). `retry` vuelve a pedir los datos al servidor, que es lo que
 * resuelve un corte momentáneo de la conexión a la base.
 */
export function ErrorPanel({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
        <h2 className="text-lg font-semibold text-text">No pudimos cargar esta pantalla</h2>
        <p className="text-sm text-text-muted">
          Fue un problema momentáneo, no se perdió ningún dato. Intenta de nuevo; si sigue pasando, avísanos.
        </p>
        <Button onClick={() => retry()}>Reintentar</Button>
      </Card>
    </div>
  );
}
