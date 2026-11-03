// Deletes the database file named on the command line, then migrates and seeds a new one with
// the sample garden and the demo account. A second argument names a photo folder to empty.
// Used by the end-to-end tests: tsx scripts/reset-db.ts data/e2e.db data/e2e-uploads
// The paths are required so the real database and photos are never reset by accident.
import fs from "node:fs";
import path from "node:path";
import { createDemoGardener } from "../lib/accounts";
import { openDatabase } from "../lib/db";
import { migrate } from "../lib/migrate";
import { seedSampleGarden } from "../lib/sample-garden";

const [target, uploadsTarget] = process.argv.slice(2);
if (!target) {
  console.error("Usage: tsx scripts/reset-db.ts <database-file> [<photo-folder>]");
  process.exit(1);
}
const file = path.resolve(target);
if (path.basename(file) === "gardenlog.db") {
  console.error("Refusing to reset gardenlog.db, the application database.");
  process.exit(1);
}
const uploads = uploadsTarget ? path.resolve(uploadsTarget) : undefined;
if (uploads && path.basename(uploads) === "uploads") {
  console.error("Refusing to empty uploads, the application's photo folder.");
  process.exit(1);
}

for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(file + suffix, { force: true });
const db = openDatabase(file);
migrate(db);
seedSampleGarden(db);
createDemoGardener(db);
db.close();
console.log(`Reset ${file}`);

if (uploads) {
  fs.rmSync(uploads, { recursive: true, force: true });
  console.log(`Emptied ${uploads}`);
}
