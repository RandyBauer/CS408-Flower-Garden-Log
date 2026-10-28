// Form validation shared by the browser and the server. The planting form runs it before
// submitting so errors show without a round trip; the server actions run it again.
// No Node.js imports, so client components can use it.

export type Lifecycle = "annual" | "perennial";
export type Verdict = "again" | "maybe" | "no";
export type BedKind = "outdoor" | "rack";

export type FieldErrors = Record<string, string>;
export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

// Reads a FormData or a plain object the same way: trimmed text, "" when missing.
export type FormInput = FormData | Record<string, string | undefined>;

function text(input: FormInput, name: string): string {
  const value = input instanceof FormData ? input.get(name) : input[name];
  return typeof value === "string" ? value.trim() : "";
}

const MAX_NAME = 80;
const MAX_NOTE = 500;

// True for a real calendar date written as YYYY-MM-DD.
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function checkLength(errors: FieldErrors, field: string, value: string, label: string, max: number) {
  if (value.length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
}

export interface PlantingInput {
  bedId: number;
  flower: string;
  variety: string;
  color: string;
  lifecycle: Lifecycle;
  plantedOn: string;
  removedOn: string | null;
  quantity: number;
  source: string | null;
  notes: string | null;
}

// Fields of the planting form. removed_on is only on the form when editing an ended planting.
export function validatePlanting(input: FormInput): Validated<PlantingInput> {
  const errors: FieldErrors = {};
  const bedId = text(input, "bed_id");
  const flower = text(input, "flower");
  const variety = text(input, "variety");
  const color = text(input, "color");
  const lifecycle = text(input, "lifecycle");
  const plantedOn = text(input, "planted_on");
  const removedOn = text(input, "removed_on");
  const quantity = text(input, "quantity");
  const source = text(input, "source");
  const notes = text(input, "notes");

  if (!/^[1-9]\d*$/.test(bedId)) errors.bed_id = "Choose a bed.";
  if (!flower) errors.flower = "Enter the flower, for example Zinnia.";
  checkLength(errors, "flower", flower, "Flower", MAX_NAME);
  checkLength(errors, "variety", variety, "Variety", MAX_NAME);
  checkLength(errors, "color", color, "Color", MAX_NAME);
  if (lifecycle !== "annual" && lifecycle !== "perennial") {
    errors.lifecycle = "Choose annual or perennial.";
  }
  if (!plantedOn) errors.planted_on = "Enter the date planted.";
  else if (!isIsoDate(plantedOn)) errors.planted_on = "Enter a real date.";
  if (removedOn) {
    if (!isIsoDate(removedOn)) errors.removed_on = "Enter a real date.";
    else if (isIsoDate(plantedOn) && removedOn < plantedOn) {
      errors.removed_on = "The removal date cannot be before the date planted.";
    }
  }
  if (quantity && (!/^\d+$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > 9999)) {
    errors.quantity = "Enter a whole number from 1 to 9999.";
  }
  checkLength(errors, "source", source, "Source", MAX_NAME);
  checkLength(errors, "notes", notes, "Notes", MAX_NOTE);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      bedId: Number(bedId),
      flower,
      variety,
      color,
      lifecycle: lifecycle as Lifecycle,
      plantedOn,
      removedOn: removedOn || null,
      quantity: quantity ? Number(quantity) : 1,
      source: source || null,
      notes: notes || null,
    },
  };
}

export interface EndInput {
  removedOn: string;
  verdict: Verdict | null;
  verdictNote: string | null;
}

// The "End this planting" form: removal date required; verdict and note optional.
export function validateEnd(input: FormInput): Validated<EndInput> {
  const errors: FieldErrors = {};
  const removedOn = text(input, "removed_on");
  const verdict = text(input, "verdict");
  const verdictNote = text(input, "verdict_note");

  if (!removedOn) errors.removed_on = "Enter the date removed.";
  else if (!isIsoDate(removedOn)) errors.removed_on = "Enter a real date.";
  if (verdict && !["again", "maybe", "no"].includes(verdict)) errors.verdict = "Choose a verdict.";
  checkLength(errors, "verdict_note", verdictNote, "Note", MAX_NOTE);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { removedOn, verdict: (verdict || null) as Verdict | null, verdictNote: verdictNote || null },
  };
}

export interface ZoneInput {
  name: string;
  description: string | null;
  sortOrder: number;
}

export function validateZone(input: FormInput): Validated<ZoneInput> {
  const errors: FieldErrors = {};
  const name = text(input, "name");
  const description = text(input, "description");
  const sortOrder = text(input, "sort_order");

  if (!name) errors.name = "Enter a name for the zone.";
  checkLength(errors, "name", name, "Name", MAX_NAME);
  checkLength(errors, "description", description, "Description", MAX_NOTE);
  if (sortOrder && !/^-?\d{1,4}$/.test(sortOrder)) errors.sort_order = "Enter a whole number.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { name, description: description || null, sortOrder: sortOrder ? Number(sortOrder) : 0 },
  };
}

export interface BedInput {
  zoneId: number;
  name: string;
  kind: BedKind;
  locationNote: string | null;
}

export function validateBed(input: FormInput): Validated<BedInput> {
  const errors: FieldErrors = {};
  const zoneId = text(input, "zone_id");
  const name = text(input, "name");
  const kind = text(input, "kind") || "outdoor";
  const locationNote = text(input, "location_note");

  if (!/^[1-9]\d*$/.test(zoneId)) errors.zone_id = "Choose a zone.";
  if (!name) errors.name = "Enter a name for the bed.";
  checkLength(errors, "name", name, "Name", MAX_NAME);
  if (kind !== "outdoor" && kind !== "rack") errors.kind = "Choose outdoor or grow rack.";
  checkLength(errors, "location_note", locationNote, "Location note", MAX_NAME);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { zoneId: Number(zoneId), name, kind: kind as BedKind, locationNote: locationNote || null },
  };
}

export interface PlantInput {
  flower: string;
  variety: string;
  color: string;
  lifecycle: Lifecycle;
}

// The "Edit entry" form on a plant detail page.
export function validatePlant(input: FormInput): Validated<PlantInput> {
  const errors: FieldErrors = {};
  const flower = text(input, "flower");
  const variety = text(input, "variety");
  const color = text(input, "color");
  const lifecycle = text(input, "lifecycle");

  if (!flower) errors.flower = "Enter the flower, for example Zinnia.";
  checkLength(errors, "flower", flower, "Flower", MAX_NAME);
  checkLength(errors, "variety", variety, "Variety", MAX_NAME);
  checkLength(errors, "color", color, "Color", MAX_NAME);
  if (lifecycle !== "annual" && lifecycle !== "perennial") {
    errors.lifecycle = "Choose annual or perennial.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { flower, variety, color, lifecycle: lifecycle as Lifecycle } };
}
