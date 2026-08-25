// Tipo y valor inicial compartidos por los formularios de Puestos y
// Servicios. Vive fuera de actions.ts a propósito: un archivo "use server"
// solo puede exportar funciones async, y este objeto no lo es.

export interface FormActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialFormState: FormActionState = { ok: false };
