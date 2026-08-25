import { listCotizacionesKanban } from "@/lib/data/cotizaciones";
import { ButtonLink } from "@/components/ui/button";
import { KanbanBoard } from "./kanban-board";

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; soporte?: string }>;
}) {
  const sp = await searchParams;

  const hoy = new Date();
  const [anioStr, mesStr] = (
    sp.mes ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
  ).split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  const incluirSoporte = sp.soporte === "1";

  const cotizaciones = await listCotizacionesKanban({ anio, mes, incluirSoporte });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Cotizaciones</h1>
          <p className="text-sm text-text-muted">
            Seguimiento del pipeline por estado. Usa el mes y el filtro de soporte para
            explorar el historial.
          </p>
        </div>
        <ButtonLink href="/cotizaciones/nueva">+ Nueva cotización</ButtonLink>
      </div>

      <KanbanBoard cotizaciones={cotizaciones} anio={anio} mes={mes} incluirSoporte={incluirSoporte} />
    </div>
  );
}
