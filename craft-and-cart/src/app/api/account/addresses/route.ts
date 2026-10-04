import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fail, PHONE_RE, sameOrigin } from "@/lib/http";

const Address = z.object({
  label: z.string().trim().max(30).default("Home"),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(PHONE_RE, "Invalid phone"),
  line1: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const s = await getSession();
  if (!s) return fail("Please sign in", 401);
  const { rows } = await pool.query(
    "SELECT id,label,name,phone,line1,city,state,pincode,is_default FROM addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC",
    [s.id],
  );
  return NextResponse.json({ addresses: rows });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const s = await getSession();
  if (!s) return fail("Please sign in", 401);
  const p = Address.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid input");
  const a = p.data;
  const { rows: cnt } = await pool.query("SELECT count(*)::int AS n FROM addresses WHERE user_id=$1", [s.id]);
  if (cnt[0].n >= 10) return fail("You can save up to 10 addresses", 400);
  const makeDefault = a.isDefault || cnt[0].n === 0;
  if (makeDefault) await pool.query("UPDATE addresses SET is_default=false WHERE user_id=$1", [s.id]);
  const { rows } = await pool.query(
    `INSERT INTO addresses(user_id,label,name,phone,line1,city,state,pincode,is_default)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [s.id, a.label, a.name, a.phone, a.line1, a.city, a.state, a.pincode, makeDefault],
  );
  return NextResponse.json({ id: rows[0].id });
}
