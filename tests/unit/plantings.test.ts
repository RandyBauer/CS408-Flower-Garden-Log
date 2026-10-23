import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Db } from "@/lib/db";
import { migrate } from "@/lib/migrate";
import { createPlanting, deletePlanting, endPlanting, updatePlanting } from "@/lib/plantings";
import { validateEnd, validatePlanting, type PlantingInput } from "@/lib/validation";

let dir: string;
let db: Db;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "gardenlog-test-"));
  db = openDatabase(path.join(dir, "test.db"));
  migrate(db);
  db.prepare("INSERT INTO zones (name) VALUES ('South Fence')").run();
  db.prepare("INSERT INTO beds (zone_id, name, public_slug) VALUES (1, 'Fence Border', 'a')").run();
  db.prepare("INSERT INTO beds (zone_id, name, public_slug) VALUES (1, 'Corner Bed', 'b')").run();
});

afterEach(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const form = {
  bed_id: "1",
  flower: "Zinnia",
  variety: "Profusion Orange",
  color: "orange",
  lifecycle: "annual",
  planted_on: "2026-05-18",
  quantity: "12",
  source: "Fred Meyer",
  notes: "",
};

function valid(overrides: Record<string, string> = {}): PlantingInput {
  const result = validatePlanting({ ...form, ...overrides });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function errorsFor(overrides: Record<string, string | undefined>) {
  const result = validatePlanting({ ...form, ...overrides });
  return result.ok ? {} : result.errors;
}

const count = (sql: string, ...params: unknown[]) => db.prepare(sql).pluck().get(...params) as number;

describe("validatePlanting", () => {
  it("accepts a complete planting and trims the text", () => {
    const value = valid({ flower: "  Zinnia ", notes: "  " });
    expect(value).toEqual({
      bedId: 1,
      flower: "Zinnia",
      variety: "Profusion Orange",
      color: "orange",
      lifecycle: "annual",
      plantedOn: "2026-05-18",
      removedOn: null,
      quantity: 12,
      source: "Fred Meyer",
      notes: null,
    });
  });

  it("needs only bed, flower, type, and date planted; quantity defaults to 1", () => {
    const value = valid({ variety: "", color: "", quantity: "", source: "" });
    expect(value.quantity).toBe(1);
    expect(value.variety).toBe("");
    expect(value.source).toBeNull();
  });

  it("rejects missing required fields", () => {
    expect(errorsFor({ bed_id: "", flower: " ", lifecycle: undefined, planted_on: "" })).toEqual({
      bed_id: "Choose a bed.",
      flower: "Enter the flower, for example Zinnia.",
      lifecycle: "Choose annual or perennial.",
      planted_on: "Enter the date planted.",
    });
  });

  it("rejects dates that are not real calendar dates", () => {
    expect(errorsFor({ planted_on: "2026-02-30" })).toHaveProperty("planted_on", "Enter a real date.");
    expect(errorsFor({ planted_on: "05/18/2026" })).toHaveProperty("planted_on", "Enter a real date.");
  });

  it("rejects a removal date before the date planted", () => {
    expect(errorsFor({ removed_on: "2026-05-01" })).toEqual({
      removed_on: "The removal date cannot be before the date planted.",
    });
    expect(errorsFor({ removed_on: "2026-05-18" })).toEqual({});
  });

  it("rejects a quantity that is not a whole number from 1 to 9999", () => {
    for (const quantity of ["0", "-3", "2.5", "ten", "10000"]) {
      expect(errorsFor({ quantity }), quantity).toHaveProperty("quantity");
    }
  });

  it("rejects text longer than the field allows", () => {
    expect(errorsFor({ flower: "x".repeat(81) })).toHaveProperty("flower");
    expect(errorsFor({ notes: "x".repeat(501) })).toHaveProperty("notes");
  });
});

describe("validateEnd", () => {
  it("requires a real removal date; verdict and note are optional", () => {
    expect(validateEnd({ removed_on: "" })).toEqual({ ok: false, errors: { removed_on: "Enter the date removed." } });
    expect(validateEnd({ removed_on: "2026-10-04" })).toEqual({
      ok: true,
      value: { removedOn: "2026-10-04", verdict: null, verdictNote: null },
    });
    expect(validateEnd({ removed_on: "2026-10-04", verdict: "great" })).toHaveProperty("ok", false);
  });
});

describe("plant library", () => {
  it("creates one library entry per flower, variety, and color", () => {
    createPlanting(db, valid());
    createPlanting(db, valid({ bed_id: "2" }));
    createPlanting(db, valid({ flower: "zinnia", variety: "profusion orange" }));
    createPlanting(db, valid({ color: "white" }));

    expect(count("SELECT COUNT(*) FROM plantings")).toBe(4);
    expect(count("SELECT COUNT(*) FROM plants")).toBe(2);
  });

  it("moves a planting to a new entry when edited, and drops the unused entry", () => {
    const created = createPlanting(db, valid());
    if (!created.ok) throw new Error(created.error);

    expect(updatePlanting(db, created.id, valid({ color: "white" }))).toEqual({ ok: true });

    expect(db.prepare("SELECT color FROM plants").pluck().all()).toEqual(["white"]);
  });
});

describe("ending versus deleting", () => {
  function plant(overrides: Record<string, string> = {}) {
    const created = createPlanting(db, valid(overrides));
    if (!created.ok) throw new Error(created.error);
    return created.id;
  }

  it("ending keeps the planting in history with its removal date and verdict", () => {
    const id = plant();

    expect(endPlanting(db, id, { removedOn: "2026-10-04", verdict: "again", verdictNote: "bloomed all summer" })).toEqual({
      ok: true,
    });

    expect(db.prepare("SELECT removed_on, verdict, verdict_note FROM plantings WHERE id = ?").get(id)).toEqual({
      removed_on: "2026-10-04",
      verdict: "again",
      verdict_note: "bloomed all summer",
    });
    expect(count("SELECT COUNT(*) FROM plants")).toBe(1);
  });

  it("will not end a planting before it was planted, or end it twice", () => {
    const id = plant();
    expect(endPlanting(db, id, { removedOn: "2026-05-01", verdict: null, verdictNote: null })).toEqual({
      ok: false,
      error: "The removal date cannot be before the date planted.",
    });

    endPlanting(db, id, { removedOn: "2026-10-04", verdict: null, verdictNote: null });
    expect(endPlanting(db, id, { removedOn: "2026-10-05", verdict: null, verdictNote: null })).toEqual({
      ok: false,
      error: "This planting has already ended.",
    });
  });

  it("deleting removes the planting and its unused library entry", () => {
    const id = plant();

    expect(deletePlanting(db, id)).toEqual({ ok: true });

    expect(count("SELECT COUNT(*) FROM plantings")).toBe(0);
    expect(count("SELECT COUNT(*) FROM plants")).toBe(0);
  });

  it("deleting keeps a library entry another planting still uses", () => {
    const first = plant();
    plant({ bed_id: "2" });

    deletePlanting(db, first);

    expect(count("SELECT COUNT(*) FROM plantings")).toBe(1);
    expect(count("SELECT COUNT(*) FROM plants")).toBe(1);
  });

  it("deleting a rack planting keeps its transplants and clears their link", () => {
    const rack = plant();
    const transplant = plant({ bed_id: "2" });
    db.prepare("UPDATE plantings SET from_planting_id = ? WHERE id = ?").run(rack, transplant);

    expect(deletePlanting(db, rack)).toEqual({ ok: true });

    expect(db.prepare("SELECT from_planting_id FROM plantings WHERE id = ?").pluck().get(transplant)).toBeNull();
  });

  it("editing an active planting does not end it", () => {
    const id = plant();
    updatePlanting(db, id, valid({ quantity: "6", removed_on: "2026-10-01" }));
    expect(db.prepare("SELECT quantity, removed_on FROM plantings WHERE id = ?").get(id)).toEqual({
      quantity: 6,
      removed_on: null,
    });
  });
});
