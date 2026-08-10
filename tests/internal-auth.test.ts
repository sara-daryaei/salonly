import assert from "node:assert/strict";
import { test } from "node:test";
import { signSession, verifySession, type InternalSession } from "../src/lib/internal-auth";

function session(overrides: Partial<InternalSession> = {}): InternalSession {
  const now = Math.floor(Date.now() / 1000);
  return {
    profileId: "profile-1",
    email: "staff@example.com",
    role: "staff",
    staffId: "sophie",
    name: "Staff User",
    issuedAt: now,
    expiresAt: now + 60,
    ...overrides,
  };
}

test("signed session verifies before expiry", () => {
  const token = signSession(session());
  assert.equal(verifySession(token)?.profileId, "profile-1");
});

test("expired session is rejected", () => {
  const now = Math.floor(Date.now() / 1000);
  const token = signSession(session({ issuedAt: now - 120, expiresAt: now - 60 }));
  assert.equal(verifySession(token), null);
});

test("forged session cookie is rejected", () => {
  const token = signSession(session());
  const [payload, signature] = token.split(".");
  const forgedPayload = Buffer.from(JSON.stringify(session({ role: "admin" }))).toString("base64url");
  assert.equal(verifySession(`${forgedPayload}.${signature}`), null);
  assert.equal(verifySession(`${payload}.invalid`), null);
});
