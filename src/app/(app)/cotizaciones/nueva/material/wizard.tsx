"use client";

import { useActionState, useState } from "react";
import { createCotizacionMaterialAction, type CotizacionActionState } from "../../actions";
import { ClienteStep, ClienteHiddenFields, useClienteCotizacion } from "../cliente-step";
import { ResumenCotizacionCard } from "../resumen-card";
import { ConceptosMaterial, type LineaMaterial } from "./conceptos-material";
import type { Cliente, Producto } from "@/generated/prisma/client";

const initialState: CotizacionActionState = { ok: false };

export function Wizard({
  productos,
  clientes,
  ivaPct,
  retencionIsrPct,
}: {
  productos: Producto[];
  clientes: Cliente[];
  ivaPct: number;
  retencionIsrPct: number;
}) {
  const { estado: cliente, tipoClienteActivo } = useClienteCotizacion(clientes);
  const [diasVigencia, setDiasVigencia] = useState(15);
  const [esSoporte, setEsSoporte] = useState(false);
  const [lineas, setLineas] = useState<LineaMaterial[]>([]);

  // Mismo cálculo de siempre: importe = cantidad × precio; subtotal = suma de importes.
  const subtotal = lineas.reduce((sum, l) => sum + l.cantidad * l.precioUnitario, 0);

  const [state, formAction, pending] = useActionState(createCotizacionMaterialAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
      <input
        type="hidden"
        name="lineasMaterialJson"
        value={JSON.stringify(lineas.map(({ productoId, claveSat, descripcion, unidadMedida, cantidad, precioUnitario }) => ({ productoId, claveSat, descripcion, unidadMedida, cantidad, precioUnitario })))}
      />
      <ClienteHiddenFields estado={cliente} />

      <div className="flex flex-col gap-6">
      <ClienteStep clientes={clientes} {...cliente} />

      <ConceptosMaterial productos={productos} lineas={lineas} setLineas={setLineas} />
      </div>

      <ResumenCotizacionCard
        titulo="Resumen"
        diasVigencia={diasVigencia}
        setDiasVigencia={setDiasVigencia}
        esSoporte={esSoporte}
        setEsSoporte={setEsSoporte}
        subtotal={subtotal}
        tipoClienteActivo={tipoClienteActivo}
        ivaPct={ivaPct}
        retencionIsrPct={retencionIsrPct}
        error={state.error}
        pending={pending}
        sinLineas={lineas.length === 0}
        bloqueo={cliente.errorCliente}
      />
    </form>
  );
}
