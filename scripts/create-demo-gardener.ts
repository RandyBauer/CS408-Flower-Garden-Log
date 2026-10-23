// npm run gardener:demo: creates the demo account for local use. start.sh runs it.
// Not used on the EC2 server, where the gardener runs npm run gardener:create instead.
import { createDemoGardener, DEMO_GARDENER } from "../lib/accounts";
import { openDatabase } from "../lib/db";

const db = openDatabase();
const created = createDemoGardener(db);
db.close();

console.log(created ? `Created the demo account ${DEMO_GARDENER.email}` : `Demo account ${DEMO_GARDENER.email} exists`);
