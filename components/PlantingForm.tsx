"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { FormState } from "@/lib/form-state";
import { validatePlanting } from "@/lib/validation";
import { Field, FormError, fieldProps, useFormAction } from "./forms";
import { primaryButton, secondaryButton } from "./styles";

export interface PlantingValues {
  bed_id: string;
  flower: string;
  variety: string;
  color: string;
  lifecycle: string;
  planted_on: string;
  // Present only when editing a planting that has ended.
  removed_on?: string;
  quantity: string;
  source: string;
  notes: string;
}

export interface PlantingFormProps {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  beds: { id: number; name: string; zoneName: string }[];
  suggestions: { flowers: string[]; varieties: string[]; colors: string[]; sources: string[] };
  initial: PlantingValues;
  submitLabel: string;
  cancelHref: string;
}

// Today's date in the gardener's own time zone, as YYYY-MM-DD.
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function PlantingForm({ action, beds, suggestions, initial, submitLabel, cancelHref }: PlantingFormProps) {
  const { error, fieldErrors, busy, pending, formProps } = useFormAction(action, validatePlanting);
  const plantedOn = useRef<HTMLInputElement>(null);

  // A new planting defaults to today. Set in the browser, where the gardener's date is known.
  useEffect(() => {
    if (plantedOn.current && !plantedOn.current.value) plantedOn.current.value = today();
  }, []);

  const zones = [...new Set(beds.map((bed) => bed.zoneName))];
  const props = (name: string) => fieldProps(name, fieldErrors);

  return (
    <form {...formProps} noValidate aria-label="Planting">
      <FormError error={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="bed_id" label="Bed" required error={fieldErrors.bed_id}>
          <select {...props("bed_id")} defaultValue={initial.bed_id}>
            <option value="">Choose a bed</option>
            {zones.map((zone) => (
              <optgroup key={zone} label={zone}>
                {beds
                  .filter((bed) => bed.zoneName === zone)
                  .map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      {bed.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field name="planted_on" label="Date planted" required error={fieldErrors.planted_on}>
          <input {...props("planted_on")} ref={plantedOn} type="date" defaultValue={initial.planted_on} />
        </Field>

        <Field name="flower" label="Flower" required error={fieldErrors.flower}>
          <input {...props("flower")} list="flower-list" autoComplete="off" defaultValue={initial.flower} />
        </Field>
        <Field name="variety" label="Variety" error={fieldErrors.variety}>
          <input {...props("variety")} list="variety-list" autoComplete="off" defaultValue={initial.variety} />
        </Field>

        <Field name="color" label="Color" error={fieldErrors.color}>
          <input {...props("color")} list="color-list" autoComplete="off" defaultValue={initial.color} />
        </Field>
        <fieldset aria-describedby={fieldErrors.lifecycle ? "lifecycle-error" : undefined}>
          <legend className="block text-sm font-medium">Type</legend>
          <div className="mt-1 flex gap-6 py-2 text-sm">
            {(["annual", "perennial"] as const).map((value) => (
              <label key={value} className="flex items-center gap-2 capitalize">
                <input type="radio" name="lifecycle" value={value} defaultChecked={initial.lifecycle === value} />
                {value}
              </label>
            ))}
          </div>
          {fieldErrors.lifecycle && (
            <p id="lifecycle-error" className="mt-1 text-sm text-red-700">
              {fieldErrors.lifecycle}
            </p>
          )}
        </fieldset>

        <Field name="quantity" label="Quantity" error={fieldErrors.quantity}>
          <input {...props("quantity")} type="number" min={1} inputMode="numeric" defaultValue={initial.quantity} />
        </Field>
        <Field name="source" label="Source" error={fieldErrors.source}>
          <input
            {...props("source")}
            list="source-list"
            autoComplete="off"
            placeholder="Store name, or grown from seed"
            defaultValue={initial.source}
          />
        </Field>

        {initial.removed_on !== undefined && (
          <Field name="removed_on" label="Date removed" error={fieldErrors.removed_on}>
            <input {...props("removed_on")} type="date" defaultValue={initial.removed_on} />
          </Field>
        )}

        <Field name="notes" label="Notes" error={fieldErrors.notes} className="sm:col-span-2">
          <textarea {...props("notes")} rows={3} defaultValue={initial.notes} />
        </Field>
      </div>

      <Suggestions id="flower-list" values={suggestions.flowers} />
      <Suggestions id="variety-list" values={suggestions.varieties} />
      <Suggestions id="color-list" values={suggestions.colors} />
      <Suggestions id="source-list" values={suggestions.sources} />

      <div className="mt-6 flex gap-3">
        <button type="submit" className={primaryButton} disabled={busy}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className={secondaryButton}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Suggestions({ id, values }: { id: string; values: string[] }) {
  return (
    <datalist id={id}>
      {values.map((value) => (
        <option key={value} value={value} />
      ))}
    </datalist>
  );
}
