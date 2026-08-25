"use server";

import {
  createCotizacion,
  updateEstadoCotizacion,
  asegurarCambioEstadoPermitido,
} from "@/lib/data/cotizaciones";
import {
  generarCuentaPorCobrar,
  existeCuentaPorCobrar,
  eliminarCuentaPorCobrarPorCotizacion,
} from "@/lib/data/cuentasPorCobrar";
import { cotizacionInputSchema } from "@/lib/schemas/cotizacion";
import { generarCuentaPorCobrarSchema } from "@/lib/schemas/cuentas";
import { estadoCotizacionSchema } from "@/lib/enums";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface CotizacionActionState {
  ok: boolean;
  error?: string;
}

export async function createCotizacionAction(
  _prev: CotizacionActionState,
  formData: FormData
): Promise<CotizacionActionState> {
  await requireSession();

  const lineasJson = formData.get("lineasJson");
  const clienteNuevoJson = formData.get("clienteNuevoJson");

  let lineas: unknown = [];
  try {
    lineas = lineasJson ? JSON.parse(String(lineasJson)) : [];
  } catch {
    return { ok: false, error: "Las líneas de servicio no son válidas." };
  }

  let clienteNuevo: unknown = undefined;
  if (clienteNuevoJson && String(clienteNuevoJson) !== "") {
    try {
      clienteNuevo = JSON.parse(String(clienteNuevoJson));
    } catch {
      return { ok: false, error: "Los datos del cliente nuevo no son válidos." };
    }
  }

  const clienteId = formData.get("clienteId");

  const parsed = cotizacionInputSchema.safeParse({
    clienteId: clienteId ? String(clienteId) : undefined,
    clienteNuevo,
    proyecto: formData.get("proyecto") ?? undefined,
    margenUtilidadPct: formData.get("margenUtilidadPct"),
    diasVigencia: formData.get("diasVigencia"),
    esSoporte: formData.get("esSoporte") === "on",
    lineas,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  if (!parsed.data.clienteId && !parsed.data.clienteNuevo) {
    return { ok: false, error: "Selecciona un cliente existente o captura uno nuevo." };
  }

  let cotizacion;
  try {
    cotizacion = await createCotizacion(parsed.data);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al crear la cotización." };
  }

  revalidatePath("/cotizaciones");
  revalidatePath("/");
  redirect(`/cotizaciones/${cotizacion.id}`);
}

// Solo para transiciones Borrador <-> Enviada, que no disparan nada
// financiero. Aceptada/Rechazada pasan por confirmarAceptacionAction /
// confirmarRechazoAction (modal de confirmación obligatorio). En ambos
// casos se revisa asegurarCambioEstadoPermitido: si la cotización está
// ACEPTADA y su cuenta por cobrar ya tiene abonos, no se puede mover a
// ningún otro estado (ver lib/data/cotizaciones.ts).
export async function updateEstadoAction(id: string, estado: string) {
  await requireSession();
  const parsed = estadoCotizacionSchema.safeParse(estado);
  if (!parsed.success) throw new Error("Estado inválido.");
  if (parsed.data === "ACEPTADA" || parsed.data === "RECHAZADA") {
    throw new Error("Este cambio de estado requiere confirmación — usa el modal correspondiente.");
  }
  await asegurarCambioEstadoPermitido(id, parsed.data);
  await updateEstadoCotizacion(id, parsed.data);
  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath("/cotizaciones");
}

/**
 * Confirma la aceptación de una cotización: cambia el estado a ACEPTADA y
 * genera su cuenta por cobrar (netoARecibir + la fecha de vencimiento
 * capturada en el modal) — pero SOLO si esta cotización todavía no tiene
 * una. Si ya existe (ej. se movió a Borrador sin abonos y se vuelve a
 * aceptar), se reutiliza tal cual: no se pide fecha de vencimiento nueva
 * ni se crea un segundo registro, solo se actualiza el estado.
 */
export async function confirmarAceptacionAction(
  _prev: CotizacionActionState,
  formData: FormData
): Promise<CotizacionActionState> {
  await requireSession();

  const cotizacionId = String(formData.get("cotizacionId") ?? "");
  if (!cotizacionId) return { ok: false, error: "Falta la cotización." };

  try {
    const yaExiste = await existeCuentaPorCobrar(cotizacionId);

    if (!yaExiste) {
      const parsedFecha = generarCuentaPorCobrarSchema.safeParse({
        cotizacionId,
        fechaVencimiento: formData.get("fechaVencimiento"),
      });
      if (!parsedFecha.success) {
        return { ok: false, error: "Fecha de vencimiento inválida." };
      }
      await updateEstadoCotizacion(cotizacionId, "ACEPTADA");
      await generarCuentaPorCobrar(parsedFecha.data);
    } else {
      await updateEstadoCotizacion(cotizacionId, "ACEPTADA");
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al confirmar la aceptación." };
  }

  revalidatePath("/cotizaciones");
  revalidatePath(`/cotizaciones/${cotizacionId}`);
  revalidatePath("/pagos");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Confirma el rechazo de una cotización. Si tenía una cuenta por cobrar
 * asociada (ej. se aceptó antes y ahora se rechaza), se elimina como
 * parte de la misma acción para no dejarla huérfana — seguro porque
 * asegurarCambioEstadoPermitido ya garantizó que, de existir, no tiene
 * abonos (si los tuviera, el cambio de estado quedaría bloqueado y nunca
 * llegaríamos aquí).
 */
export async function confirmarRechazoAction(
  _prev: CotizacionActionState,
  formData: FormData
): Promise<CotizacionActionState> {
  await requireSession();

  const cotizacionId = String(formData.get("cotizacionId") ?? "");
  if (!cotizacionId) return { ok: false, error: "Falta la cotización." };

  try {
    await asegurarCambioEstadoPermitido(cotizacionId, "RECHAZADA");
    await eliminarCuentaPorCobrarPorCotizacion(cotizacionId);
    await updateEstadoCotizacion(cotizacionId, "RECHAZADA");
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo confirmar el rechazo." };
  }

  revalidatePath("/cotizaciones");
  revalidatePath(`/cotizaciones/${cotizacionId}`);
  revalidatePath("/pagos");
  return { ok: true };
}
