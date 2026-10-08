import { connection } from "next/server";

// deploy/deploy.sh requests this route after each deploy and expects 200.
export async function GET() {
  // Answer at request time; without this the response is prerendered at build time.
  await connection();
  return Response.json({ status: "ok" });
}
