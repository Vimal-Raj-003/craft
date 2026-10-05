import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fail, PHONE_RE, sameOrigin } from "@/lib/http";
import { confirmCodOrder } from "@/lib/orders";
import { computeQuote, holdOffer, restoreOfferForOrder } from "@/lib/offer";
import { createRazorpayOrder, explainRazorpayError, razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { logPay } from "@/lib/pay-log";

const Body = z.object({
  paymentMethod: z.enum(["online", "cod"]),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(PHONE_RE, "Invalid phone"),
  address: z.object({
    line1: z.string().trim().min(3).max(200),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  }),
  saveAddress: z.boolean().optional(),
  items: z
    .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(20), color: z.string().max(50).optional() }))
    .min(1)
    .max(50),
});

type Customer = { name: string; email: string; phone: string };

/** What the browser needs to open Razorpay Checkout. Contains the PUBLIC key id only. */
const razorpayParams = (orderId: string, razorpayOrderId: string, amount: number, c: Customer) => ({
  orderId,
  method: "online" as const,
  razorpay: {
    key: razorpayKeyId(),
    order_id: razorpayOrderId,
    amount,
    currency: "INR",
    name: "Craft & Cart",
    description: "Handmade crochet order",
    prefill: { name: c.name, email: c.email, contact: c.phone },
  },
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const session = await getSession();
  if (!session) return fail("Please sign in to place an order", 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request");
  const b = parsed.data;
  const customer: Customer = { name: b.name, email: session.email, phone: b.phone };

  if (b.paymentMethod === "online" && !razorpayConfigured()) {
    return fail("Online payment isn't available right now. Please choose Cash on Delivery.", 503);
  }

  const client = await pool.connect();
  let orderId: string;
  let total: number;
  try {
    await client.query("BEGIN");
    // Serialise this customer's checkouts so the first-order offer can never be claimed twice at once.
    await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [session.id]);

    // Prices, stock and the first-order offer are ALL decided here, on the server.
    const q = await computeQuote(client, { userId: session.id, method: b.paymentMethod, items: b.items, phone: b.phone });
    if (!q.ok) {
      await client.query("ROLLBACK");
      return fail(q.error, q.status);
    }
    total = q.total;

    // Duplicate protection: the same signed-in customer sending the same cart, address and payment method again
    // (double click, refresh, retry after closing the Razorpay window) gets the SAME order back, not a second one.
    const fingerprint = crypto
      .createHash("sha256")
      .update(JSON.stringify([b.paymentMethod, q.total, q.discount, b.address, [...b.items].sort((x, y) => x.productId - y.productId || (x.color ?? "").localeCompare(y.color ?? ""))]))
      .digest("hex");
    const window = b.paymentMethod === "cod" ? 60 : 1800;
    const { rows: dup } = await client.query(
      `SELECT o.id, p.status AS pay_status, p.razorpay_order_id
         FROM orders o JOIN payments p ON p.order_id=o.id
        WHERE o.user_id=$1 AND o.idempotency_key=$2 AND o.status <> 'cancelled' AND o.created_at > now() - ($3 * interval '1 second')
        ORDER BY o.created_at DESC LIMIT 1`,
      [session.id, fingerprint, window],
    );
    if (dup[0]) {
      await client.query("COMMIT");
      if (b.paymentMethod === "cod") return NextResponse.json({ orderId: dup[0].id, method: "cod" });
      if (dup[0].pay_status === "paid") return NextResponse.json({ orderId: dup[0].id, method: "online", alreadyPaid: true });
      if (dup[0].razorpay_order_id) return NextResponse.json(razorpayParams(dup[0].id, dup[0].razorpay_order_id, q.total, customer));
      // (an old order that never got a Razorpay id: fall through and create a fresh one)
      await client.query("BEGIN");
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [session.id]);
    }

    const o = await client.query(
      `INSERT INTO orders(user_id,email,name,phone,address,subtotal_paise,shipping_paise,total_paise,payment_method,idempotency_key,discount_paise,promo_product_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [session.id, session.email, b.name, b.phone, b.address, q.subtotal, q.shipping, q.total, b.paymentMethod, fingerprint, q.discount, q.promos[0]?.productId ?? null],
    );
    orderId = o.rows[0].id;
    for (const l of q.lines) {
      await client.query(
        "INSERT INTO order_items(order_id,product_id,name,color,qty,price_paise,promo,normal_price_paise,free_shipping) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [orderId, l.productId, l.name, l.color, l.qty, l.unitPaise, l.promo, l.normalPaise, l.freeShipping],
      );
    }
    await client.query(
      "INSERT INTO payments(order_id,user_id,provider,status,amount_paise) VALUES($1,$2,$3,'pending',$4)",
      [orderId, session.id, b.paymentMethod === "cod" ? "cod" : "razorpay", q.total],
    );
    if (q.promos.length) await holdOffer(client, session.id, orderId, b.phone);
    if (b.saveAddress) {
      const exists = await client.query("SELECT count(*)::int AS n FROM addresses WHERE user_id=$1", [session.id]);
      await client.query(
        "INSERT INTO addresses(user_id,name,phone,line1,city,state,pincode,is_default) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [session.id, b.name, b.phone, b.address.line1, b.address.city, b.address.state, b.address.pincode, exists.rows[0].n === 0],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    if ((e as { code?: string }).code === "23505" && String((e as { constraint?: string }).constraint).includes("offer_claims")) {
      return fail("The ₹1 offer is no longer available for this phone number. Please review your cart and try again.", 409);
    }
    console.error(e);
    return fail("Could not create order", 500);
  } finally {
    client.release();
  }

  if (b.paymentMethod === "cod") {
    await confirmCodOrder(orderId);
    return NextResponse.json({ orderId, method: "cod" });
  }

  try {
    const rz = await createRazorpayOrder(total, orderId);
    await pool.query("UPDATE payments SET razorpay_order_id=$2, updated_at=now() WHERE order_id=$1", [orderId, rz.id]);
    // Razorpay must have created the order for exactly the amount we computed
    if (rz.amount !== total || rz.currency !== "INR") {
      await logPay({ orderId, stage: "order_create", ok: false, code: "AMOUNT_MISMATCH", message: `Razorpay order amount ${rz.amount} ${rz.currency} differs from ${total} INR`, amountPaise: total, razorpayOrderId: rz.id });
    } else {
      await logPay({ orderId, stage: "order_create", ok: true, amountPaise: total, razorpayOrderId: rz.id });
    }
    return NextResponse.json(razorpayParams(orderId, rz.id, total, customer));
  } catch (e) {
    const x = explainRazorpayError(e);
    if (x.code === "UNKNOWN") console.error("checkout: unexpected error after order insert:", (e as Error)?.message);
    await logPay({ orderId, stage: "order_create", ok: false, code: x.code, message: x.message, amountPaise: total });
    await pool.query("UPDATE orders SET status='cancelled' WHERE id=$1", [orderId]);
    await pool.query("UPDATE payments SET status='failed', failure_reason=$2, updated_at=now() WHERE order_id=$1", [orderId, `${x.code}: ${x.message}`.slice(0, 300)]);
    await restoreOfferForOrder(pool, orderId); // the order is cancelled before any payment attempt: the offer goes back
    // The customer gets a plain message; the exact reason is in Admin → Payments and the server log.
    return fail(`Online payment is temporarily unavailable. Please choose Cash on Delivery or try again later. (Reference ${orderId.slice(0, 8)})`, 502);
  }
}