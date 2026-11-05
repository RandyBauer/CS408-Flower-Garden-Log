"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/form-state";
import { MAX_TRANSPLANT_BEDS, validateTransplant, type StarterFacts } from "@/lib/validation";
import { Field, FormError, fieldProps, today, useFormAction } from "./forms";
import { primaryButton, secondaryButton } from "./styles";

interface Row {
  // Stable across removals; the field names use the row's position.
  key: number;
  bedId: string;
  quantity: string;
}

const count = (quantity: string) => (/^\d+$/.test(quantity) ? Number(quantity) : 0);

// Transplants one starter into one or more outdoor beds. It starts with one row holding every
// plant started; each added row offers the plants not yet placed. The date defaults to today.
export function TransplantForm({
  action,
  starter,
  beds,
  cancelHref,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  starter: StarterFacts;
  beds: { id: number; name: string; zoneName: string }[];
  cancelHref: string;
}) {
  const { error, fieldErrors, busy, pending, formProps } = useFormAction(action, (form) =>
    validateTransplant(form, starter),
  );
  const [rows, setRows] = useState<Row[]>([{ key: 0, bedId: "", quantity: String(starter.quantity) }]);
  const nextKey = useRef(1);
  const date = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (date.current && !date.current.value) date.current.value = today();
  }, []);

  const zones = [...new Set(beds.map((bed) => bed.zoneName))];
  const total = rows.reduce((sum, row) => sum + count(row.quantity), 0);
  const props = (name: string) => fieldProps(name, fieldErrors);
  const update = (key: number, change: Partial<Row>) =>
    setRows(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));

  function addRow() {
    const left = starter.quantity - total;
    setRows([...rows, { key: nextKey.current++, bedId: "", quantity: left > 0 ? String(left) : "" }]);
  }

  return (
    <form {...formProps} noValidate aria-label="Transplant">
      <FormError error={error} />
      <div className="space-y-3">
        {rows.map((row, i) => (
          <fieldset key={row.key} className="grid items-start gap-3 sm:grid-cols-[1fr_8rem_6rem]">
            <legend className="sr-only">Bed {i + 1}</legend>
            <Field name={`to_bed_${i}`} label="To bed" required error={fieldErrors[`to_bed_${i}`]}>
              <select
                {...props(`to_bed_${i}`)}
                value={row.bedId}
                onChange={(event) => update(row.key, { bedId: event.currentTarget.value })}
              >
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
            <Field name={`quantity_${i}`} label="Quantity" required error={fieldErrors[`quantity_${i}`]}>
              <input
                {...props(`quantity_${i}`)}
                type="number"
                min={1}
                inputMode="numeric"
                value={row.quantity}
                onChange={(event) => update(row.key, { quantity: event.currentTarget.value })}
              />
            </Field>
            {i > 0 && (
              <button
                type="button"
                className={`${secondaryButton} sm:mt-6`}
                onClick={() => setRows(rows.filter((other) => other.key !== row.key))}
                aria-label={`Remove bed ${i + 1}`}
              >
                Remove
              </button>
            )}
          </fieldset>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {rows.length < MAX_TRANSPLANT_BEDS && (
          <button type="button" className={secondaryButton} onClick={addRow}>
            + Another bed
          </button>
        )}
        <p className="text-sm text-stone-600">
          {total} of the {starter.quantity} started
        </p>
      </div>
      {fieldErrors.total && <p className="mt-1 text-sm text-red-700">{fieldErrors.total}</p>}

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <Field name="transplanted_on" label="Date transplanted" required error={fieldErrors.transplanted_on}>
          <input {...props("transplanted_on")} ref={date} type="date" min={starter.plantedOn} />
        </Field>
        <button type="submit" className={`${primaryButton} mt-6`} disabled={busy}>
          {pending ? "Transplanting…" : "Transplant"}
        </button>
        <Link href={cancelHref} className={`${secondaryButton} mt-6`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
