import crypto from "crypto";
import { NextRequest } from "next/server";

export type UserRole = "ADMIN" | "STAFF" | "KITCHEN";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  exp: number;
}

const AUTH_SECRET =
  process.env.AMORINO_AUTH_SECRET ||
  "amorino-luxury-hospitality-secret-key-2026-kenya-verified";

export const SESSION_COOKIE_NAME = "amorino_staff_session";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedBuffer = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
  } catch {
    return false;
  }
}

export function signSessionToken(user: Omit<SessionUser, "exp">): string {
  const payload: SessionUser = {
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;
    const expectedSig = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(data)
      .digest("base64url");
    if (signature !== expectedSig) return null;
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    ) as SessionUser;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) {
    return verifySessionToken(cookieToken);
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifySessionToken(authHeader.slice(7));
  }
  return null;
}

export function requireRoles(
  req: NextRequest,
  allowedRoles: UserRole[]
): { authorized: true; user: SessionUser } | { authorized: false; status: number; error: string } {
  const user = getSessionFromRequest(req);
  if (!user) {
    return {
      authorized: false,
      status: 401,
      error: "Authentication required. Please sign in to the Amorino Staff Portal.",
    };
  }
  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      status: 403,
      error: `Insufficient permissions. Required role: ${allowedRoles.join(" or ")}.`,
    };
  }
  return { authorized: true, user };
}
