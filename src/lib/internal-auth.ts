import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type InternalRole = "staff" | "manager" | "admin";

export type InternalSession = {
  profileId: string;
  email: string;
  role: InternalRole;
  staffId: string | null;
  name: string;
  issuedAt: number;
  expiresAt: number;
};

const cookieName = "maison_internal_session";
const sessionTtlSeconds = 60 * 60 * 8;
const nonProductionSecret = randomBytes(32).toString("base64url");

function getSessionSecret() {
  const secret = process.env.INTERNAL_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("INTERNAL_AUTH_SECRET is required in production.");
  }
  return secret ?? nonProductionSecret;
}

export function createSessionPayload(session: Omit<InternalSession, "issuedAt" | "expiresAt">): InternalSession {
  const issuedAt = Math.floor(Date.now() / 1000);
  return { ...session, issuedAt, expiresAt: issuedAt + sessionTtlSeconds };
}

export function signSession(session: InternalSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token?: string | null): InternalSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as InternalSession;
    const now = Math.floor(Date.now() / 1000);
    if (!session.issuedAt || !session.expiresAt || session.expiresAt <= now) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getInternalSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(cookieName)?.value);
}

export async function setInternalSession(session: InternalSession) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)),
  });
}

export async function clearInternalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export function canAccessAdmin(session: InternalSession | null) {
  return Boolean(session && (session.role === "admin" || session.role === "manager"));
}

export const internalSessionCookieName = cookieName;
