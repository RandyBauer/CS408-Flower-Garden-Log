import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Db } from "@/lib/db";
import { migrate } from "@/lib/migrate";
import { createPlanting, endPlanting, transplantStarter } from "@/lib/plantings";
import { validatePlanting, validateTransplant, type TransplantInput } from "@/lib/validation";

let dir: string;
let db: Db;
let starter: number;

// Bed 1 is a grow rack; beds 2 and 3 are outdoors. The starter is 18 snapdragons started Mar 3.
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "gardenlog-test-"));
  db = openDatabase(path.join(dir, "test.db"));
  migrate(db);
  db.prepare("INSERT INTO zones (name) VALUES ('Garden')").run();
  db.prepare("INSERT INTO beds (zone_id, name, kind, public_slug) VALUES (1, 'Grow Rack', 'rack', 'a')").run();
  db.prepare("INSERT INTO beds (zone_id, name, public_slug) VALUES (1, 'Fence Border', 'b')").run();
  db.prepare("INSERT INTO beds (zone_id, name, public_slug) VALUES (1, 'Patio Planters', 'c')").run();
  starter = plant({ bed_id: "1" });
});

afterEach(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

function plant(overrides: Record<string, string> = {}): number {
  const result = validatePlanting({
    bed_id: "1",
    flower: "Snapdragon",
    variety: "Rocket Mix",
    color: "mixed",
    lifecycle: "annual",
    planted_on: "2026-03-03",
    quantity: "18",
    source: "grown from seed",
    ...overrides,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  const created = createPlanting(db, result.value);
  if (!created.ok) throw new Error(created.error);
  return created.id;
}

const intoTwoBeds: TransplantInput = {
  transplantedOn: "2026-05-16",
  beds: [
    { bedId: 2, quantity: 10 },
    { bedId: 3, quantity: 8 },
  ],
};

const count = (sql: string, ...params: unknown[]) => db.prepare(sql).pluck().get(...params) as number;
const removedOn = (id: number) => db.prepare("SELECT removed_on FROM plantings WHERE id = ?").pluck().get(id);

// Nothing changed: the starter is still on the rack and no planting came from it.
function expectUnchanged() {
  expect(removedOn(starter)).toBeNull();
  expect(count("SELECT COUNT(*) FROM plantings WHERE from_planting_id IS NOT NULL")).toBe(0);
}

describe("transplantStarter", () => {
  it("transplants one starter into two beds, each linked back to it", () => {
    const result = transplantStarter(db, starter, intoTwoBeds);
    if (!result.ok) throw new Error(result.error);
    expect(result.ids).toHaveLength(2);

    // The rack planting ends on the transplant date, with no verdict
    expect(db.prepare("SELECT removed_on, verdict FROM plantings WHERE id = ?").get(starter)).toEqual({
      removed_on: "2026-05-16",
      verdict: null,
    });

    // Each bed gets a planting of the same library entry, planted that day, with the starter's source
    const rows = db
      .prepare(
        `SELECT bed_id, plant_id, planted_on, removed_on, quantity, source, from_planting_id
        FROM plantings WHERE id IN (?, ?) ORDER BY id`,
      )
      .all(...result.ids);
    const plantId = count("SELECT plant_id FROM plantings WHERE id = ?", starter);
    const transplant = { plant_id: plantId, planted_on: "2026-05-16", removed_on: null, source: "grown from seed", from_planting_id: starter };
    expect(rows).toEqual([
      { ...transplant, bed_id: 2, quantity: 10 },
      { ...transplant, bed_id: 3, quantity: 8 },
    ]);
    expect(count("SELECT COUNT(*) FROM plants")).toBe(1);
  });

  it("transplants fewer than were started; the rest end with the rack planting", () => {
    const result = transplantStarter(db, starter, { transplantedOn: "2026-05-16", beds: [{ bedId: 2, quantity: 12 }] });
    expect(result.ok).toBe(true);
    expect(removedOn(starter)).toBe("2026-05-16");
  });

  it("rejects more in total than were started", () => {
    const tooMany = { transplantedOn: "2026-05-16", beds: [{ bedId: 2, quantity: 10 }, { bedId: 3, quantity: 9 }] };
    expect(transplantStarter(db, starter, tooMany)).toEqual({
      ok: false,
      error: "Only 18 were started. Transplant 18 or fewer in total.",
    });
    expectUnchanged();
  });

  it("rejects a date before the starter was started and accepts the same day", () => {
    expect(transplantStarter(db, starter, { ...intoTwoBeds, transplantedOn: "2026-03-02" })).toEqual({
      ok: false,
      error: "The transplant date cannot be before the starter was started.",
    });
    expectUnchanged();
    expect(transplantStarter(db, starter, { ...intoTwoBeds, transplantedOn: "2026-03-03" }).ok).toBe(true);
  });

  it("transplants only a planting on a grow rack", () => {
    const outdoor = plant({ bed_id: "2" });
    expect(transplantStarter(db, outdoor, { ...intoTwoBeds, beds: [{ bedId: 3, quantity: 4 }] })).toEqual({
      ok: false,
      error: "Only a planting on a grow rack can be transplanted.",
    });
    expect(removedOn(outdoor)).toBeNull();
  });

  it("transplants a starter once; one already transplanted or ended is rejected", () => {
    expect(transplantStarter(db, starter, intoTwoBeds).ok).toBe(true);
    const again = transplantStarter(db, starter, intoTwoBeds);
    expect(again).toEqual({ ok: false, error: "This starter has already been transplanted or ended." });
    expect(count("SELECT COUNT(*) FROM plantings WHERE from_planting_id = ?", starter)).toBe(2);

    const died = plant({ variety: "Night and Day" });
    endPlanting(db, died, { removedOn: "2026-04-01", verdict: null, verdictNote: null });
    expect(transplantStarter(db, died, intoTwoBeds)).toEqual(again);
  });

  it("transplants only into outdoor beds that exist", () => {
    db.prepare("INSERT INTO beds (zone_id, name, kind, public_slug) VALUES (1, 'Second Rack', 'rack', 'd')").run();
    expect(transplantStarter(db, starter, { ...intoTwoBeds, beds: [{ bedId: 2, quantity: 10 }, { bedId: 4, quantity: 8 }] })).toEqual({
      ok: false,
      error: "Transplant to outdoor beds, not to a grow rack.",
    });
    expect(transplantStarter(db, starter, { ...intoTwoBeds, beds: [{ bedId: 99, quantity: 8 }] })).toEqual({
      ok: false,
      error: "That bed no longer exists.",
    });
    expectUnchanged();
  });

  it("rejects the same bed twice and an empty list of beds", () => {
    expect(transplantStarter(db, starter, { ...intoTwoBeds, beds: [{ bedId: 2, quantity: 10 }, { bedId: 2, quantity: 8 }] })).toEqual({
      ok: false,
      error: "Choose each bed only once.",
    });
    expect(transplantStarter(db, starter, { ...intoTwoBeds, beds: [] })).toEqual({ ok: false, error: "Choose at least one bed." });
    expectUnchanged();
  });

  it("rejects a starter that no longer exists", () => {
    expect(transplantStarter(db, 999, intoTwoBeds)).toEqual({ ok: false, error: "That starter no longer exists." });
  });
});

describe("validateTransplant", () => {
  const form = { transplanted_on: "2026-05-16", to_bed_0: "2", quantity_0: "10", to_bed_1: "3", quantity_1: " 8 " };
  const errorsFor = (input: Record<string, string | undefined>, starterFacts?: { plantedOn: string; quantity: number }) => {
    const result = validateTransplant(input, starterFacts);
    return result.ok ? {} : result.errors;
  };

  it("reads the date and each row of the form", () => {
    expect(validateTransplant(form)).toEqual({ ok: true, value: intoTwoBeds });
  });

  it("reads a FormData the same way", () => {
    const data = new FormData();
    for (const [name, value] of Object.entries(form)) data.append(name, value);
    expect(validateTransplant(data)).toEqual({ ok: true, value: intoTwoBeds });
  });

  it("requires a real date, a bed, and a whole-number quantity in each row", () => {
    expect(errorsFor({ transplanted_on: "", to_bed_0: "", quantity_0: "0", to_bed_1: "3", quantity_1: "" })).toEqual({
      transplanted_on: "Enter the date transplanted.",
      to_bed_0: "Choose a bed.",
      quantity_0: "Enter a whole number from 1 to 9999.",
      quantity_1: "Enter a whole number from 1 to 9999.",
    });
    expect(errorsFor({ ...form, transplanted_on: "2026-02-30" })).toEqual({ transplanted_on: "Enter a real date." });
    expect(errorsFor({ transplanted_on: "2026-05-16" })).toEqual({
      to_bed_0: "Choose a bed.",
      quantity_0: "Enter a whole number from 1 to 9999.",
    });
  });

  it("stops at the first missing row", () => {
    const result = validateTransplant({ transplanted_on: "2026-05-16", to_bed_0: "2", quantity_0: "10", to_bed_2: "3", quantity_2: "8" });
    expect(result).toEqual({ ok: true, value: { transplantedOn: "2026-05-16", beds: [{ bedId: 2, quantity: 10 }] } });
  });

  it("flags a bed chosen twice on the later row", () => {
    expect(errorsFor({ ...form, to_bed_1: "2" })).toEqual({ to_bed_1: "This bed is already chosen above." });
  });

  it("checks the date and the total against the starter when it is given", () => {
    const facts = { plantedOn: "2026-03-03", quantity: 18 };
    expect(errorsFor(form, facts)).toEqual({});
    expect(errorsFor({ ...form, transplanted_on: "2026-03-02" }, facts)).toEqual({
      transplanted_on: "The transplant date cannot be before the starter was started.",
    });
    expect(errorsFor({ ...form, quantity_1: "9" }, facts)).toEqual({
      total: "Only 18 were started. Transplant 18 or fewer in total.",
    });
    expect(errorsFor({ ...form, quantity_0: "1", quantity_1: "1" }, { plantedOn: "2026-03-03", quantity: 1 })).toEqual({
      total: "Only 1 was started. Transplant 1 or fewer in total.",
    });
  });
});
