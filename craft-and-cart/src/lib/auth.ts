import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { pool } from "./db";

const COOKIE = "cc_session";
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!s || s.length < 32)) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters in production");
  }
  return new TextEncoder().encode(s ?? "dev-secret-change-me");
};

export type SessionUser = { id: string; email: string; name: string; role: "customer" | "admin" };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    // Re-check against DB so deleted users / role changes take effect.
    const { rows } = await pool.query("SELECT id,email,name,role FROM users WHERE id=$1", [payload.id]);
    return (rows[0] as SessionUser) ?? null;
  } catch {
    return null;
  }
}
