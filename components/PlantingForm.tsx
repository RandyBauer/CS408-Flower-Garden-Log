"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/form-state";
import { PHOTO_TYPES, photoFileError, validatePlantingForm } from "@/lib/validation";
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

export interface CurrentPhoto {
  url: string;
  // "May 18, 2026", or null when the date was not recorded.
  added: string | null;
}

export interface PlantingFormProps {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  beds: { id: number; name: string; zoneName: string }[];
  suggestions: { flowers: string[]; varieties: string[]; colors: string[]; sources: string[] };
  initial: PlantingValues;
  // The planting's tag photo, when editing one that has a photo.
  photo?: CurrentPhoto | null;
  submitLabel: string;
  cancelHref: string;
}

// Today's date in the gardener's own time zone, as YYYY-MM-DD.
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function PlantingForm({ action, beds, suggestions, initial, photo, submitLabel, cancelHref }: PlantingFormProps) {
  const { error, fieldErrors, busy, pending, formProps } = useFormAction(action, validatePlantingForm);
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
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_16rem]">
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
        <TagPhotoField current={photo ?? null} error={fieldErrors.tag_photo} />
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

// The plant tag photo. A chosen photo is shown before saving and is uploaded with the other
// fields. A file that is not a photo, or is too large, is cleared with a message as soon as it is
// chosen. When editing, the current photo can be replaced or removed.
function TagPhotoField({ current, error: formError }: { current: CurrentPhoto | null; error?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [takenOn, setTakenOn] = useState("");
  const [remove, setRemove] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>();
  const error = fileError ?? formError;

  // Frees the previous preview when another photo is chosen or the form closes.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shown = preview ?? (current && !remove ? current.url : null);

  return (
    <div>
      <span className="block text-sm font-medium">Plant tag photo</span>
      <div className="mt-1 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-stone-400 bg-stone-100">
        {shown ? (
          // A preview of a file in the browser, which next/image cannot load.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt={preview ? "Chosen photo" : "Current tag photo"} className="size-full object-contain" />
        ) : (
          <span className="text-sm text-stone-500">No photo</span>
        )}
      </div>
      {shown && !preview && current?.added && <p className="mt-1 text-xs text-stone-500">Added {current.added}</p>}

      <label className={`${secondaryButton} mt-3 inline-block cursor-pointer focus-within:ring-2 focus-within:ring-emerald-700`}>
        Take or upload photo
        <input
          type="file"
          id="tag_photo"
          name="tag_photo"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "tag_photo-error tag_photo-help" : "tag_photo-help"}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            const problem = file && photoFileError(file);
            if (problem) event.currentTarget.value = "";
            setFileError(problem);
            setPreview(file && !problem ? URL.createObjectURL(file) : null);
            setTakenOn(file && !problem ? today() : "");
          }}
        />
      </label>
      <input type="hidden" name="photo_taken_on" value={takenOn} />
      {current && !preview && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="remove_tag_photo"
            checked={remove}
            onChange={(event) => setRemove(event.currentTarget.checked)}
          />
          Remove photo
        </label>
      )}
      {error && (
        <p id="tag_photo-error" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
      <p id="tag_photo-help" className="mt-2 text-xs text-stone-500">
        A tag photo records the variety and color without typing. JPEG, PNG, or WebP, up to 10 MB.
      </p>
    </div>
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
