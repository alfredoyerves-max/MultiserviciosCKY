import { listCotizacionesKanban } from "@/lib/data/cotizaciones";
import { KanbanBoard } from "./kanban-board";
import { PageHeader } from "@/components/ui/page-header";
import { TIPOS_COTIZACION, type TipoCotizacion } from "@/lib/enums";
import { requireSession } from "@/lib/auth/session";

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; soporte?: string; tipo?: string }>;
}) {
  await requireSession();
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

  // El botón primario de esta pantalla es el "+ Nueva cotización" global del
  // menú superior; no se repite aquí.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cotizaciones"
        description="Seguimiento de tus cotizaciones."
        hint="Lo abierto (Borrador y Enviada) se ve siempre, sin importar el mes. El selector de mes filtra solo el histórico (Aceptadas y Rechazadas)."
      />
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
