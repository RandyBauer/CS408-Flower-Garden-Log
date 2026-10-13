import { connection } from "next/server";
import { getDb } from "./db";

// Read queries for the zone and bed pages. better-sqlite3 is synchronous, so each function
// awaits connection() first; otherwise Next.js would run the query once at build time and
// serve that result to every request.

export type Lifecycle = "annual" | "perennial";
export type Verdict = "again" | "maybe" | "no";
export type BedKind = "outdoor" | "rack";

export interface ZoneSummary {
  id: number;
  name: string;
  description: string | null;
  bedCount: number;
  rackCount: number;
  activeCount: number;
}

export interface Zone {
  id: number;
  name: string;
  description: string | null;
}

export interface Bed {
  id: number;
  zoneId: number;
  zoneName: string;
  name: string;
  kind: BedKind;
  locationNote: string | null;
  publicSlug: string;
}

export interface Planting {
  id: number;
  bedId: number;
  bedName: string;
  flower: string;
  variety: string;
  color: string;
  lifecycle: Lifecycle;
  plantedOn: string;
  removedOn: string | null;
  quantity: number;
  source: string | null;
  notes: string | null;
  verdict: Verdict | null;
  verdictNote: string | null;
}

export interface BedWithPlantings extends Bed {
  current: Planting[];
}

const BED_COLUMNS = `b.id, b.zone_id AS zoneId, z.name AS zoneName, b.name, b.kind,
  b.location_note AS locationNote, b.public_slug AS publicSlug`;

const PLANTING_COLUMNS = `p.id, p.bed_id AS bedId, b.name AS bedName, pl.flower, pl.variety,
  pl.color, pl.lifecycle, p.planted_on AS plantedOn, p.removed_on AS removedOn, p.quantity,
  p.source, p.notes, p.verdict, p.verdict_note AS verdictNote`;

const PLANTING_FROM = `plantings p
  JOIN plants pl ON pl.id = p.plant_id
  JOIN beds b ON b.id = p.bed_id`;

export async function listZones(): Promise<ZoneSummary[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT z.id, z.name, z.description,
        (SELECT COUNT(*) FROM beds b WHERE b.zone_id = z.id) AS bedCount,
        (SELECT COUNT(*) FROM beds b WHERE b.zone_id = z.id AND b.kind = 'rack') AS rackCount,
        (SELECT COUNT(*) FROM plantings p JOIN beds b ON b.id = p.bed_id
          WHERE b.zone_id = z.id AND p.removed_on IS NULL) AS activeCount
      FROM zones z
      ORDER BY z.sort_order, z.name`,
    )
    .all() as ZoneSummary[];
}

export async function getZone(id: number): Promise<Zone | undefined> {
  await connection();
  return getDb()
    .prepare("SELECT id, name, description FROM zones WHERE id = ?")
    .get(id) as Zone | undefined;
}

// Beds in a zone, each with its current plantings.
export async function listBedsInZone(zoneId: number): Promise<BedWithPlantings[]> {
  await connection();
  const db = getDb();
  const beds = db
    .prepare(
      `SELECT ${BED_COLUMNS} FROM beds b JOIN zones z ON z.id = b.zone_id
      WHERE b.zone_id = ? ORDER BY b.name`,
    )
    .all(zoneId) as Bed[];
  const plantings = db
    .prepare(
      `SELECT ${PLANTING_COLUMNS} FROM ${PLANTING_FROM}
      WHERE b.zone_id = ? AND p.removed_on IS NULL
      ORDER BY pl.lifecycle DESC, pl.flower, pl.variety`,
    )
    .all(zoneId) as Planting[];
  return beds.map((bed) => ({
    ...bed,
    current: plantings.filter((planting) => planting.bedId === bed.id),
  }));
}

export async function getBed(id: number): Promise<Bed | undefined> {
  await connection();
  return getDb()
    .prepare(`SELECT ${BED_COLUMNS} FROM beds b JOIN zones z ON z.id = b.zone_id WHERE b.id = ?`)
    .get(id) as Bed | undefined;
}

export async function listCurrentPlantings(bedId: number): Promise<Planting[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT ${PLANTING_COLUMNS} FROM ${PLANTING_FROM}
      WHERE p.bed_id = ? AND p.removed_on IS NULL
      ORDER BY pl.lifecycle DESC, p.planted_on, pl.flower`,
    )
    .all(bedId) as Planting[];
}

// Ended plantings, most recent first.
export async function listPastPlantings(bedId: number): Promise<Planting[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT ${PLANTING_COLUMNS} FROM ${PLANTING_FROM}
      WHERE p.bed_id = ? AND p.removed_on IS NOT NULL
      ORDER BY p.removed_on DESC, pl.flower`,
    )
    .all(bedId) as Planting[];
}

// Most recently planted outdoor plantings that are still in the ground, for the home page.
export async function listGrowingNow(limit = 6): Promise<Planting[]> {
  await connection();
  return getDb()
    .prepare(
      `SELECT ${PLANTING_COLUMNS} FROM ${PLANTING_FROM}
      WHERE p.removed_on IS NULL AND b.kind = 'outdoor'
      ORDER BY p.planted_on DESC, p.id DESC
      LIMIT ?`,
    )
    .all(limit) as Planting[];
}
