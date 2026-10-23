import type { FieldErrors } from "./validation";

// What a form's server action returns when it does not redirect: a message for the whole form,
// messages for single fields, or both.
export interface FormState {
  error?: string;
  fieldErrors?: FieldErrors;
}

export const EMPTY_FORM_STATE: FormState = {};
