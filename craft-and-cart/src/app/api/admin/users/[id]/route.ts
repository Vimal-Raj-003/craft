import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";

const Body = z.object({ role: z.enum(["CUSTOMER", "ADMIN", "SUPER_ADMIN"]) });

/**
 * Change an account's role. SUPER_ADMIN only. Safety rules:
 *  - you cannot change your own role (so you can never lock yourself out by mistake)
 *  - the last remaining SUPER_ADMIN can never be demoted
 * The role is read from the database on every request, so a change takes effect immediately.
 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const me = await getAdmin();
  if (!me) return fail("Forbidden", 403);
  const id = (await ctx.params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Not found", 404);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Invalid role");
  if (id === me.id) return fail("You cannot change your own role.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query("SELECT role FROM users WHERE id=$1 FOR UPDATE", [id]);
    if (!cur.rows[0]) {
      await client.query("ROLLBACK");
      return fail("User not found", 404);
    }
    if (cur.rows[0].role === "SUPER_ADMIN" && p.data.role !== "SUPER_ADMIN") {
      const n = await client.query("SELECT count(*)::int AS n FROM users WHERE role='SUPER_ADMIN'");
      if (n.rows[0].n <= 1) {
        await client.query("ROLLBACK");
        return fail("This is the last Super Admin and cannot be demoted.", 400);
      }
    }
    await client.query("UPDATE users SET role=$2 WHERE id=$1", [id, p.data.role]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
