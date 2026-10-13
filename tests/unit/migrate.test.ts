import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Db } from "@/lib/db";
import { migrate } from "@/lib/migrate";
import { seedSampleGarden } from "@/lib/sample-garden";

let dir: string;
let db: Db;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "gardenlog-test-"));
  db = openDatabase(path.join(dir, "test.db"));
});

afterEach(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const tables = () =>
  db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .pluck()
    .all();

describe("migrate", () => {
  it("creates every table on an empty database", () => {
    expect(tables()).toEqual([]);

    expect(migrate(db)).toEqual(["001_initial.sql"]);

    expect(tables()).toEqual([
      "beds", "photos", "plantings", "plants", "schema_migrations", "sessions", "users", "zones",
    ]);
  });

  it("applies nothing when run again", () => {
    migrate(db);
    expect(migrate(db)).toEqual([]);
  });

  it("enforces foreign keys and allowed values", () => {
    migrate(db);
    db.prepare("INSERT INTO zones (name) VALUES ('Front Walk')").run();

    const insertBed = db.prepare(
      "INSERT INTO beds (zone_id, name, kind, public_slug) VALUES (?, 'Bed', ?, ?)",
    );
    expect(() => insertBed.run(999, "outdoor", "a")).toThrow(/FOREIGN KEY/);
    expect(() => insertBed.run(1, "greenhouse", "b")).toThrow(/CHECK/);
    expect(() => insertBed.run(1, "outdoor", "c")).not.toThrow();
    expect(() => insertBed.run(1, "outdoor", "c")).toThrow(/UNIQUE/);
  });

  it("rejects a planting removed before it was planted", () => {
    migrate(db);
    db.prepare("INSERT INTO zones (name) VALUES ('Front Walk')").run();
    db.prepare("INSERT INTO beds (zone_id, name, public_slug) VALUES (1, 'Bed', 'a')").run();
    db.prepare("INSERT INTO plants (flower, lifecycle) VALUES ('Zinnia', 'annual')").run();

    expect(() =>
      db
        .prepare(
          "INSERT INTO plantings (bed_id, plant_id, planted_on, removed_on) VALUES (1, 1, ?, ?)",
        )
        .run("2026-05-18", "2026-05-01"),
    ).toThrow(/CHECK/);
  });
});

describe("seedSampleGarden", () => {
  it("loads the sample garden once", () => {
    migrate(db);

    expect(seedSampleGarden(db)).toBe(true);
    const count = (table: string) =>
      db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get() as number;
    const zones = count("zones");
    const plantings = count("plantings");
    expect(zones).toBeGreaterThan(0);
    expect(plantings).toBeGreaterThan(0);

    expect(seedSampleGarden(db)).toBe(false);
    expect(count("zones")).toBe(zones);
    expect(count("plantings")).toBe(plantings);
  });

  it("links transplants to the rack planting they came from", () => {
    migrate(db);
    seedSampleGarden(db);

    const links = db
      .prepare(
        `SELECT rack.kind FROM plantings p
        JOIN plantings src ON src.id = p.from_planting_id
        JOIN beds rack ON rack.id = src.bed_id`,
      )
      .pluck()
      .all();
    expect(links.length).toBeGreaterThan(0);
    expect(new Set(links)).toEqual(new Set(["rack"]));
  });
});
