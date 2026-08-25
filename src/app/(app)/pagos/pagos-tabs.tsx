"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { CobrarPanel, type CuentaPorCobrarConDatos } from "./cobrar-panel";
import { PagarPanel, type CuentaPorPagarConDatos } from "./pagar-panel";

export function PagosTabs({
  cuentasPorCobrar,
  cuentasPorPagar,
}: {
  cuentasPorCobrar: CuentaPorCobrarConDatos[];
  cuentasPorPagar: CuentaPorPagarConDatos[];
}) {
  const [tab, setTab] = useState<"cobrar" | "pagar">("cobrar");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === "cobrar"} onClick={() => setTab("cobrar")}>
          Por Cobrar
        </TabButton>
        <TabButton active={tab === "pagar"} onClick={() => setTab("pagar")}>
          Por Pagar
        </TabButton>
      </div>

      {tab === "cobrar" ? (
        <CobrarPanel cuentas={cuentasPorCobrar} />
      ) : (
        <PagarPanel cuentas={cuentasPorPagar} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-text-muted hover:text-text"
      )}
    >
      {children}
    </button>
  );
}
