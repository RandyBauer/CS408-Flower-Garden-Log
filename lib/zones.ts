import type { Db } from "./db";
import type { Result } from "./plantings";
import { newPublicSlug } from "./sample-garden";
import type { BedInput, ZoneInput } from "./validation";

// Writes for zones and beds. A zone can be deleted only when it has no beds, and a bed only when
// no planting, current or past, was ever recorded in it, so deleting never erases history.

export function createZone(db: Db, input: ZoneInput): number {
  return Number(
    db
      .prepare("INSERT INTO zones (name, description, sort_order) VALUES (?, ?, ?)")
      .run(input.name, input.description, input.sortOrder).lastInsertRowid,
  );
}

export function updateZone(db: Db, id: number, input: ZoneInput): Result {
  const { changes } = db
    .prepare("UPDATE zones SET name = ?, description = ?, sort_order = ? WHERE id = ?")
    .run(input.name, input.description, input.sortOrder, id);
  return changes === 1 ? { ok: true } : { ok: false, error: "That zone no longer exists." };
}

export function deleteZone(db: Db, id: number): Result {
  const beds = db.prepare("SELECT COUNT(*) FROM beds WHERE zone_id = ?").pluck().get(id) as number;
  if (beds > 0) return { ok: false, error: "Move or delete this zone's beds first." };
  const { changes } = db.prepare("DELETE FROM zones WHERE id = ?").run(id);
  return changes === 1 ? { ok: true } : { ok: false, error: "That zone no longer exists." };
}

function zoneExists(db: Db, zoneId: number): boolean {
  return db.prepare("SELECT 1 FROM zones WHERE id = ?").get(zoneId) !== undefined;
}

// New beds get a random public identifier for their QR code. It never changes after this.
export function createBed(db: Db, input: BedInput): { ok: true; id: number } | { ok: false; error: string } {
  if (!zoneExists(db, input.zoneId)) return { ok: false, error: "That zone no longer exists." };
  const insert = db.prepare(
    "INSERT INTO beds (zone_id, name, kind, location_note, public_slug) VALUES (?, ?, ?, ?, ?)",
  );
  for (;;) {
    try {
      const id = insert.run(input.zoneId, input.name, input.kind, input.locationNote, newPublicSlug())
        .lastInsertRowid;
      return { ok: true, id: Number(id) };
    } catch (error) {
      // Retry on the rare slug collision; anything else is a real error.
      if (!String(error).includes("beds.public_slug")) throw error;
    }
  }
}

export function updateBed(db: Db, id: number, input: BedInput): Result {
  if (!zoneExists(db, input.zoneId)) return { ok: false, error: "That zone no longer exists." };
  const { changes } = db
    .prepare("UPDATE beds SET zone_id = ?, name = ?, kind = ?, location_note = ? WHERE id = ?")
    .run(input.zoneId, input.name, input.kind, input.locationNote, id);
  return changes === 1 ? { ok: true } : { ok: false, error: "That bed no longer exists." };
}

export function deleteBed(db: Db, id: number): Result {
  const plantings = db.prepare("SELECT COUNT(*) FROM plantings WHERE bed_id = ?").pluck().get(id) as number;
  if (plantings > 0) {
    return { ok: false, error: "This bed has plantings in its history, so it cannot be deleted." };
  }
  const result = db.transaction(() => {
    db.prepare("DELETE FROM photos WHERE bed_id = ?").run(id);
    return db.prepare("DELETE FROM beds WHERE id = ?").run(id).changes;
  })();
  return result === 1 ? { ok: true } : { ok: false, error: "That bed no longer exists." };
}
