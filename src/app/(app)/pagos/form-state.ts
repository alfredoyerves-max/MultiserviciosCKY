export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialActionState: ActionState = { ok: false };
