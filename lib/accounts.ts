import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Db } from "./db";

// The gardener account and its sign-in sessions. One deployment has one gardener; the account is
// created on the server with `npm run gardener:create`. The browser holds a random token in a
// cookie; the database stores only its SHA-256 hash, so a copied database cannot sign anyone in.

export const SESSION_DAYS = 30;
export const MIN_PASSWORD_LENGTH = 10;

// Created by start.sh and the end-to-end tests. Never created on the EC2 server.
export const DEMO_GARDENER = { email: "demo@gardenlog.local", password: "plant-again-2026" };

export interface Gardener {
  id: number;
  email: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Creates the account, or replaces the password if the email already has one.
export function setGardener(db: Db, email: string, password: string): Gardener {
  const address = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+$/.test(address)) throw new Error("Enter a valid email address.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO users (email, password_hash) VALUES (?, ?)
    ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash`,
  ).run(address, hash);
  const user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(address) as Gardener;
  // A new password signs out every existing session.
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  return user;
}

export function createDemoGardener(db: Db): boolean {
  const exists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(DEMO_GARDENER.email);
  if (exists) return false;
  setGardener(db, DEMO_GARDENER.email, DEMO_GARDENER.password);
  return true;
}

// Returns the gardener when the email and password match.
export function checkPassword(db: Db, email: string, password: string): Gardener | undefined {
  const user = db
    .prepare("SELECT id, email, password_hash AS hash FROM users WHERE email = ?")
    .get(normalizeEmail(email)) as (Gardener & { hash: string }) | undefined;
  // Compare against a throwaway hash when the email is unknown, so both cases take as long.
  const ok = bcrypt.compareSync(password, user?.hash ?? DUMMY_HASH);
  return user && ok ? { id: user.id, email: user.email } : undefined;
}

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

// Starts a session and returns the token for the cookie.
export function createSession(db: Db, userId: number, now = new Date()): { token: string; expires: Date } {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now.toISOString());
  db.prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)").run(
    userId,
    hashToken(token),
    expires.toISOString(),
  );
  return { token, expires };
}

export function findSessionGardener(db: Db, token: string, now = new Date()): Gardener | undefined {
  return db
    .prepare(
      `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), now.toISOString()) as Gardener | undefined;
}

export function deleteSession(db: Db, token: string) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}
