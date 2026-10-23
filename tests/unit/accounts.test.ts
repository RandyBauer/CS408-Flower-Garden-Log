import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkPassword,
  createSession,
  deleteSession,
  findSessionGardener,
  hashToken,
  setGardener,
  SESSION_DAYS,
} from "@/lib/accounts";
import { openDatabase, type Db } from "@/lib/db";
import { migrate } from "@/lib/migrate";
import { safeNextPath } from "@/lib/session";

let dir: string;
let db: Db;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "gardenlog-test-"));
  db = openDatabase(path.join(dir, "test.db"));
  migrate(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("gardener account", () => {
  it("stores a bcrypt hash and checks the password", () => {
    setGardener(db, " Gardener@Example.com ", "correct horse battery");

    const hash = db.prepare("SELECT password_hash FROM users").pluck().get() as string;
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(checkPassword(db, "gardener@example.com", "correct horse battery")).toMatchObject({
      email: "gardener@example.com",
    });
    expect(checkPassword(db, "gardener@example.com", "wrong password")).toBeUndefined();
    expect(checkPassword(db, "someone@example.com", "correct horse battery")).toBeUndefined();
  });

  it("rejects a short password", () => {
    expect(() => setGardener(db, "gardener@example.com", "short")).toThrow(/at least 10/);
  });

  it("setting a new password signs out existing sessions", () => {
    const user = setGardener(db, "gardener@example.com", "first password");
    const { token } = createSession(db, user.id);

    setGardener(db, "gardener@example.com", "second password");

    expect(findSessionGardener(db, token)).toBeUndefined();
    expect(db.prepare("SELECT COUNT(*) FROM users").pluck().get()).toBe(1);
  });
});

describe("sessions", () => {
  it("stores only the token's hash and finds the gardener by token until it expires", () => {
    const user = setGardener(db, "gardener@example.com", "correct horse battery");
    const now = new Date("2026-10-23T12:00:00Z");
    const { token, expires } = createSession(db, user.id, now);

    expect(db.prepare("SELECT token_hash FROM sessions").pluck().get()).toBe(hashToken(token));
    expect(expires.getTime() - now.getTime()).toBe(SESSION_DAYS * 24 * 60 * 60 * 1000);
    expect(findSessionGardener(db, token, now)).toEqual({ id: user.id, email: "gardener@example.com" });
    expect(findSessionGardener(db, token, expires)).toBeUndefined();
    expect(findSessionGardener(db, "not-a-token", now)).toBeUndefined();
  });

  it("signing out deletes the session", () => {
    const user = setGardener(db, "gardener@example.com", "correct horse battery");
    const { token } = createSession(db, user.id);

    deleteSession(db, token);

    expect(findSessionGardener(db, token)).toBeUndefined();
  });
});

describe("safeNextPath", () => {
  it("allows only paths on this site", () => {
    expect(safeNextPath("/beds/4")).toBe("/beds/4");
    expect(safeNextPath("https://example.com")).toBe("/zones");
    expect(safeNextPath("//example.com")).toBe("/zones");
    expect(safeNextPath(null)).toBe("/zones");
  });
});
