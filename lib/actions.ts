"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword } from "./accounts";
import { getDb } from "./db";
import type { FormState } from "./form-state";
import { createPlanting, deletePlanting, endPlanting, updatePlanting } from "./plantings";
import { endSession, requireGardener, safeNextPath, startSession } from "./session";
import { validateBed, validateEnd, validatePlanting, validateZone } from "./validation";
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

export async function savePlanting(id: number | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireGardener();
  const result = validatePlanting(form);
  if (!result.ok) return { fieldErrors: result.errors };
  const db = getDb();
  if (id === null) {
    const created = createPlanting(db, result.value);
    if (!created.ok) return { error: created.error };
  } else {
    const updated = updatePlanting(db, id, result.value);
    if (!updated.ok) return { error: updated.error };
  }
  refreshPages();
  redirect(`/beds/${result.value.bedId}`);
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
