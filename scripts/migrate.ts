// npm run migrate: creates the database if needed and applies pending migrations.
import { databasePath, openDatabase } from "../lib/db";
import { migrate } from "../lib/migrate";

const db = openDatabase();
const applied = migrate(db);
db.close();

if (applied.length === 0) {
  console.log(`Database is up to date: ${databasePath()}`);
} else {
  console.log(`Applied ${applied.join(", ")} to ${databasePath()}`);
}
