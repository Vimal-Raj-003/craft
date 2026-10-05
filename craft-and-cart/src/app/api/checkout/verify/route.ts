import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";
import { confirmRazorpayPayment, recordPaymentProblem, spendOfferIfRazorpayReportsFailure } from "@/lib/orders";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { logPay } from "@/lib/pay-log";

const Body = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("success"),
    orderId: z.string().uuid(),
    razorpay_order_id: z.string().min(5).max(60),
    razorpay_payment_id: z.string().min(5).max(60),
    razorpay_signature: z.string().min(10).max(200),
  }),
  z.object({ event: z.literal("opened"), orderId: z.string().uuid() }),
  z.object({
    event: z.enum(["cancelled", "failed"]),
    orderId: z.string().uuid(),
    reason: z.string().max(300).optional(),
    // Razorpay's own failure details from its checkout window (safe: no card data is ever included)
    code: z.string().max(80).optional(),
    step: z.string().max(80).optional(),
    source: z.string().max(80).optional(),
    paymentId: z.string().max(60).optional(),
  }),
]);

/**
 * The browser reports what happened in the Razorpay window. Success is NEVER taken on trust: the signature
 * (HMAC with the secret key, which only this server has) must verify. "opened"/"cancelled"/"failed" are only notes.
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
    `SELECT o.id, pay.razorpay_order_id, pay.amount_paise, pay.status AS pay_status
       FROM orders o JOIN payments pay ON pay.order_id=o.id
      WHERE o.id=$1 AND o.user_id=$2 AND pay.provider='razorpay'`,
    [b.orderId, session.id],
  );
  const o = rows[0];
  if (!o) return fail("Order not found", 404);
  const ids = { orderId: o.id as string, amountPaise: o.amount_paise as number, razorpayOrderId: o.razorpay_order_id as string | null };

  if (b.event === "opened") {
    await logPay({ ...ids, stage: "checkout_open", ok: true });
    return NextResponse.json({ ok: true });
  }

  if (b.event !== "success") {
    const detail = [b.code, b.step, b.reason].filter(Boolean).join(" / ");
    await recordPaymentProblem(o.id, b.event, detail || b.reason || null);
    await logPay({ ...ids, stage: b.event === "failed" ? "client_failed" : "client_cancelled", ok: false, code: b.code ?? null, message: [b.step && `step: ${b.step}`, b.source && `source: ${b.source}`, b.reason].filter(Boolean).join(" · ") || null, razorpayPaymentId: b.paymentId ?? null });
    // Only a failure that RAZORPAY itself reports spends the first-order offer; closing the window never does.
    if (b.event === "failed") await spendOfferIfRazorpayReportsFailure(o.id);
    return NextResponse.json({ ok: true });
  }

  if (!o.razorpay_order_id || o.razorpay_order_id !== b.razorpay_order_id) {
    await logPay({ ...ids, stage: "verify", ok: false, code: "ORDER_MISMATCH", message: "The Razorpay order id from the browser does not match this order", razorpayPaymentId: b.razorpay_payment_id });
    return fail("Payment does not match this order", 400);
  }
  if (!verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
    await recordPaymentProblem(o.id, "failed", "Signature verification failed");
    await logPay({ ...ids, stage: "verify", ok: false, code: "SIGNATURE_MISMATCH", message: "HMAC(order_id|payment_id) did not match: the server's Key Secret differs from the key that created this order", razorpayPaymentId: b.razorpay_payment_id });
    return fail("Payment could not be verified", 400);
  }
  await logPay({ ...ids, stage: "verify", ok: true, razorpayPaymentId: b.razorpay_payment_id });
  const first = await confirmRazorpayPayment(o.id, b.razorpay_payment_id);
  await logPay({ ...ids, stage: "db_update", ok: true, code: first ? "PAID" : "ALREADY_PAID", razorpayPaymentId: b.razorpay_payment_id });
  return NextResponse.json({ ok: true, orderId: o.id });
}