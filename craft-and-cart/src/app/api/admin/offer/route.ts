import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";

const Body = z.object({
  productId: z.number().int().positive(),
  offerPricePaise: z.number().int().min(100).max(10_000_000), // Razorpay's minimum is ₹1
  active: z.boolean(),
});

/** Choose THE ₹1 first-order product. Only one offer can be active; saving a new one switches the old one off. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  if (!(await getAdmin())) return fail("Forbidden", 403);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid input");

  const prod = await pool.query("SELECT price_paise, active FROM products WHERE id=$1", [p.data.productId]);
  if (!prod.rows[0]) return fail("Product not found", 404);
  if (p.data.active && !prod.rows[0].active) return fail("That product is inactive. Activate it first.");
  if (p.data.active && prod.rows[0].price_paise <= p.data.offerPricePaise) return fail("The offer price must be lower than the product's normal price");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE first_order_offer SET active=false, updated_at=now() WHERE active");
    const existing = await client.query("SELECT id FROM first_order_offer WHERE product_id=$1 ORDER BY id DESC LIMIT 1", [p.data.productId]);
    if (existing.rows[0]) {
      await client.query("UPDATE first_order_offer SET offer_price_paise=$2, active=$3, updated_at=now() WHERE id=$1", [existing.rows[0].id, p.data.offerPricePaise, p.data.active]);
    } else {
      await client.query("INSERT INTO first_order_offer(product_id, offer_price_paise, active) VALUES($1,$2,$3)", [p.data.productId, p.data.offerPricePaise, p.data.active]);
    }
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
