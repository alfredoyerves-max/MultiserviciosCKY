export interface FormActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialFormState: FormActionState = { ok: false };
