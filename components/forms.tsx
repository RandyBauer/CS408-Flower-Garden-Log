"use client";

import {
  startTransition,
  useActionState,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import type { FieldErrors, Validated } from "@/lib/validation";
import { dangerButton, inputClass } from "./styles";

// Shared pieces for the gardener's forms.

type FormAction = (prev: FormState, form: FormData) => Promise<FormState>;

// False on the server and while the page hydrates, true once React handles events. Forms keep
// their buttons disabled until then; a submit before hydration would bypass onSubmit and send
// the fields in the URL.
const noSubscription = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

// Submits a form to a server action. When a validate function is given, it runs first in the
// browser and the action is only called when it passes. The form is submitted from onSubmit
// rather than <form action>, because React resets a form after an action and the gardener's
// entries would be lost when the server rejects them.
export function useFormAction(action: FormAction, validate?: (form: FormData) => Validated<unknown>) {
  const [state, dispatch, pending] = useActionState(action, EMPTY_FORM_STATE);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const hydrated = useHydrated();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (validate) {
      const result = validate(form);
      if (!result.ok) {
        setClientErrors(result.errors);
        return;
      }
    }
    setClientErrors(null);
    startTransition(() => dispatch(form));
  }

  const fieldErrors = clientErrors ?? state.fieldErrors ?? {};
  // Pass `formProps` to the <form> and disable the submit button while `busy`.
  return {
    error: clientErrors ? undefined : state.error,
    fieldErrors,
    pending,
    busy: pending || !hydrated,
    formProps: { onSubmit, method: "post" as const },
  };
}

export function Field({
  name,
  label,
  required,
  error,
  children,
  className = "",
}: {
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {children}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

// Props that connect an input to its Field's label and error message.
export function fieldProps(name: string, errors: FieldErrors) {
  return {
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: inputClass,
  };
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
      {error}
    </p>
  );
}

// A delete button that asks for confirmation, then calls a server action bound to one record.
export function DeleteButton({
  action,
  label = "Delete",
  confirmText,
  disabled,
  disabledReason,
  className = dangerButton,
}: {
  action: () => Promise<FormState>;
  label?: string;
  confirmText: string;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
}) {
  const [state, dispatch, pending] = useActionState(() => action(), EMPTY_FORM_STATE);
  const hydrated = useHydrated();
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={className}
        disabled={disabled || pending || !hydrated}
        title={disabled ? disabledReason : undefined}
        onClick={() => {
          if (window.confirm(confirmText)) startTransition(() => dispatch());
        }}
      >
        {pending ? "Deleting…" : label}
      </button>
      {state.error && (
        <span role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </span>
      )}
    </span>
  );
}
