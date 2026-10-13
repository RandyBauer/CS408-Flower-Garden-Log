import { randomInt } from "node:crypto";
import type { Db } from "./db";

// Sample garden loaded by `npm run seed` into an empty database, so a fresh clone has data to show.

type Lifecycle = "annual" | "perennial";
type Verdict = "again" | "maybe" | "no";

const plants = {
  vistaBubblegum: ["Petunia", "Supertunia Vista Bubblegum", "pink", "annual"],
  wavePurple: ["Petunia", "Wave Purple", "purple", "annual"],
  profusionOrange: ["Zinnia", "Profusion Orange", "orange", "annual"],
  magnus: ["Coneflower", "Magnus", "purple", "perennial"],
  sarahBernhardt: ["Peony", "Sarah Bernhardt", "pink", "perennial"],
  victoriaBlue: ["Salvia", "Victoria Blue", "blue", "annual"],
  durangoYellow: ["Marigold", "Durango Yellow", "yellow", "annual"],
  rocketMix: ["Snapdragon", "Rocket Mix", "mixed", "annual"],
  calliope: ["Geranium", "Calliope Dark Red", "red", "annual"],
  goldsturm: ["Black-eyed Susan", "Goldsturm", "yellow", "perennial"],
  hidcote: ["Lavender", "Hidcote", "purple", "perennial"],
  sunpatiens: ["Impatiens", "SunPatiens Coral", "coral", "annual"],
  dragonWing: ["Begonia", "Dragon Wing Red", "red", "annual"],
  sensation: ["Cosmos", "Sensation Mix", "mixed", "annual"],
  stellaDeOro: ["Daylily", "Stella de Oro", "yellow", "perennial"],
  snowCrystals: ["Sweet Alyssum", "Snow Crystals", "white", "annual"],
  becky: ["Shasta Daisy", "Becky", "white", "perennial"],
} satisfies Record<string, [string, string, string, Lifecycle]>;

type PlantKey = keyof typeof plants;

interface SamplePlanting {
  plant: PlantKey;
  planted: string;
  removed?: string;
  quantity: number;
  source: string;
  notes?: string;
  verdict?: Verdict;
  verdictNote?: string;
  // Names the rack planting this one was transplanted from (see `key`).
  from?: string;
  key?: string;
}

interface SampleBed {
  name: string;
  kind?: "outdoor" | "rack";
  note: string;
  plantings: SamplePlanting[];
}

interface SampleZone {
  name: string;
  description: string;
  beds: SampleBed[];
}

const garden: SampleZone[] = [
  {
    name: "Front Walk",
    description: "Beds along the walk to the front door.",
    beds: [
      {
        name: "Mailbox Bed",
        note: "by the street",
        plantings: [
          { plant: "stellaDeOro", planted: "2022-05-07", quantity: 3, source: "Garden center" },
          { plant: "vistaBubblegum", planted: "2026-05-16", quantity: 6, source: "Fred Meyer" },
          { plant: "snowCrystals", planted: "2026-05-16", quantity: 8, source: "Fred Meyer" },
          { plant: "wavePurple", planted: "2025-05-17", removed: "2025-10-04", quantity: 6, source: "Fred Meyer", verdict: "again" },
          { plant: "dragonWing", planted: "2024-05-18", removed: "2024-10-05", quantity: 5, source: "Home Depot", verdict: "no", verdictNote: "too tall for the mailbox" },
        ],
      },
      {
        name: "Walk Border",
        note: "both sides of the front walk",
        plantings: [
          { plant: "hidcote", planted: "2023-05-20", quantity: 5, source: "Garden center" },
          { plant: "profusionOrange", planted: "2026-05-23", quantity: 10, source: "Home Depot" },
          { plant: "durangoYellow", planted: "2026-05-23", quantity: 12, source: "Fred Meyer" },
          { plant: "profusionOrange", planted: "2025-05-24", removed: "2025-10-11", quantity: 10, source: "Home Depot", verdict: "again" },
          { plant: "sensation", planted: "2025-05-24", removed: "2025-10-11", quantity: 8, source: "grown from seed", verdict: "maybe", verdictNote: "flopped over the walk by August" },
        ],
      },
      {
        name: "Porch Pots",
        note: "containers on the front porch",
        plantings: [
          { plant: "calliope", planted: "2026-05-09", quantity: 4, source: "Fred Meyer" },
          { plant: "sunpatiens", planted: "2026-05-09", quantity: 4, source: "Fred Meyer" },
          { plant: "calliope", planted: "2025-05-10", removed: "2025-10-04", quantity: 4, source: "Fred Meyer", verdict: "again" },
        ],
      },
    ],
  },
  {
    name: "South Fence",
    description: "Full sun along the south fence line.",
    beds: [
      {
        name: "Fence Border",
        note: "east of the gate",
        plantings: [
          { plant: "sarahBernhardt", planted: "2021-05-01", quantity: 1, source: "Neighbor division" },
          { plant: "profusionOrange", planted: "2026-05-18", quantity: 12, source: "Fred Meyer" },
          { plant: "victoriaBlue", planted: "2026-05-18", quantity: 8, source: "Grow rack", from: "salvia2026" },
          { plant: "wavePurple", planted: "2025-05-17", removed: "2025-10-04", quantity: 10, source: "Fred Meyer", verdict: "again" },
          { plant: "rocketMix", planted: "2025-05-17", removed: "2025-10-04", quantity: 6, source: "Grow rack", from: "snapdragon2025", verdict: "maybe", verdictNote: "leggy by August" },
          { plant: "durangoYellow", planted: "2024-05-18", removed: "2024-10-12", quantity: 12, source: "Fred Meyer", verdict: "no" },
        ],
      },
      {
        name: "Corner Bed",
        note: "southwest corner",
        plantings: [
          { plant: "magnus", planted: "2023-06-03", quantity: 3, source: "Garden center" },
          { plant: "goldsturm", planted: "2024-05-25", quantity: 3, source: "Home Depot" },
          { plant: "durangoYellow", planted: "2026-05-18", quantity: 10, source: "Fred Meyer" },
        ],
      },
    ],
  },
  {
    name: "Back Patio",
    description: "Morning shade and afternoon sun.",
    beds: [
      {
        name: "Patio Edge",
        note: "along the patio steps",
        plantings: [
          { plant: "becky", planted: "2024-06-01", quantity: 4, source: "Garden center" },
          { plant: "dragonWing", planted: "2026-05-30", quantity: 6, source: "Home Depot" },
          { plant: "sunpatiens", planted: "2025-05-31", removed: "2025-10-04", quantity: 6, source: "Fred Meyer", verdict: "again" },
        ],
      },
      {
        name: "Patio Planters",
        note: "two large pots by the door",
        plantings: [
          { plant: "wavePurple", planted: "2026-05-30", quantity: 4, source: "Fred Meyer" },
          { plant: "snowCrystals", planted: "2026-05-30", quantity: 4, source: "Fred Meyer" },
          { plant: "vistaBubblegum", planted: "2025-05-31", removed: "2025-10-04", quantity: 4, source: "Fred Meyer", verdict: "maybe", verdictNote: "outgrew the pots" },
        ],
      },
    ],
  },
  {
    name: "Indoors",
    description: "Starters under grow lights.",
    beds: [
      {
        name: "Grow Rack",
        kind: "rack",
        note: "basement shelf",
        plantings: [
          { plant: "rocketMix", planted: "2025-03-08", removed: "2025-05-17", quantity: 6, source: "grown from seed", key: "snapdragon2025" },
          { plant: "victoriaBlue", planted: "2026-03-14", removed: "2026-05-18", quantity: 8, source: "grown from seed", key: "salvia2026" },
          { plant: "calliope", planted: "2026-09-27", quantity: 4, source: "Cuttings from Porch Pots", notes: "Overwintering indoors" },
        ],
      },
    ],
  },
  {
    name: "Side Yard",
    description: "Not planted yet.",
    beds: [],
  },
];

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

// Permanent public identifier for a bed's QR code. Random, so bed URLs cannot be guessed.
export function newPublicSlug(length = 8): string {
  let slug = "";
  for (let i = 0; i < length; i++) slug += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  return slug;
}

// Loads the sample garden only into a database with no zones. Returns whether it loaded.
export function seedSampleGarden(db: Db): boolean {
  const zoneCount = db.prepare("SELECT COUNT(*) FROM zones").pluck().get() as number;
  if (zoneCount > 0) return false;

  const insertZone = db.prepare(
    "INSERT INTO zones (name, description, sort_order) VALUES (?, ?, ?)",
  );
  const insertBed = db.prepare(
    "INSERT INTO beds (zone_id, name, kind, location_note, public_slug) VALUES (?, ?, ?, ?, ?)",
  );
  const insertPlant = db.prepare(
    "INSERT INTO plants (flower, variety, color, lifecycle) VALUES (?, ?, ?, ?)",
  );
  const insertPlanting = db.prepare(`INSERT INTO plantings
    (bed_id, plant_id, planted_on, removed_on, quantity, source, notes, from_planting_id,
     verdict, verdict_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  db.transaction(() => {
    const plantIds = new Map<PlantKey, number>();
    for (const [key, row] of Object.entries(plants) as [PlantKey, string[]][]) {
      plantIds.set(key, Number(insertPlant.run(...row).lastInsertRowid));
    }

    // Rack plantings are inserted first so transplants can reference them.
    const queued: { bedId: number; planting: SamplePlanting }[] = [];
    garden.forEach((zone, zoneIndex) => {
      const zoneId = insertZone.run(zone.name, zone.description, zoneIndex + 1).lastInsertRowid;
      for (const bed of zone.beds) {
        const bedId = Number(
          insertBed.run(zoneId, bed.name, bed.kind ?? "outdoor", bed.note, newPublicSlug())
            .lastInsertRowid,
        );
        for (const planting of bed.plantings) queued.push({ bedId, planting });
      }
    });
    queued.sort((a, b) => Number(Boolean(a.planting.from)) - Number(Boolean(b.planting.from)));

    const keyedIds = new Map<string, number>();
    for (const { bedId, planting: p } of queued) {
      const fromId = p.from ? keyedIds.get(p.from) : undefined;
      if (p.from && fromId === undefined) throw new Error(`Unknown rack planting: ${p.from}`);
      const id = insertPlanting.run(
        bedId, plantIds.get(p.plant), p.planted, p.removed ?? null, p.quantity, p.source,
        p.notes ?? null, fromId ?? null, p.verdict ?? null, p.verdictNote ?? null,
      ).lastInsertRowid;
      if (p.key) keyedIds.set(p.key, Number(id));
    }
  })();
  return true;
}
