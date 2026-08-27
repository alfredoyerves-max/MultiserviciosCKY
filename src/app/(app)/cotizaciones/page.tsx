import { listCotizacionesKanban } from "@/lib/data/cotizaciones";
import { ButtonLink } from "@/components/ui/button";
import { KanbanBoard } from "./kanban-board";
import { TIPOS_COTIZACION, type TipoCotizacion } from "@/lib/enums";

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; soporte?: string; tipo?: string }>;
}) {
  const sp = await searchParams;

  const hoy = new Date();
  const [anioStr, mesStr] = (
    sp.mes ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
  ).split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  const incluirSoporte = sp.soporte === "1";
  const tipo = TIPOS_COTIZACION.includes(sp.tipo as TipoCotizacion)
    ? (sp.tipo as TipoCotizacion)
    : undefined;

  const cotizaciones = await listCotizacionesKanban({ anio, mes, incluirSoporte, tipo });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">Cotizaciones</h1>
          <p className="text-sm text-text-muted">
            Seguimiento del pipeline por estado. Usa el mes y el filtro de soporte para
            explorar el historial.
          </p>
        </div>
        <ButtonLink href="/cotizaciones/nueva">+ Nueva cotización</ButtonLink>
      </div>

      <KanbanBoard
        cotizaciones={cotizaciones}
        anio={anio}
        mes={mes}
        incluirSoporte={incluirSoporte}
        tipo={tipo}
      />
    </div>
  );
}
