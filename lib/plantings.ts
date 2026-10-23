import type { Db } from "./db";
import type { EndInput, PlantingInput } from "./validation";

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

function bedExists(db: Db, bedId: number): boolean {
  return db.prepare("SELECT 1 FROM beds WHERE id = ?").get(bedId) !== undefined;
}

export function createPlanting(db: Db, input: PlantingInput): { ok: true; id: number } | { ok: false; error: string } {
  if (!bedExists(db, input.bedId)) return { ok: false, error: "That bed no longer exists." };
  return db.transaction(() => {
    const plantId = findOrCreatePlant(db, input);
    const id = db
      .prepare(
        `INSERT INTO plantings (bed_id, plant_id, planted_on, removed_on, quantity, source, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(input.bedId, plantId, input.plantedOn, input.removedOn, input.quantity, input.source, input.notes)
      .lastInsertRowid;
    return { ok: true as const, id: Number(id) };
  })();
}

export function updatePlanting(db: Db, id: number, input: PlantingInput): Result {
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

  db.transaction(() => {
    const plantId = findOrCreatePlant(db, input);
    db.prepare(
      `UPDATE plantings SET bed_id = ?, plant_id = ?, planted_on = ?, removed_on = ?, quantity = ?,
        source = ?, notes = ?
      WHERE id = ?`,
    ).run(input.bedId, plantId, input.plantedOn, removedOn, input.quantity, input.source, input.notes, id);
    if (plantId !== current.plantId) removePlantIfUnused(db, current.plantId);
  })();
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

// Deletes a planting permanently, with its photos. A transplant that came from it keeps its own
// record but loses the link. The library entry goes too if nothing else refers to it.
export function deletePlanting(db: Db, id: number): Result {
  const planting = db.prepare("SELECT plant_id AS plantId FROM plantings WHERE id = ?").get(id) as
    | { plantId: number }
    | undefined;
  if (!planting) return { ok: false, error: "That planting no longer exists." };
  db.transaction(() => {
    db.prepare("UPDATE plantings SET from_planting_id = NULL WHERE from_planting_id = ?").run(id);
    db.prepare("DELETE FROM photos WHERE planting_id = ?").run(id);
    db.prepare("DELETE FROM plantings WHERE id = ?").run(id);
    removePlantIfUnused(db, planting.plantId);
  })();
  return { ok: true };
}
