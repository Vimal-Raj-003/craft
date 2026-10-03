import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { shippingFor } from "@/lib/money";
import { finalizeOrder } from "@/lib/orders";
import { createPayment, phonepeConfigured, siteUrl } from "@/lib/phonepe";

const Body = z.object({
  paymentMethod: z.enum(["online", "cod"]),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, "Invalid phone"),
  address: z.object({
    line1: z.string().trim().min(3).max(200),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  }),
  items: z
    .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(20), color: z.string().max(50).optional() }))
    .min(1)
    .max(50),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const b = parsed.data;

  // Prices & stock always come from the DB, never from the client.
  const ids = [...new Set(b.items.map((i) => i.productId))];
  const { rows: products } = await pool.query(
    "SELECT id,name,price_paise,stock FROM products WHERE id = ANY($1) AND active",
    [ids],
  );
  const byId = new Map(products.map((p) => [p.id as number, p]));
  let subtotal = 0;
  for (const it of b.items) {
    const p = byId.get(it.productId);
    if (!p) return NextResponse.json({ error: "A product in your cart is no longer available" }, { status: 400 });
    if (p.stock < it.qty) return NextResponse.json({ error: `Only ${p.stock} left of ${p.name}` }, { status: 409 });
    subtotal += p.price_paise * it.qty;
  }
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;
  const session = await getSession();

  const client = await pool.connect();
  let orderId: string;
  try {
    await client.query("BEGIN");
    const o = await client.query(
      `INSERT INTO orders(user_id,email,name,phone,address,subtotal_paise,shipping_paise,total_paise,payment_method)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [session?.id ?? null, b.email, b.name, b.phone, b.address, subtotal, shipping, total, b.paymentMethod],
    );
    orderId = o.rows[0].id;
    for (const it of b.items) {
      const p = byId.get(it.productId)!;
      await client.query(
        "INSERT INTO order_items(order_id,product_id,name,color,qty,price_paise) VALUES($1,$2,$3,$4,$5,$6)",
        [orderId, p.id, p.name, it.color ?? null, it.qty, p.price_paise],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  } finally {
    client.release();
  }

  // Cash on delivery: no online payment, the order is confirmed right away.
  if (b.paymentMethod === "cod") {
    await finalizeOrder(orderId, "confirmed", "cod");
    return NextResponse.json({ orderId, method: "cod" });
  }

  // No PhonePe credentials yet → demo mode (the checkout page simulates the payment).
  if (!phonepeConfigured()) {
    // Never simulate a payment on a live site: it would let anyone create "paid" orders for free.
    if (process.env.NODE_ENV === "production") {
      await pool.query("UPDATE orders SET status='cancelled' WHERE id=$1", [orderId]);
      return NextResponse.json({ error: "Online payment isn't available yet. Please choose Cash on Delivery." }, { status: 503 });
    }
    return NextResponse.json({ orderId, method: "online", demo: true });
  }

  try {
    const pay = await createPayment(orderId, total, `${siteUrl()}/order/${orderId}`);
    await pool.query("UPDATE orders SET payment_ref=$2 WHERE id=$1", [orderId, pay.phonepeOrderId]);
    return NextResponse.json({ orderId, method: "online", redirectUrl: pay.redirectUrl });
  } catch (e) {
    console.error("PhonePe order failed", e);
    await pool.query("UPDATE orders SET status='failed' WHERE id=$1", [orderId]);
    return NextResponse.json({ error: "Payment gateway unavailable. Please try again or choose Cash on Delivery." }, { status: 502 });
  }
}