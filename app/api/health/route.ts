import { connection } from "next/server";
import { getDb } from "@/lib/db";

// deploy/deploy.sh requests this route after each deploy and expects 200.
// Returns 200 when the application is running and the migrated database opens.
export async function GET() {
  // Answer at request time; without this the response is prerendered at build time.
  await connection();
  try {
    getDb().prepare("SELECT COUNT(*) FROM schema_migrations").get();
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json({ status: "error", error: "database unavailable" }, { status: 503 });
  }
}
