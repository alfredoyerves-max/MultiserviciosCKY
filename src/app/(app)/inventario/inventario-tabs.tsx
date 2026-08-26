"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { ProductosPanel } from "./productos-panel";
import type { Producto } from "@/generated/prisma/client";

type ProductoConMovimientos = Producto & { movimientos: { tipo: string; cantidad: number }[] };

export function InventarioTabs({ productos }: { productos: ProductoConMovimientos[] }) {
  const [tab, setTab] = useState<"inventario" | "activos">("inventario");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === "inventario"} onClick={() => setTab("inventario")}>
          Inventario
        </TabButton>
        <TabButton active={tab === "activos"} onClick={() => setTab("activos")}>
          Activos
        </TabButton>
      </div>

      {tab === "inventario" ? (
        <ProductosPanel productos={productos} />
      ) : (
        <Card className="p-6 text-center text-sm text-text-dim">
          Control de Activos — próximamente (Fase 10).
        </Card>
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
