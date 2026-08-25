import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

// Tocado por ActivityHeartbeat mientras hay actividad real del usuario
// (mouse/teclado) en una pestaña abierta. Extiende la sesión 30 min más
// vía el efecto lateral de getSession — así el auto-cierre por
// inactividad mide inactividad real, no solo ausencia de navegación.
export async function POST() {
  const user = await getSession();
  return NextResponse.json({ authenticated: !!user });
}
