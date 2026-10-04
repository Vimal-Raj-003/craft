import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";
import { ProductFields } from "@/lib/admin-products";

// Products are never deleted (orders keep referring to them); the Super Admin deactivates instead.
export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  if (!(await getAdmin())) return fail("Forbidden", 403);
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail("Not found", 404);

  const p = ProductFields.partial().safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid input");
  const d = p.data;

  const sets: string[] = [];
  const vals: unknown[] = [];
  const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };
  if (d.name !== undefined) set("name", d.name);
  if (d.sku !== undefined) set("sku", d.sku);
  if (d.tagline !== undefined) set("tagline", d.tagline);
  if (d.description !== undefined) set("description", d.description);
  if (d.pricePaise !== undefined) set("price_paise", d.pricePaise);
  if (d.stock !== undefined) set("stock", d.stock);
  if (d.colors !== undefined) set("colors", d.colors);
  if (d.active !== undefined) set("active", d.active);
  if (d.featured !== undefined) set("featured", d.featured);
  if (d.categorySlug !== undefined) {
    const cat = await pool.query("SELECT id FROM categories WHERE slug=$1", [d.categorySlug]);
    if (!cat.rows[0]) return fail("Unknown category");
    set("category_id", cat.rows[0].id);
  }
  if (!sets.length) return fail("Nothing to change");
  vals.push(id);
  try {
    const r = await pool.query(`UPDATE products SET ${sets.join(", ")} WHERE id=$${vals.length}`, vals);
    return r.rowCount ? NextResponse.json({ ok: true }) : fail("Not found", 404);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("That SKU is already used by another product", 409);
    throw e;
  }
}
