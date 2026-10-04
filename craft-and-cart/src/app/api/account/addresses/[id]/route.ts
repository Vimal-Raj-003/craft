import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";

const Id = z.string().uuid();

// Every query is scoped with user_id = the signed-in user, so another customer's address id simply matches nothing.
export async function DELETE(req: Request, ctx: RouteContext<"/api/account/addresses/[id]">) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const s = await getSession();
  if (!s) return fail("Please sign in", 401);
  const id = Id.safeParse((await ctx.params).id);
  if (!id.success) return fail("Not found", 404);
  const r = await pool.query("DELETE FROM addresses WHERE id=$1 AND user_id=$2", [id.data, s.id]);
  return r.rowCount ? NextResponse.json({ ok: true }) : fail("Not found", 404);
}

/** Make this address the default. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/account/addresses/[id]">) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const s = await getSession();
  if (!s) return fail("Please sign in", 401);
  const id = Id.safeParse((await ctx.params).id);
  if (!id.success) return fail("Not found", 404);
  const own = await pool.query("SELECT 1 FROM addresses WHERE id=$1 AND user_id=$2", [id.data, s.id]);
  if (!own.rowCount) return fail("Not found", 404);
  await pool.query("UPDATE addresses SET is_default = (id=$1) WHERE user_id=$2", [id.data, s.id]);
  return NextResponse.json({ ok: true });
}
