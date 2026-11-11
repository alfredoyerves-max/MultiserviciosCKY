import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";

// La pantalla intermedia de elegir tipo ya no existe: el botón global
// "+ Nueva cotización" (Servicio / Material) ofrece la elección. Se conserva la
// URL para no romper enlaces guardados; lleva a Servicio, el tipo habitual.
export default async function NuevaCotizacionPage() {
  await requireSession();
  redirect("/cotizaciones/nueva/servicio");
}
