import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Db } from "@/lib/db";
import { migrate } from "@/lib/migrate";
import { validateBed, validateZone } from "@/lib/validation";
import { createBed, createZone, deleteBed, deleteZone, updateBed } from "@/lib/zones";

let dir: string;
let db: Db;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "gardenlog-test-"));
  db = openDatabase(path.join(dir, "test.db"));
  migrate(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

function zone(name = "Side Yard") {
  return createZone(db, { name, description: null, sortOrder: 0 });
}

function bed(zoneId: number, name = "Shade Bed") {
  const created = createBed(db, { zoneId, name, kind: "outdoor", locationNote: null });
  if (!created.ok) throw new Error(created.error);
  return created.id;
}

describe("zone and bed validation", () => {
  it("requires a name", () => {
    expect(validateZone({ name: " " })).toEqual({ ok: false, errors: { name: "Enter a name for the zone." } });
    expect(validateBed({ zone_id: "1", name: "" })).toEqual({ ok: false, errors: { name: "Enter a name for the bed." } });
    expect(validateBed({ zone_id: "1", name: "Bed", kind: "greenhouse" })).toHaveProperty("ok", false);
  });
});

describe("zones and beds", () => {
  it("gives each new bed a permanent public identifier", () => {
    const id = bed(zone());
    const slug = db.prepare("SELECT public_slug FROM beds WHERE id = ?").pluck().get(id);
    expect(slug).toMatch(/^[a-z2-9]{8}$/);

    updateBed(db, id, { zoneId: 1, name: "Renamed", kind: "rack", locationNote: "garage" });

    expect(db.prepare("SELECT public_slug FROM beds WHERE id = ?").pluck().get(id)).toBe(slug);
  });

  it("deletes a zone only when it has no beds", () => {
    const zoneId = zone();
    const bedId = bed(zoneId);

    expect(deleteZone(db, zoneId)).toEqual({ ok: false, error: "Move or delete this zone's beds first." });
    expect(deleteBed(db, bedId)).toEqual({ ok: true });
    expect(deleteZone(db, zoneId)).toEqual({ ok: true });
  });

  it("deletes a bed only when no planting was ever recorded in it", () => {
    const bedId = bed(zone());
    db.prepare("INSERT INTO plants (flower, lifecycle) VALUES ('Zinnia', 'annual')").run();
    db.prepare(
      "INSERT INTO plantings (bed_id, plant_id, planted_on, removed_on) VALUES (?, 1, '2025-05-01', '2025-10-01')",
    ).run(bedId);

    expect(deleteBed(db, bedId)).toEqual({
      ok: false,
      error: "This bed has plantings in its history, so it cannot be deleted.",
    });
  });
});
