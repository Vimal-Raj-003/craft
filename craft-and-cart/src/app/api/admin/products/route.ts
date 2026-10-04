import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";
import { ProductFields, slugify } from "@/lib/admin-products";

/** Create a product (Super Admin only). Photos are uploaded afterwards on the product's edit page. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  if (!(await getAdmin())) return fail("Forbidden", 403);
  const p = ProductFields.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid input");
  const d = p.data;

  const cat = await pool.query("SELECT id FROM categories WHERE slug=$1", [d.categorySlug]);
  if (!cat.rows[0]) return fail("Unknown category");
  const base = slugify(d.name) || "product";
  let slug = base;
  for (let n = 2; (await pool.query("SELECT 1 FROM products WHERE slug=$1", [slug])).rowCount; n++) slug = `${base}-${n}`;

  try {
    const { rows } = await pool.query(
      `INSERT INTO products(slug,sku,name,tagline,description,price_paise,category_id,stock,colors,featured,active)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [slug, d.sku, d.name, d.tagline, d.description, d.pricePaise, cat.rows[0].id, d.stock, d.colors, d.featured, d.active],
    );
    return NextResponse.json({ id: rows[0].id });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("That SKU is already used by another product", 409);
    throw e;
  }
}
