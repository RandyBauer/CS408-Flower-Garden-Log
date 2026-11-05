import type { Db } from "./db";
import { deletePhotoFiles } from "./photos";
import { tooManyMessage, type EndInput, type PlantInput, type PlantingInput, type TransplantInput } from "./validation";

// Writes for plantings. Each function takes the database so the unit tests can pass a
// temporary one. A planting is ended by setting its removal date, which keeps it in the bed's
// history. Deleting removes it permanently and is meant for entries made by mistake.

export type Result = { ok: true } | { ok: false; error: string };

// The plant library holds one row per flower, variety, and color. Saving a planting finds the
// matching row or creates it, so the library is built from the plantings as they are recorded.
// The lifecycle belongs to the plant, so a different choice on the form corrects it.
export function findOrCreatePlant(
  db: Db,
  plant: Pick<PlantingInput, "flower" | "variety" | "color" | "lifecycle">,
): number {
  const existing = db
    .prepare(
      `SELECT id, lifecycle FROM plants
      WHERE flower = ? COLLATE NOCASE AND variety = ? COLLATE NOCASE AND color = ? COLLATE NOCASE`,
    )
    .get(plant.flower, plant.variety, plant.color) as { id: number; lifecycle: string } | undefined;
  if (existing) {
    if (existing.lifecycle !== plant.lifecycle) {
      db.prepare("UPDATE plants SET lifecycle = ? WHERE id = ?").run(plant.lifecycle, existing.id);
    }
    return existing.id;
  }
  return Number(
    db
      .prepare("INSERT INTO plants (flower, variety, color, lifecycle) VALUES (?, ?, ?, ?)")
      .run(plant.flower, plant.variety, plant.color, plant.lifecycle).lastInsertRowid,
  );
}

// Removes a library entry once no planting refers to it.
function removePlantIfUnused(db: Db, plantId: number) {
  db.prepare(
    "DELETE FROM plants WHERE id = ? AND NOT EXISTS (SELECT 1 FROM plantings WHERE plant_id = ?)",
  ).run(plantId, plantId);
}

// Renames a library entry, which changes how every planting of it reads. When the new name
// matches another entry, the two are combined: this entry's plantings move to the other one and
// this entry is removed. Returns the id of the entry that holds the plantings afterwards.
export function updatePlant(db: Db, id: number, input: PlantInput): { ok: true; id: number } | { ok: false; error: string } {
  if (!db.prepare("SELECT 1 FROM plants WHERE id = ?").get(id)) {
    return { ok: false, error: "That library entry no longer exists." };
  }
  const match = db
    .prepare(
      `SELECT id FROM plants
      WHERE flower = ? COLLATE NOCASE AND variety = ? COLLATE NOCASE AND color = ? COLLATE NOCASE AND id <> ?`,
    )
    .pluck()
    .get(input.flower, input.variety, input.color, id) as number | undefined;
  const target = match ?? id;
  db.transaction(() => {
    if (match !== undefined) {
      db.prepare("UPDATE plantings SET plant_id = ? WHERE plant_id = ?").run(match, id);
      db.prepare("DELETE FROM plants WHERE id = ?").run(id);
    }
    db.prepare("UPDATE plants SET flower = ?, variety = ?, color = ?, lifecycle = ? WHERE id = ?").run(
      input.flower,
      input.variety,
      input.color,
      input.lifecycle,
      target,
    );
  })();
  return { ok: true, id: target };
}

function bedExists(db: Db, bedId: number): boolean {
  return db.prepare("SELECT 1 FROM beds WHERE id = ?").get(bedId) !== undefined;
}

// What saving the planting form does to its tag photo: attach a photo already stored with
// storePhoto, replacing the current one; remove the current one; or leave it as it is.
export type TagPhotoChange = { storagePath: string; takenOn: string | null } | "remove" | null;

// Applies a tag photo change inside the caller's transaction. Returns the photo it replaced or
// removed, whose files are deleted once the transaction has committed.
function changeTagPhoto(db: Db, plantingId: number, change: TagPhotoChange): string[] {
  if (change === null) return [];
  const replaced = db
    .prepare("SELECT storage_path FROM photos WHERE planting_id = ? AND kind = 'tag'")
    .pluck()
    .all(plantingId) as string[];
  db.prepare("DELETE FROM photos WHERE planting_id = ? AND kind = 'tag'").run(plantingId);
  if (change !== "remove") {
    db.prepare("INSERT INTO photos (planting_id, kind, storage_path, taken_on) VALUES (?, 'tag', ?, ?)").run(
      plantingId,
      change.storagePath,
      change.takenOn,
    );
  }
  return replaced;
}

export function createPlanting(
  db: Db,
  input: PlantingInput,
  tagPhoto: TagPhotoChange = null,
): { ok: true; id: number } | { ok: false; error: string } {
  if (!bedExists(db, input.bedId)) return { ok: false, error: "That bed no longer exists." };
  return db.transaction(() => {
    const plantId = findOrCreatePlant(db, input);
    const id = Number(
      db
        .prepare(
          `INSERT INTO plantings (bed_id, plant_id, planted_on, removed_on, quantity, source, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(input.bedId, plantId, input.plantedOn, input.removedOn, input.quantity, input.source, input.notes)
        .lastInsertRowid,
    );
    changeTagPhoto(db, id, tagPhoto);
    return { ok: true as const, id };
  })();
}

export function updatePlanting(db: Db, id: number, input: PlantingInput, tagPhoto: TagPhotoChange = null): Result {
  const current = db.prepare("SELECT plant_id AS plantId, removed_on AS removedOn FROM plantings WHERE id = ?").get(id) as
    | { plantId: number; removedOn: string | null }
    | undefined;
  if (!current) return { ok: false, error: "That planting no longer exists." };
  if (!bedExists(db, input.bedId)) return { ok: false, error: "That bed no longer exists." };
  // The edit form only shows the removal date for an ended planting; an active one stays active.
  const removedOn = current.removedOn === null ? null : (input.removedOn ?? current.removedOn);
  if (removedOn !== null && removedOn < input.plantedOn) {
    return { ok: false, error: "The removal date cannot be before the date planted." };
  }

  const replaced = db.transaction(() => {
    const plantId = findOrCreatePlant(db, input);
    db.prepare(
      `UPDATE plantings SET bed_id = ?, plant_id = ?, planted_on = ?, removed_on = ?, quantity = ?,
        source = ?, notes = ?
      WHERE id = ?`,
    ).run(input.bedId, plantId, input.plantedOn, removedOn, input.quantity, input.source, input.notes, id);
    if (plantId !== current.plantId) removePlantIfUnused(db, current.plantId);
    return changeTagPhoto(db, id, tagPhoto);
  })();
  deletePhotoFiles(replaced);
  return { ok: true };
}

// Ends an active planting. It stays in the bed's history with its removal date and verdict.
export function endPlanting(db: Db, id: number, input: EndInput): Result {
  const planting = db
    .prepare("SELECT planted_on AS plantedOn, removed_on AS removedOn FROM plantings WHERE id = ?")
    .get(id) as { plantedOn: string; removedOn: string | null } | undefined;
  if (!planting) return { ok: false, error: "That planting no longer exists." };
  if (planting.removedOn !== null) return { ok: false, error: "This planting has already ended." };
  if (input.removedOn < planting.plantedOn) {
    return { ok: false, error: "The removal date cannot be before the date planted." };
  }
  db.prepare("UPDATE plantings SET removed_on = ?, verdict = ?, verdict_note = ? WHERE id = ?").run(
    input.removedOn,
    input.verdict,
    input.verdictNote,
    id,
  );
  return { ok: true };
}

// Transplants a starter from a grow rack into one or more outdoor beds. The rack planting ends on
// the transplant date. Each bed gets a new planting of the same library entry, planted that day,
// with the starter's source, and linked back to the starter by from_planting_id. Fewer plants than
// were started may be transplanted; the rest end with the rack planting.
export function transplantStarter(
  db: Db,
  id: number,
  input: TransplantInput,
): { ok: true; ids: number[] } | { ok: false; error: string } {
  const starter = db
    .prepare(
      `SELECT p.plant_id AS plantId, p.planted_on AS plantedOn, p.removed_on AS removedOn, p.quantity,
        p.source, b.kind
      FROM plantings p JOIN beds b ON b.id = p.bed_id WHERE p.id = ?`,
    )
    .get(id) as
    | { plantId: number; plantedOn: string; removedOn: string | null; quantity: number; source: string | null; kind: string }
    | undefined;
  if (!starter) return { ok: false, error: "That starter no longer exists." };
  if (starter.kind !== "rack") return { ok: false, error: "Only a planting on a grow rack can be transplanted." };
  if (starter.removedOn !== null) return { ok: false, error: "This starter has already been transplanted or ended." };
  if (input.transplantedOn < starter.plantedOn) {
    return { ok: false, error: "The transplant date cannot be before the starter was started." };
  }
  if (input.beds.length === 0) return { ok: false, error: "Choose at least one bed." };
  if (new Set(input.beds.map((bed) => bed.bedId)).size < input.beds.length) {
    return { ok: false, error: "Choose each bed only once." };
  }
  const total = input.beds.reduce((sum, bed) => sum + bed.quantity, 0);
  if (total > starter.quantity) return { ok: false, error: tooManyMessage(starter.quantity) };
  const bedKind = db.prepare("SELECT kind FROM beds WHERE id = ?").pluck();
  for (const { bedId } of input.beds) {
    const kind = bedKind.get(bedId) as string | undefined;
    if (!kind) return { ok: false, error: "That bed no longer exists." };
    if (kind !== "outdoor") return { ok: false, error: "Transplant to outdoor beds, not to a grow rack." };
  }

  const insert = db.prepare(
    `INSERT INTO plantings (bed_id, plant_id, planted_on, quantity, source, from_planting_id)
    VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const ids = db.transaction(() => {
    db.prepare("UPDATE plantings SET removed_on = ? WHERE id = ?").run(input.transplantedOn, id);
    return input.beds.map(({ bedId, quantity }) =>
      Number(insert.run(bedId, starter.plantId, input.transplantedOn, quantity, starter.source, id).lastInsertRowid),
    );
  })();
  return { ok: true, ids };
}

// Deletes a planting permanently, with its photos and their files. A transplant that came from it
// keeps its own record but loses the link. The library entry goes too if nothing else refers to it.
export function deletePlanting(db: Db, id: number): Result {
  const planting = db.prepare("SELECT plant_id AS plantId FROM plantings WHERE id = ?").get(id) as
    | { plantId: number }
    | undefined;
  if (!planting) return { ok: false, error: "That planting no longer exists." };
  const photos = db.prepare("SELECT storage_path FROM photos WHERE planting_id = ?").pluck().all(id) as string[];
  db.transaction(() => {
    db.prepare("UPDATE plantings SET from_planting_id = NULL WHERE from_planting_id = ?").run(id);
    db.prepare("DELETE FROM photos WHERE planting_id = ?").run(id);
    db.prepare("DELETE FROM plantings WHERE id = ?").run(id);
    removePlantIfUnused(db, planting.plantId);
  })();
  deletePhotoFiles(photos);
  return { ok: true };
}
