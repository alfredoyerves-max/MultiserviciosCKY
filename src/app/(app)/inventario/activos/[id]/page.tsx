import { getActivo } from "@/lib/data/activos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ACTIVO_CATEGORIA_LABELS,
  ESTADO_ACTIVO_LABELS,
  TIPO_EVENTO_ACTIVO_LABELS,
  type ActivoCategoria,
  type EstadoActivo,
  type TipoEventoActivo,
} from "@/lib/enums";
import { EstadoActivoSelect, DarDeBajaButton, RegistrarIncidenteButton } from "../activo-acciones";

const ESTADO_TONE: Record<EstadoActivo, "success" | "warning" | "neutral"> = {
  FUNCIONAL: "success",
  EN_REPARACION: "warning",
  DADO_DE_BAJA: "neutral",
};

const TIPO_EVENTO_TONE: Record<TipoEventoActivo, "primary" | "warning" | "neutral"> = {
  CAMBIO_ESTADO: "primary",
  INCIDENTE: "warning",
  NOTA: "neutral",
};

export default async function ActivoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activo = await getActivo(id);
  const estado = activo.estado as EstadoActivo;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-text">{activo.nombre}</h1>
            <Badge tone="neutral">{ACTIVO_CATEGORIA_LABELS[activo.categoria as ActivoCategoria]}</Badge>
            <Badge tone={ESTADO_TONE[estado]}>{ESTADO_ACTIVO_LABELS[estado]}</Badge>
          </div>
          {activo.descripcion && <p className="mt-1 text-sm text-text-muted">{activo.descripcion}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {estado !== "DADO_DE_BAJA" && (
            <>
              <EstadoActivoSelect activoId={activo.id} estado={estado} />
              <DarDeBajaButton activoId={activo.id} />
            </>
          )}
          <RegistrarIncidenteButton activoId={activo.id} />
          <ButtonLink href="/inventario" variant="secondary" size="sm">
            ← Volver
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Resumen label="Valor de adquisición" value={formatCurrency(activo.valorAdquisicion)} accent />
        <Resumen label="Fecha de adquisición" value={formatDate(activo.fechaAdquisicion)} />
        <Resumen label="Proveedor" value={activo.proveedor || "—"} />
        <Resumen label="Número de factura" value={activo.numeroFactura || "—"} />
      </div>

      {estado === "DADO_DE_BAJA" && activo.fechaBaja && (
        <p className="text-sm text-text-muted">Dado de baja el {formatDate(activo.fechaBaja)}.</p>
      )}
      {activo.notas && <p className="text-sm text-text-dim">{activo.notas}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Historial de eventos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activo.eventos.length === 0 ? (
            <EmptyState title="Sin eventos todavía." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {activo.eventos.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-text-muted">{formatDate(e.fecha)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={TIPO_EVENTO_TONE[e.tipo as TipoEventoActivo]}>
                        {TIPO_EVENTO_ACTIVO_LABELS[e.tipo as TipoEventoActivo]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-text">
                      {e.descripcion}
                      {e.estadoAnterior && e.estadoNuevo && (
                        <span className="ml-2 text-xs text-text-dim">
                          ({ESTADO_ACTIVO_LABELS[e.estadoAnterior as EstadoActivo]} →{" "}
                          {ESTADO_ACTIVO_LABELS[e.estadoNuevo as EstadoActivo]})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Resumen({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-dim">{label}</p>
      <p className={`font-mono text-lg font-semibold tabular-nums ${accent ? "text-primary" : "text-text"}`}>
        {value}
      </p>
    </div>
  );
}
