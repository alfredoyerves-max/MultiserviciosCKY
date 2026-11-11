"use server";

import {
  createCotizacion,
  createCotizacionMaterial,
  cambiarEstadoCotizacion,
  aceptarCotizacion,
  deleteCotizacion,
} from "@/lib/data/cotizaciones";
import { existeCuentaPorCobrar } from "@/lib/data/cuentasPorCobrar";
import { cotizacionInputSchema, cotizacionMaterialInputSchema } from "@/lib/schemas/cotizacion";
import { generarCuentaPorCobrarSchema } from "@/lib/schemas/cuentas";
import { estadoCotizacionSchema } from "@/lib/enums";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface CotizacionActionState {
  ok: boolean;
  error?: string;
}

/** Lo que ambos wizards mandan del paso "1. Cliente" (ver ClienteHiddenFields). */
function leerClienteDeFormData(
  formData: FormData
): { ok: true; clienteId?: string; clienteNuevo?: unknown } | { ok: false; error: string } {
  const clienteNuevoJson = formData.get("clienteNuevoJson");
  let clienteNuevo: unknown = undefined;
  if (clienteNuevoJson && String(clienteNuevoJson) !== "") {
    try {
      clienteNuevo = JSON.parse(String(clienteNuevoJson));
    } catch {
      return { ok: false, error: "Los datos del cliente nuevo no son válidos." };
    }
  }
  const clienteId = formData.get("clienteId");
  return { ok: true, clienteId: clienteId ? String(clienteId) : undefined, clienteNuevo };
}

/** Cierre común de la creación: ejecuta, revalida y redirige al detalle. */
async function finalizarCreacion(
  datos: { clienteId?: string; clienteNuevo?: unknown },
  crear: () => Promise<{ id: string }>
): Promise<CotizacionActionState> {
  if (!datos.clienteId && !datos.clienteNuevo) {
    return { ok: false, error: "Selecciona un cliente existente o captura uno nuevo." };
  }

  let cotizacion;
  try {
    cotizacion = await crear();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al crear la cotización." };
  }

  revalidatePath("/cotizaciones");
  revalidatePath("/");
  redirect(`/cotizaciones/${cotizacion.id}`);
}

export async function createCotizacionAction(
  _prev: CotizacionActionState,
  formData: FormData
): Promise<CotizacionActionState> {
  await requireSession();

  let lineas: unknown = [];
  try {
    const lineasJson = formData.get("lineasJson");
    lineas = lineasJson ? JSON.parse(String(lineasJson)) : [];
  } catch {
    return { ok: false, error: "Las líneas de servicio no son válidas." };
  }

  const cliente = leerClienteDeFormData(formData);
  if (!cliente.ok) return cliente;

  const parsed = cotizacionInputSchema.safeParse({
    clienteId: cliente.clienteId,
    clienteNuevo: cliente.clienteNuevo,
    proyecto: formData.get("proyecto") ?? undefined,
    margenUtilidadPct: formData.get("margenUtilidadPct"),
    diasVigencia: formData.get("diasVigencia"),
    esSoporte: formData.get("esSoporte") === "on",
    lineas,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  return finalizarCreacion(parsed.data, () => createCotizacion(parsed.data));
}

export async function createCotizacionMaterialAction(
  _prev: CotizacionActionState,
  formData: FormData
): Promise<CotizacionActionState> {
  await requireSession();

  let lineasMaterial: unknown = [];
  try {
    const lineasJson = formData.get("lineasMaterialJson");
    lineasMaterial = lineasJson ? JSON.parse(String(lineasJson)) : [];
  } catch {
    return { ok: false, error: "Las líneas de material no son válidas." };
  }

  const cliente = leerClienteDeFormData(formData);
  if (!cliente.ok) return cliente;

  const parsed = cotizacionMaterialInputSchema.safeParse({
    clienteId: cliente.clienteId,
    clienteNuevo: cliente.clienteNuevo,
    proyecto: formData.get("proyecto") ?? undefined,
    diasVigencia: formData.get("diasVigencia"),
    esSoporte: formData.get("esSoporte") === "on",
    lineasMaterial,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  return finalizarCreacion(parsed.data, () => createCotizacionMaterial(parsed.data));
}

// Solo para transiciones Borrador <-> Enviada. Aceptada/Rechazada pasan por
// confirmarAceptacionAction / confirmarRechazoAction (modal obligatorio).
// Toda salida de ACEPTADA va por cambiarEstadoCotizacion: elimina la cuenta
// por cobrar en la misma transacción, o bloquea si ya tiene abonos.
export async function updateEstadoAction(id: string, estado: string) {
  await requireSession();
  const parsed = estadoCotizacionSchema.safeParse(estado);
  if (!parsed.success) throw new Error("Estado inválido.");
  if (parsed.data === "ACEPTADA" || parsed.data === "RECHAZADA") {
    throw new Error("Este cambio de estado requiere confirmación — usa el modal correspondiente.");
  }
  await cambiarEstadoCotizacion(id, parsed.data);
  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath("/cotizaciones");
}

/**
 * Confirma la aceptación de una cotización: cambia el estado a ACEPTADA y
 * genera su cuenta por cobrar (netoARecibir + la fecha de vencimiento
 * capturada en el modal), todo en una sola transacción.
 * Igual para Servicio y Material; no toca Inventario.
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

    let fechaVencimiento: Date | undefined;
    if (!yaExiste) {
      const parsedFecha = generarCuentaPorCobrarSchema.safeParse({
        cotizacionId,
        fechaVencimiento: formData.get("fechaVencimiento"),
      });
      if (!parsedFecha.success) {
        return { ok: false, error: "Fecha de vencimiento inválida." };
      }
      fechaVencimiento = parsedFecha.data.fechaVencimiento;
    }

    await aceptarCotizacion(cotizacionId, fechaVencimiento);
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
 * (se aceptó antes), cambiarEstadoCotizacion la elimina en la misma
 * transacción, o bloquea el cambio si ya tiene abonos.
 */
export async function confirmarRechazoAction(
  _prev: CotizacionActionState,
  formData: FormData
): Promise<CotizacionActionState> {
  await requireSession();

  const cotizacionId = String(formData.get("cotizacionId") ?? "");
  if (!cotizacionId) return { ok: false, error: "Falta la cotización." };

  try {
    await cambiarEstadoCotizacion(cotizacionId, "RECHAZADA");
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo confirmar el rechazo." };
  }

  revalidatePath("/cotizaciones");
  revalidatePath(`/cotizaciones/${cotizacionId}`);
  revalidatePath("/pagos");
  return { ok: true };
}

/**
 * Elimina una cotización — solo si no tiene cuenta por cobrar y su estado
 * no es ACEPTADA (ver puedeEliminarseCotizacion en lib/data/cotizaciones).
 * El folio nunca se reutiliza (generarFolio usa un contador atómico, no
 * cuenta de registros), así que eliminar es seguro para la numeración.
 * No redirige — el llamador (detalle, kanban o tabla histórica) decide
 * qué hacer al terminar (ver ConfirmarEliminacionModal).
 */
export async function deleteCotizacionAction(
  _prev: CotizacionActionState,
  formData: FormData
): Promise<CotizacionActionState> {
  await requireSession();

  const cotizacionId = String(formData.get("cotizacionId") ?? "");
  if (!cotizacionId) return { ok: false, error: "Falta la cotización." };

  try {
    await deleteCotizacion(cotizacionId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo eliminar la cotización." };
  }

  revalidatePath("/cotizaciones");
  revalidatePath("/");
  return { ok: true };
}
