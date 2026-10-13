-- Initial schema. Dates are ISO 8601 text (2026-05-18); timestamps are ISO 8601 UTC.

CREATE TABLE zones (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE beds (
  id            INTEGER PRIMARY KEY,
  zone_id       INTEGER NOT NULL REFERENCES zones(id),
  name          TEXT    NOT NULL,
  kind          TEXT    NOT NULL DEFAULT 'outdoor' CHECK (kind IN ('outdoor', 'rack')),
  location_note TEXT,
  public_slug   TEXT    NOT NULL UNIQUE
);

CREATE INDEX beds_zone_id ON beds(zone_id);

-- The plant library: one row per flower, variety, and color combination.
-- variety and color are '' when not recorded, because UNIQUE treats NULLs as distinct.
CREATE TABLE plants (
  id        INTEGER PRIMARY KEY,
  flower    TEXT NOT NULL,
  variety   TEXT NOT NULL DEFAULT '',
  color     TEXT NOT NULL DEFAULT '',
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('annual', 'perennial')),
  UNIQUE (flower, variety, color)
);

CREATE TABLE plantings (
  id               INTEGER PRIMARY KEY,
  bed_id           INTEGER NOT NULL REFERENCES beds(id),
  plant_id         INTEGER NOT NULL REFERENCES plants(id),
  planted_on       TEXT    NOT NULL,
  removed_on       TEXT,
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  source           TEXT,
  notes            TEXT,
  from_planting_id INTEGER REFERENCES plantings(id),
  verdict          TEXT CHECK (verdict IN ('again', 'maybe', 'no')),
  verdict_note     TEXT,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK (removed_on IS NULL OR removed_on >= planted_on)
);

CREATE INDEX plantings_bed_id ON plantings(bed_id);
CREATE INDEX plantings_plant_id ON plantings(plant_id);

CREATE TABLE photos (
  id           INTEGER PRIMARY KEY,
  planting_id  INTEGER REFERENCES plantings(id),
  bed_id       INTEGER REFERENCES beds(id),
  kind         TEXT NOT NULL CHECK (kind IN ('tag', 'plant', 'bed')),
  storage_path TEXT NOT NULL,
  taken_on     TEXT,
  CHECK ((kind = 'bed' AND bed_id IS NOT NULL AND planting_id IS NULL)
      OR (kind IN ('tag', 'plant') AND planting_id IS NOT NULL AND bed_id IS NULL))
);

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE sessions (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE,
  expires_at TEXT    NOT NULL
);
