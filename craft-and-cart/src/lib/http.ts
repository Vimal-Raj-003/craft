import { NextResponse } from "next/server";

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Blocks cross-site form posts: a browser always sends Origin on POST/PATCH, and it must be this site. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, webhooks) don't send one; cookies alone can't be abused cross-site (SameSite=Lax)
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: Request) {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",").pop()!.trim() : "unknown";
}

// Small in-memory limiter (one server process): enough to slow down password guessing.
const hits = new Map<string, { n: number; reset: number }>();

/** Returns true while the caller is within `max` attempts per `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n += 1;
  return h.n <= max;
}

export const clearRateLimit = (key: string) => void hits.delete(key);

export const PHONE_RE = /^[0-9+\-\s]{10,15}$/;
