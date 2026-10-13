// Deletes the database file named on the command line, then migrates and seeds a new one.
// Used by the end-to-end tests: tsx scripts/reset-db.ts data/e2e.db
// The path is required so the real database is never reset by accident.
import fs from "node:fs";
import path from "node:path";
import { openDatabase } from "../lib/db";
import { migrate } from "../lib/migrate";
import { seedSampleGarden } from "../lib/sample-garden";

const target = process.argv[2];
if (!target) {
  console.error("Usage: tsx scripts/reset-db.ts <database-file>");
  process.exit(1);
}
const file = path.resolve(target);
if (path.basename(file) === "gardenlog.db") {
  console.error("Refusing to reset gardenlog.db, the application database.");
  process.exit(1);
}

for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(file + suffix, { force: true });
const db = openDatabase(file);
migrate(db);
seedSampleGarden(db);
db.close();
console.log(`Reset ${file}`);
