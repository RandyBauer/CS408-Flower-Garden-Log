import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Db } from "@/lib/db";
import { migrate } from "@/lib/migrate";
import {
  buildSearchQuery,
  describeFilters,
  exampleSearches,
  filtersToQuery,
  hasFilters,
  NO_FILTERS,
  parseFilters,
  type SearchFilters,
} from "@/lib/search";

let dir: string;
let db: Db;

// Two zones with one bed each, and plantings that differ in one filter at a time.
// Each planting's note names it, and the searches return the notes.
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "gardenlog-search-"));
  db = openDatabase(path.join(dir, "test.db"));
  migrate(db);
  db.exec(`
    INSERT INTO zones (id, name) VALUES (1, 'Front Walk'), (2, 'South Fence');
    INSERT INTO beds (id, zone_id, name, public_slug) VALUES (1, 1, 'Mailbox Bed', 'a'), (2, 2, 'Fence Border', 'b');
    INSERT INTO plants (id, flower, variety, color, lifecycle) VALUES
      (1, 'Petunia', 'Supertunia Coral Crush', 'coral', 'annual'),
      (2, 'Impatiens', 'SunPatiens Coral', 'coral', 'annual'),
      (3, 'Zinnia', 'Profusion Orange', 'orange', 'annual'),
      (4, 'Peony', 'Sarah Bernhardt', 'pink', 'perennial'),
      (5, 'Salvia', '100% Blue', 'blue', 'annual');
    INSERT INTO plantings (bed_id, plant_id, planted_on, removed_on, source, verdict, notes) VALUES
      (1, 1, '2025-05-17', '2025-10-04', 'Fred Meyer', 'again', 'petunia 2025'),
      (2, 1, '2024-05-18', '2024-10-05', 'Home Depot', 'no', 'petunia 2024'),
      (1, 2, '2026-05-16', NULL, 'Fred Meyer', NULL, 'impatiens 2026'),
      (2, 3, '2025-05-24', '2025-10-11', 'Home Depot', 'maybe', 'zinnia 2025'),
      (2, 4, '2021-05-01', NULL, 'Neighbor division', NULL, 'peony 2021'),
      (1, 5, '2026-05-18', NULL, 'grown from seed', NULL, 'salvia 2026');
  `);
});

afterEach(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

function search(filters: Partial<SearchFilters>): string[] {
  const { where, params } = buildSearchQuery({ ...NO_FILTERS, ...filters });
  return db
    .prepare(
      `SELECT p.notes FROM plantings p JOIN plants pl ON pl.id = p.plant_id JOIN beds b ON b.id = p.bed_id
      WHERE ${where} ORDER BY p.notes`,
    )
    .pluck()
    .all(...params) as string[];
}

describe("buildSearchQuery", () => {
  it("matches every planting when no filter is set", () => {
    expect(search({})).toHaveLength(6);
  });

  it("flower matches part of the name and ignores case", () => {
    expect(search({ flower: "PETUN" })).toEqual(["petunia 2024", "petunia 2025"]);
  });

  it("variety matches part of the name", () => {
    expect(search({ variety: "coral" })).toEqual(["impatiens 2026", "petunia 2024", "petunia 2025"]);
  });

  it("color matches part of the color", () => {
    expect(search({ color: "Cor" })).toEqual(["impatiens 2026", "petunia 2024", "petunia 2025"]);
    expect(search({ color: "orange" })).toEqual(["zinnia 2025"]);
  });

  it("treats % and _ in text filters as plain characters", () => {
    expect(search({ variety: "100%" })).toEqual(["salvia 2026"]);
    expect(search({ variety: "%" })).toEqual(["salvia 2026"]);
    expect(search({ flower: "_" })).toEqual([]);
  });

  it("zone matches every bed in the zone", () => {
    expect(search({ zone: 2 })).toEqual(["peony 2021", "petunia 2024", "zinnia 2025"]);
  });

  it("bed matches one bed", () => {
    expect(search({ bed: 1 })).toEqual(["impatiens 2026", "petunia 2025", "salvia 2026"]);
  });

  it("year matches plantings in the ground that year, including perennials planted earlier", () => {
    expect(search({ year: 2025 })).toEqual(["peony 2021", "petunia 2025", "zinnia 2025"]);
    expect(search({ year: 2022 })).toEqual(["peony 2021"]);
    expect(search({ year: 2020 })).toEqual([]);
  });

  it("source matches the whole source and ignores case", () => {
    expect(search({ source: "fred meyer" })).toEqual(["impatiens 2026", "petunia 2025"]);
    expect(search({ source: "Fred" })).toEqual([]);
  });

  it("verdict matches one verdict", () => {
    expect(search({ verdict: "again" })).toEqual(["petunia 2025"]);
    expect(search({ verdict: "maybe" })).toEqual(["zinnia 2025"]);
    expect(search({ verdict: "no" })).toEqual(["petunia 2024"]);
  });

  it("type matches annuals or perennials", () => {
    expect(search({ type: "perennial" })).toEqual(["peony 2021"]);
    expect(search({ type: "annual" })).toHaveLength(5);
  });

  it("status separates plantings growing now from past ones", () => {
    expect(search({ status: "current" })).toEqual(["impatiens 2026", "peony 2021", "salvia 2026"]);
    expect(search({ status: "past" })).toEqual(["petunia 2024", "petunia 2025", "zinnia 2025"]);
  });

  it("combines filters so every one must match", () => {
    expect(search({ color: "coral", verdict: "again" })).toEqual(["petunia 2025"]);
    expect(search({ flower: "petunia", year: 2025, bed: 1 })).toEqual(["petunia 2025"]);
    expect(search({ color: "coral", zone: 2, status: "current" })).toEqual([]);
  });
});

describe("parseFilters and filtersToQuery", () => {
  it("reads each filter from the address and writes it back in a fixed order", () => {
    const filters = parseFilters(
      new URLSearchParams(
        "status=past&type=annual&verdict=again&source=Fred+Meyer&year=2025&bed=4&zone=2&color=coral&variety=Vista&flower=Petunia",
      ),
    );
    expect(filters).toEqual({
      flower: "Petunia",
      variety: "Vista",
      color: "coral",
      zone: 2,
      bed: 4,
      year: 2025,
      source: "Fred Meyer",
      verdict: "again",
      type: "annual",
      status: "past",
    });
    expect(filtersToQuery(filters)).toBe(
      "flower=Petunia&variety=Vista&color=coral&zone=2&bed=4&year=2025&source=Fred+Meyer&verdict=again&type=annual&status=past",
    );
  });

  it("drops empty and invalid values, so they cannot widen or break a search", () => {
    const filters = parseFilters({
      flower: "  ",
      color: " coral ",
      zone: "abc",
      bed: "0",
      year: "25",
      verdict: "yes",
      type: "shrub",
      status: "all",
    });
    expect(filters).toEqual({ ...NO_FILTERS, color: "coral" });
    expect(filtersToQuery(filters)).toBe("color=coral");
  });

  it("reads the first value when a filter is repeated", () => {
    expect(parseFilters({ color: ["coral", "pink"] }).color).toBe("coral");
  });

  it("reports whether any filter is set", () => {
    expect(hasFilters(parseFilters({}))).toBe(false);
    expect(hasFilters(parseFilters({ status: "current" }))).toBe(true);
  });
});

describe("describeFilters and exampleSearches", () => {
  it("labels each filter in use, with zone and bed names when given", () => {
    expect(
      describeFilters({ ...NO_FILTERS, color: "coral", bed: 4, verdict: "again", type: "perennial" }, { bed: "Fence Border" }),
    ).toEqual(["color: coral", "bed: Fence Border", "verdict: would plant again", "perennials"]);
  });

  it("writes each example search in the same form the search form produces", () => {
    for (const example of exampleSearches(2026)) {
      const filters = parseFilters(new URLSearchParams(example.query));
      expect(hasFilters(filters), example.label).toBe(true);
      expect(filtersToQuery(filters), example.label).toBe(example.query);
    }
  });
});
