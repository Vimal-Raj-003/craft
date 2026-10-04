import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";
import { confirmRazorpayPayment, recordPaymentProblem } from "@/lib/orders";
import { verifyPaymentSignature } from "@/lib/razorpay";

const Body = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("success"),
    orderId: z.string().uuid(),
    razorpay_order_id: z.string().min(5).max(60),
    razorpay_payment_id: z.string().min(5).max(60),
    razorpay_signature: z.string().min(10).max(200),
  }),
  z.object({ event: z.enum(["cancelled", "failed"]), orderId: z.string().uuid(), reason: z.string().max(300).optional() }),
]);

/**
 * The browser reports what happened in the Razorpay window. Success is NEVER taken on trust: the signature
 * (HMAC with the secret key, which only this server has) must verify. "cancelled"/"failed" are only notes.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const session = await getSession();
  if (!session) return fail("Please sign in", 401);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Invalid request");
  const b = p.data;

  // Only the customer who owns the order can touch it (IDOR guard).
  const { rows } = await pool.query(
    `SELECT o.id, pay.razorpay_order_id, pay.status AS pay_status
       FROM orders o JOIN payments pay ON pay.order_id=o.id
      WHERE o.id=$1 AND o.user_id=$2 AND pay.provider='razorpay'`,
    [b.orderId, session.id],
  );
  const o = rows[0];
  if (!o) return fail("Order not found", 404);

  if (b.event !== "success") {
    await recordPaymentProblem(o.id, b.event, b.reason ?? null);
    return NextResponse.json({ ok: true });
  }

  if (!o.razorpay_order_id || o.razorpay_order_id !== b.razorpay_order_id) return fail("Payment does not match this order", 400);
  if (!verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
    await recordPaymentProblem(o.id, "failed", "Signature verification failed");
    return fail("Payment could not be verified", 400);
  }
  await confirmRazorpayPayment(o.id, b.razorpay_payment_id);
  return NextResponse.json({ ok: true, orderId: o.id });
}
