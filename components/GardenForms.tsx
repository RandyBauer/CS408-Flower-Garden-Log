"use client";

import Link from "next/link";
import type { FormState } from "@/lib/form-state";
import { validateBed, validateEnd, validatePlant, validateZone } from "@/lib/validation";
import { Field, FormError, fieldProps, useFormAction } from "./forms";
import { primaryButton, secondaryButton } from "./styles";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

// Sends the gardener back to the page in ?next= after signing in. The value is read from the
// address when the form is submitted, so the page itself stays static.
export function SignInForm({ action }: { action: Action }) {
  const { error, busy, pending, formProps } = useFormAction(action);
  return (
    <form
      {...formProps}
      onSubmit={(event) => {
        const next = new URLSearchParams(window.location.search).get("next");
        const field = event.currentTarget.elements.namedItem("next") as HTMLInputElement;
        field.value = next ?? "";
        formProps.onSubmit(event);
      }}
      aria-label="Sign in"
      className="space-y-4"
    >
      <FormError error={error} />
      <input type="hidden" name="next" />
      <Field name="email" label="Email">
        <input {...fieldProps("email", {})} type="email" autoComplete="username" required />
      </Field>
      <Field name="password" label="Password">
        <input {...fieldProps("password", {})} type="password" autoComplete="current-password" required />
      </Field>
      <button type="submit" className={primaryButton} disabled={busy}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export interface ZoneValues {
  name: string;
  description: string;
  sort_order: string;
}

// Adds a zone (inline on the Zones page) or edits one (on its edit page).
export function ZoneForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: Action;
  initial?: ZoneValues;
  submitLabel: string;
  cancelHref?: string;
}) {
  const { error, fieldErrors, busy, pending, formProps } = useFormAction(action, validateZone);
  const props = (name: string) => fieldProps(name, fieldErrors);
  return (
    <form {...formProps} noValidate aria-label={submitLabel}>
      <FormError error={error} />
      <div className="grid items-start gap-4 sm:grid-cols-[2fr_3fr_1fr]">
        <Field name="name" label="Name" required error={fieldErrors.name}>
          <input {...props("name")} defaultValue={initial?.name} />
        </Field>
        <Field name="description" label="Description" error={fieldErrors.description}>
          <input {...props("description")} defaultValue={initial?.description} />
        </Field>
        <Field name="sort_order" label="Order" error={fieldErrors.sort_order}>
          <input {...props("sort_order")} type="number" defaultValue={initial?.sort_order ?? "0"} />
        </Field>
      </div>
      <div className="mt-4 flex gap-3">
        <button type="submit" className={primaryButton} disabled={busy}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {cancelHref && (
          <Link href={cancelHref} className={secondaryButton}>
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}

export interface BedValues {
  zone_id: string;
  name: string;
  kind: string;
  location_note: string;
}

// Adds a bed to a zone (inline on the zone page) or edits one, including moving it to another zone.
export function BedForm({
  action,
  initial,
  zones,
  submitLabel,
  cancelHref,
}: {
  action: Action;
  initial: BedValues;
  // Offered only when editing; a new bed goes in the zone whose page it was added from.
  zones?: { id: number; name: string }[];
  submitLabel: string;
  cancelHref?: string;
}) {
  const { error, fieldErrors, busy, pending, formProps } = useFormAction(action, validateBed);
  const props = (name: string) => fieldProps(name, fieldErrors);
  return (
    <form {...formProps} noValidate aria-label={submitLabel}>
      <FormError error={error} />
      <div className="grid items-start gap-4 sm:grid-cols-3">
        <Field name="name" label="Name" required error={fieldErrors.name}>
          <input {...props("name")} defaultValue={initial.name} />
        </Field>
        <Field name="kind" label="Kind" error={fieldErrors.kind}>
          <select {...props("kind")} defaultValue={initial.kind}>
            <option value="outdoor">Outdoor</option>
            <option value="rack">Grow rack</option>
          </select>
        </Field>
        <Field name="location_note" label="Location note" error={fieldErrors.location_note}>
          <input {...props("location_note")} defaultValue={initial.location_note} />
        </Field>
        {zones ? (
          <Field name="zone_id" label="Zone" required error={fieldErrors.zone_id}>
            <select {...props("zone_id")} defaultValue={initial.zone_id}>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <input type="hidden" name="zone_id" value={initial.zone_id} />
        )}
      </div>
      <div className="mt-4 flex gap-3">
        <button type="submit" className={primaryButton} disabled={busy}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {cancelHref && (
          <Link href={cancelHref} className={secondaryButton}>
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}

const VERDICTS = [
  { value: "", label: "No verdict yet" },
  { value: "again", label: "Would plant again" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Would not" },
];

// Ends a planting: it was pulled or died. It stays in the bed's history.
export function EndPlantingForm({ action, plantedOn }: { action: Action; plantedOn: string }) {
  const { error, fieldErrors, busy, pending, formProps } = useFormAction(action, (form) => {
    const result = validateEnd(form);
    const removedOn = String(form.get("removed_on") ?? "");
    if (result.ok && removedOn < plantedOn) {
      return { ok: false, errors: { removed_on: "The removal date cannot be before the date planted." } };
    }
    return result;
  });
  const props = (name: string) => fieldProps(name, fieldErrors);
  return (
    <form {...formProps} noValidate aria-label="End this planting">
      <FormError error={error} />
      <div className="grid items-start gap-4 sm:grid-cols-[1fr_1fr_2fr_auto]">
        <Field name="removed_on" label="Date removed" required error={fieldErrors.removed_on}>
          <input {...props("removed_on")} type="date" min={plantedOn} />
        </Field>
        <Field name="verdict" label="Verdict" error={fieldErrors.verdict}>
          <select {...props("verdict")} defaultValue="">
            {VERDICTS.map((verdict) => (
              <option key={verdict.value} value={verdict.value}>
                {verdict.label}
              </option>
            ))}
          </select>
        </Field>
        <Field name="verdict_note" label="Note" error={fieldErrors.verdict_note}>
          <input {...props("verdict_note")} />
        </Field>
        <button type="submit" className={`${secondaryButton} sm:mt-6`} disabled={busy}>
          {pending ? "Ending…" : "End planting"}
        </button>
      </div>
    </form>
  );
}

export interface PlantValues {
  flower: string;
  variety: string;
  color: string;
  lifecycle: string;
}

// Renames a plant library entry, for example to correct a misspelled variety on every planting.
export function PlantForm({ action, initial }: { action: Action; initial: PlantValues }) {
  const { error, fieldErrors, busy, pending, formProps } = useFormAction(action, validatePlant);
  const props = (name: string) => fieldProps(name, fieldErrors);
  return (
    <form {...formProps} noValidate aria-label="Edit entry">
      <FormError error={error} />
      <div className="grid items-start gap-4 sm:grid-cols-4">
        <Field name="flower" label="Flower" required error={fieldErrors.flower}>
          <input {...props("flower")} defaultValue={initial.flower} />
        </Field>
        <Field name="variety" label="Variety" error={fieldErrors.variety}>
          <input {...props("variety")} defaultValue={initial.variety} />
        </Field>
        <Field name="color" label="Color" error={fieldErrors.color}>
          <input {...props("color")} defaultValue={initial.color} />
        </Field>
        <Field name="lifecycle" label="Type" error={fieldErrors.lifecycle}>
          <select {...props("lifecycle")} defaultValue={initial.lifecycle}>
            <option value="annual">Annual</option>
            <option value="perennial">Perennial</option>
          </select>
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button type="submit" className={primaryButton} disabled={busy}>
          {pending ? "Saving…" : "Save"}
        </button>
        <p className="text-sm text-stone-500">
          Changes every planting of this entry. If another entry already has the same flower, variety, and
          color, the two are combined.
        </p>
      </div>
    </form>
  );
}
