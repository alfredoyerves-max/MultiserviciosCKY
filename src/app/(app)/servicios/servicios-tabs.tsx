"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { PuestosPanel } from "./puestos-panel";
import { ServiciosPanel } from "./servicios-panel";
import type { Puesto, Servicio } from "@/generated/prisma/client";
import type { CostConfigInput } from "@/lib/costEngine";

type ServicioConPuesto = Servicio & { puesto: Puesto | null };

export function ServiciosTabs({
  servicios,
  puestos,
  config,
}: {
  servicios: ServicioConPuesto[];
  puestos: Puesto[];
  config: CostConfigInput;
}) {
  const [tab, setTab] = useState<"servicios" | "puestos">("servicios");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === "servicios"} onClick={() => setTab("servicios")}>
          Catálogo de servicios
        </TabButton>
        <TabButton active={tab === "puestos"} onClick={() => setTab("puestos")}>
          Puestos
        </TabButton>
      </div>

      {tab === "servicios" ? (
        <ServiciosPanel servicios={servicios} puestos={puestos} config={config} />
      ) : (
        <PuestosPanel puestos={puestos} />
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
