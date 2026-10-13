// npm run seed: loads the sample garden into an empty database. Run npm run migrate first.
import { databasePath, openDatabase } from "../lib/db";
import { seedSampleGarden } from "../lib/sample-garden";

const db = openDatabase();
const loaded = seedSampleGarden(db);
db.close();

console.log(
  loaded
    ? `Loaded the sample garden into ${databasePath()}`
    : "The database already has zones; the sample garden was not loaded.",
);
