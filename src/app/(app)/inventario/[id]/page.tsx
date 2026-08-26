import { getProducto } from "@/lib/data/productos";
import { calcularStock } from "@/lib/inventario";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { UNIDAD_MEDIDA_LABELS, MOTIVO_SALIDA_LABELS, type UnidadMedida, type MotivoSalida } from "@/lib/enums";
import { RegistrarEntradaButton, RegistrarSalidaButton } from "../movimiento-buttons";

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const producto = await getProducto(id);
  const stock = calcularStock(producto.movimientos);
  const unidadLabel = UNIDAD_MEDIDA_LABELS[producto.unidadMedida as UnidadMedida];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-text">{producto.nombre}</h1>
            <Badge tone="primary">{unidadLabel}</Badge>
            {!producto.activo && <Badge tone="danger">Inactivo</Badge>}
          </div>
          {producto.descripcion && (
            <p className="mt-1 text-sm text-text-muted">{producto.descripcion}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RegistrarEntradaButton productoId={producto.id} />
          <RegistrarSalidaButton productoId={producto.id} />
          <ButtonLink href="/inventario" variant="secondary" size="sm">
            ← Volver
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Resumen label="Stock actual" value={`${stock} ${unidadLabel}`} accent />
        <Resumen
          label="Último costo de compra"
          value={producto.costoCompraReciente != null ? formatCurrency(producto.costoCompraReciente) : "—"}
        />
        <Resumen
          label="Precio de venta sugerido"
          value={producto.precioVentaSugerido != null ? formatCurrency(producto.precioVentaSugerido) : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de movimientos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {producto.movimientos.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-text-dim">Sin movimientos todavía.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Detalle</th>
                  <th className="px-5 py-3 text-right font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {producto.movimientos.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-text-muted">{formatDate(m.fecha)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={m.tipo === "ENTRADA" ? "success" : "secondary"}>
                        {m.tipo === "ENTRADA" ? "Entrada" : "Salida"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-text-dim">
                      {m.tipo === "ENTRADA" ? (
                        <>
                          {m.proveedor}
                          {m.costoUnitario != null && ` · ${formatCurrency(m.costoUnitario)}/u`}
                        </>
                      ) : (
                        <>
                          {MOTIVO_SALIDA_LABELS[m.motivoSalida as MotivoSalida]}
                          {m.referencia && ` · ${m.referencia}`}
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-text">
                      {m.tipo === "ENTRADA" ? "+" : "-"}
                      {m.cantidad}
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
