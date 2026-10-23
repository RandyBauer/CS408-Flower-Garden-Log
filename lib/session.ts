import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSession, deleteSession, findSessionGardener, type Gardener } from "./accounts";
import { getDb } from "./db";

// Reads and writes the sign-in cookie. proxy.ts redirects requests that have no cookie at all;
// pages and server actions call requireGardener(), which checks the token against the database.

export const SESSION_COOKIE = "gardenlog_session";

export async function getGardener(): Promise<Gardener | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  // The check compares the session's expiry with the current time, so it must run per request.
  await connection();
  return findSessionGardener(getDb(), token);
}

export async function requireGardener(): Promise<Gardener> {
  const gardener = await getGardener();
  if (!gardener) redirect("/sign-in");
  return gardener;
}

export async function startSession(userId: number) {
  const { token, expires } = createSession(getDb(), userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    // The site is served over plain HTTP until the HTTPS stretch feature, so the cookie cannot
    // be marked Secure by default. Set COOKIE_SECURE=true once the site has a certificate.
    secure: process.env.COOKIE_SECURE === "true",
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(getDb(), token);
  store.delete(SESSION_COOKIE);
}

// Only same-site paths, so a crafted sign-in link cannot send the gardener elsewhere.
export function safeNextPath(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/zones";
}
