import { listCotizacionesKanban, resumenHistorico } from "@/lib/data/cotizaciones";
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

  const incluirSoporte = sp.soporte === "1";
  const tipo = TIPOS_COTIZACION.includes(sp.tipo as TipoCotizacion)
    ? (sp.tipo as TipoCotizacion)
    : undefined;

  // Histórico: por defecto se abre en el mes más reciente que tenga datos (no
  // en el mes calendario, que puede estar vacío). "todo" muestra todo el
  // histórico; un mes explícito en la URL gana sobre el valor por defecto.
  const resumen = await resumenHistorico({ incluirSoporte, tipo });
  const hoy = new Date();
  const porDefecto = resumen.ultimoMes ?? { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
  const todo = sp.mes === "todo";
  const [anioStr, mesStr] = (sp.mes && !todo ? sp.mes : `${porDefecto.anio}-${porDefecto.mes}`).split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  const mesPorDefecto = `${porDefecto.anio}-${String(porDefecto.mes).padStart(2, "0")}`;

  const cotizaciones = await listCotizacionesKanban({ anio, mes, todo, incluirSoporte, tipo });

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
        todo={todo}
        totalHistorico={resumen.total}
        mesPorDefecto={mesPorDefecto}
        incluirSoporte={incluirSoporte}
        tipo={tipo}
      />
    </div>
  );
}
