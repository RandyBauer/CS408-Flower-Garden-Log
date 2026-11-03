"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword } from "./accounts";
import { getDb } from "./db";
import type { FormState } from "./form-state";
import { deletePhotoFiles, storePhoto } from "./photos";
import {
  createPlanting,
  deletePlanting,
  endPlanting,
  updatePlant,
  updatePlanting,
  type TagPhotoChange,
} from "./plantings";
import { endSession, requireGardener, safeNextPath, startSession } from "./session";
import { validateBed, validateEnd, validatePlant, validatePlantingForm, validateZone } from "./validation";
import { createBed, createZone, deleteBed, deleteZone, updateBed, updateZone } from "./zones";

// Server actions for every form. Each one checks the session first, validates the form with the
// same rules the browser used, writes, and redirects to the page that shows the result.

// Pages read the database at request time; this clears any copy the browser router holds.
function refreshPages() {
  revalidatePath("/", "layout");
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email.trim() || !password) return { error: "Enter your email and password." };
  const gardener = checkPassword(getDb(), email, password);
  if (!gardener) return { error: "That email and password do not match." };
  await startSession(gardener.id);
  refreshPages();
  redirect(safeNextPath(form.get("next")));
}

export async function signOut() {
  await endSession();
  refreshPages();
  redirect("/");
}

// --- Plantings ---

// The tag photo is resized and written to disk first, so a photo that cannot be read is reported
// before anything is saved. If the planting then fails to save, the new photo's files are removed.
export async function savePlanting(id: number | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireGardener();
  const result = validatePlantingForm(form);
  if (!result.ok) return { fieldErrors: result.errors };
  const { planting, photo } = result.value;

  let tagPhoto: TagPhotoChange = photo.remove ? "remove" : null;
  if (photo.file) {
    const storagePath = await storePhoto(Buffer.from(await photo.file.arrayBuffer()));
    if (!storagePath) {
      return { fieldErrors: { tag_photo: "That file could not be read as a photo. Choose a JPEG, PNG, or WebP photo." } };
    }
    tagPhoto = { storagePath, takenOn: photo.takenOn };
  }

  const db = getDb();
  const saved = id === null ? createPlanting(db, planting, tagPhoto) : updatePlanting(db, id, planting, tagPhoto);
  if (!saved.ok) {
    if (tagPhoto && tagPhoto !== "remove") deletePhotoFiles([tagPhoto.storagePath]);
    return { error: saved.error };
  }
  refreshPages();
  redirect(`/beds/${planting.bedId}`);
}

export async function endPlantingAction(id: number, bedId: number, _prev: FormState, form: FormData): Promise<FormState> {
  await requireGardener();
  const result = validateEnd(form);
  if (!result.ok) return { fieldErrors: result.errors };
  const ended = endPlanting(getDb(), id, result.value);
  if (!ended.ok) return { error: ended.error };
  refreshPages();
  redirect(`/beds/${bedId}`);
}

export async function deletePlantingAction(id: number, bedId: number): Promise<FormState> {
  await requireGardener();
  const deleted = deletePlanting(getDb(), id);
  if (!deleted.ok) return { error: deleted.error };
  refreshPages();
  redirect(`/beds/${bedId}`);
}

// --- Plant library ---

export async function savePlant(id: number, _prev: FormState, form: FormData): Promise<FormState> {
  await requireGardener();
  const result = validatePlant(form);
  if (!result.ok) return { fieldErrors: result.errors };
  const updated = updatePlant(getDb(), id, result.value);
  if (!updated.ok) return { error: updated.error };
  refreshPages();
  redirect(`/plants/${updated.id}`);
}

// --- Zones ---

export async function saveZone(id: number | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireGardener();
  const result = validateZone(form);
  if (!result.ok) return { fieldErrors: result.errors };
  const db = getDb();
  if (id === null) {
    const newId = createZone(db, result.value);
    refreshPages();
    redirect(`/zones/${newId}`);
  }
  const updated = updateZone(db, id, result.value);
  if (!updated.ok) return { error: updated.error };
  refreshPages();
  redirect(`/zones/${id}`);
}

export async function deleteZoneAction(id: number): Promise<FormState> {
  await requireGardener();
  const deleted = deleteZone(getDb(), id);
  if (!deleted.ok) return { error: deleted.error };
  refreshPages();
  redirect("/zones");
}

// --- Beds ---

export async function saveBed(id: number | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireGardener();
  const result = validateBed(form);
  if (!result.ok) return { fieldErrors: result.errors };
  const db = getDb();
  if (id === null) {
    const created = createBed(db, result.value);
    if (!created.ok) return { error: created.error };
    refreshPages();
    redirect(`/zones/${result.value.zoneId}`);
  }
  const updated = updateBed(db, id, result.value);
  if (!updated.ok) return { error: updated.error };
  refreshPages();
  redirect(`/beds/${id}`);
}

export async function deleteBedAction(id: number, zoneId: number): Promise<FormState> {
  await requireGardener();
  const deleted = deleteBed(getDb(), id);
  if (!deleted.ok) return { error: deleted.error };
  refreshPages();
  redirect(`/zones/${zoneId}`);
}
