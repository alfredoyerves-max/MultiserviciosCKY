export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialActionState: ActionState = { ok: false };

/** Mensaje cuando la acción del servidor no responde o la conexión se corta. */
export const MENSAJE_FALLO_ACCION =
  "No se pudo confirmar la operación (falló la conexión o el servidor no respondió). " +
  "Puede que sí se haya guardado: revisa la cuenta antes de volver a intentarlo.";

/** Ejecuta una acción del servidor sin dejar que una excepción de red deje la pantalla colgada. */
export async function ejecutarSeguro(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
  prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    return await action(prev, formData);
  } catch {
    return { ok: false, error: MENSAJE_FALLO_ACCION };
  }
}
