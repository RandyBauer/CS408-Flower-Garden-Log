import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Db } from "@/lib/db";
import { activeYears, groupByYear } from "@/lib/history";
import { migrate } from "@/lib/migrate";
import { seedSampleGarden } from "@/lib/sample-garden";
import { buildSearchQuery, NO_FILTERS } from "@/lib/search";

const THIS_YEAR = 2026;

describe("activeYears", () => {
  it("counts an annual planted and pulled in one season for that year only", () => {
    expect(activeYears("2025-05-17", "2025-10-04", THIS_YEAR)).toEqual([2025]);
  });

  it("counts a planting removed in a later year for every year it spanned, newest first", () => {
    expect(activeYears("2021-05-01", "2025-09-20", THIS_YEAR)).toEqual([2025, 2024, 2023, 2022, 2021]);
  });

  it("counts a planting still in the ground through this year", () => {
    expect(activeYears("2021-05-01", null, THIS_YEAR)).toEqual([2026, 2025, 2024, 2023, 2022, 2021]);
    expect(activeYears("2026-05-18", null, THIS_YEAR)).toEqual([2026]);
  });

  it("counts both years for a planting that crossed New Year's", () => {
    expect(activeYears("2024-12-31", "2025-01-01", THIS_YEAR)).toEqual([2025, 2024]);
  });

  it("counts a planting removed the day it was planted for that year", () => {
    expect(activeYears("2025-06-01", "2025-06-01", THIS_YEAR)).toEqual([2025]);
  });

  it("counts a planting dated after this year for its own year", () => {
    expect(activeYears("2027-04-15", null, THIS_YEAR)).toEqual([2027]);
  });
});

describe("groupByYear", () => {
  const petunia = { name: "petunia", plantedOn: "2025-05-17", removedOn: "2025-10-04" };
  const lilac = { name: "lilac", plantedOn: "2023-04-10", removedOn: "2025-08-30" };
  const marigold = { name: "marigold", plantedOn: "2024-05-18", removedOn: "2024-10-12" };
  const names = (groups: ReturnType<typeof groupByYear<typeof petunia>>) =>
    groups.map(({ year, plantings }) => [year, plantings.map((planting) => planting.name)]);

  it("lists each planting under every year it was in the ground, newest year first", () => {
    expect(names(groupByYear([petunia, lilac, marigold], THIS_YEAR))).toEqual([
      [2025, ["petunia", "lilac"]],
      [2024, ["lilac", "marigold"]],
      [2023, ["lilac"]],
    ]);
  });

  it("keeps the given order within a year", () => {
    expect(names(groupByYear([lilac, petunia], THIS_YEAR))[0]).toEqual([2025, ["lilac", "petunia"]]);
  });

  it("returns no groups for no plantings", () => {
    expect(groupByYear([], THIS_YEAR)).toEqual([]);
  });
});

// The bed history groups plantings with activeYears; the search page's year filter uses SQL.
// Across the sample garden, which has annuals, perennials still growing, and plantings in several
// years, both must pick the same plantings for every year.
describe("the search year filter agrees with activeYears", () => {
  let dir: string;
  let db: Db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gardenlog-history-"));
    db = openDatabase(path.join(dir, "test.db"));
    migrate(db);
    seedSampleGarden(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("for every year from 2020 through this year", () => {
    const thisYear = new Date().getFullYear();
    const plantings = db
      .prepare("SELECT id, planted_on AS plantedOn, removed_on AS removedOn FROM plantings ORDER BY id")
      .all() as { id: number; plantedOn: string; removedOn: string | null }[];
    expect(plantings.length).toBeGreaterThan(20);

    for (let year = 2020; year <= thisYear; year++) {
      const { where, params } = buildSearchQuery({ ...NO_FILTERS, year });
      const fromSql = db
        .prepare(
          `SELECT p.id FROM plantings p JOIN plants pl ON pl.id = p.plant_id JOIN beds b ON b.id = p.bed_id
          WHERE ${where} ORDER BY p.id`,
        )
        .pluck()
        .all(...params);
      const fromHistory = plantings
        .filter((planting) => activeYears(planting.plantedOn, planting.removedOn, thisYear).includes(year))
        .map((planting) => planting.id);
      expect(fromHistory, String(year)).toEqual(fromSql);
    }
  });
});
