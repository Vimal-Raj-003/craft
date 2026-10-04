import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fail, PHONE_RE, rateLimit, sameOrigin } from "@/lib/http";

const Profile = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  phone: z.string().trim().regex(PHONE_RE, "Enter a valid phone number"),
});
const Password = z.object({
  current: z.string().min(1).max(100),
  next: z.string().min(8, "New password must be at least 8 characters").max(100),
});

// Always the signed-in user's own row: the id comes from the session cookie, never from the request.
export async function GET() {
  const s = await getSession();
  if (!s) return fail("Please sign in", 401);
  const { rows } = await pool.query("SELECT id,name,email,phone,created_at FROM users WHERE id=$1", [s.id]);
  return NextResponse.json({ profile: rows[0] });
}

export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const s = await getSession();
  if (!s) return fail("Please sign in", 401);
  const p = Profile.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid input");
  await pool.query("UPDATE users SET name=$2, phone=$3 WHERE id=$1", [s.id, p.data.name, p.data.phone]);
  return NextResponse.json({ ok: true });
}

/** Change password (needs the current password). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const s = await getSession();
  if (!s) return fail("Please sign in", 401);
  if (!rateLimit(`pw:${s.id}`, 8, 15 * 60_000)) return fail("Too many attempts. Please wait a few minutes.", 429);
  const p = Password.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid input");
  const { rows } = await pool.query("SELECT password_hash FROM users WHERE id=$1", [s.id]);
  if (!rows[0] || !(await bcrypt.compare(p.data.current, rows[0].password_hash))) return fail("Current password is wrong", 400);
  await pool.query("UPDATE users SET password_hash=$2 WHERE id=$1", [s.id, await bcrypt.hash(p.data.next, 10)]);
  return NextResponse.json({ ok: true });
}
