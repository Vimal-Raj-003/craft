import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";

const Body = z.object({
  slot: z.union([z.literal(1), z.literal(2)]), // 1 = the ₹1 product, 2 = the ₹2 product
  productId: z.number().int().positive(),
  active: z.boolean(),
});

/**
 * Choose which product is the ₹1 first-order product (slot 1) or the ₹2 first-order product (slot 2).
 * Each slot has at most one active product, and one product cannot hold both slots. The promo price is fixed by the slot.
 */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  if (!(await getAdmin())) return fail("Forbidden", 403);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid input");
  const { slot, productId, active } = p.data;
  const pricePaise = slot * 100;

  const prod = await pool.query("SELECT price_paise, active FROM products WHERE id=$1", [productId]);
  if (!prod.rows[0]) return fail("Product not found", 404);
  if (active && !prod.rows[0].active) return fail("That product is inactive. Activate it first.");
  if (active && prod.rows[0].price_paise <= pricePaise) return fail(`The product's normal price must be above ₹${slot}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE first_order_offer SET active=false, updated_at=now() WHERE slot=$1 AND active", [slot]);
    const existing = await client.query("SELECT id FROM first_order_offer WHERE slot=$1 AND product_id=$2 ORDER BY id DESC LIMIT 1", [slot, productId]);
    if (existing.rows[0]) {
      await client.query("UPDATE first_order_offer SET offer_price_paise=$2, active=$3, updated_at=now() WHERE id=$1", [existing.rows[0].id, pricePaise, active]);
    } else {
      await client.query("INSERT INTO first_order_offer(slot, product_id, offer_price_paise, active) VALUES($1,$2,$3,$4)", [slot, productId, pricePaise, active]);
    }
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    if ((e as { code?: string }).code === "23505") return fail("That product is already the other promotional product. Pick a different one.", 409);
    throw e;
  } finally {
    client.release();
  }
}
