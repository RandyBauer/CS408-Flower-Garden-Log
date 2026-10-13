import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type Db = Database.Database;

// DATABASE_PATH overrides the default, for example to give the end-to-end tests their own file.
export function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "gardenlog.db");
}

export function openDatabase(file: string = databasePath()): Db {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

// One connection per server process. Kept on globalThis so dev-mode reloads reuse it.
const globalForDb = globalThis as unknown as { gardenlogDb?: Db };

export function getDb(): Db {
  globalForDb.gardenlogDb ??= openDatabase();
  return globalForDb.gardenlogDb;
}
