import fs from "node:fs";
import path from "node:path";
import type { Db } from "./db";

export const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

// Applies every db/migrations/*.sql file not yet recorded in schema_migrations, in file-name
// order, each in its own transaction. Returns the names it applied.
export function migrate(db: Db, dir: string = MIGRATIONS_DIR): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  )`);

  const applied = new Set(
    db.prepare("SELECT name FROM schema_migrations").pluck().all() as string[],
  );
  const pending = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".sql") && !applied.has(file))
    .sort();

  const record = db.prepare("INSERT INTO schema_migrations (name) VALUES (?)");
  for (const file of pending) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      record.run(file);
    })();
  }
  return pending;
}
