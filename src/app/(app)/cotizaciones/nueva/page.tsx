import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NuevaCotizacionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Nueva cotización</h1>
        <p className="text-sm text-text-muted">
          Elige el tipo — servicio y material nunca se combinan en el mismo documento.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cotización de Servicio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              Personal, limpieza, seguridad, mantenimiento y demás servicios del catálogo — el
              precio se calcula a partir del costo real (nómina, IMSS, INFONAVIT, ISN) y el
              margen.
            </p>
            <ButtonLink href="/cotizaciones/nueva/servicio">Continuar</ButtonLink>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cotización de Material</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              Venta de productos del catálogo de Inventario. Al aceptarse, descuenta el stock
              automáticamente.
            </p>
            <ButtonLink href="/cotizaciones/nueva/material">Continuar</ButtonLink>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
