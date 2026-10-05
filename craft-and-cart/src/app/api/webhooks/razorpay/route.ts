import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { confirmRazorpayPayment, recordPaymentProblem } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { consumeOfferOnFailure } from "@/lib/offer";
import { logPay } from "@/lib/pay-log";

// Razorpay Dashboard → Account & Settings → Webhooks → Add:
//   URL: https://craft.jilljill.in/api/webhooks/razorpay   Secret = RAZORPAY_WEBHOOK_SECRET
//   Events: payment.captured, payment.failed, order.paid
export async function POST(req: Request) {
  const raw = await req.text(); // the signature is over the exact raw body
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  const pay = event.payload?.payment?.entity as { id?: string; order_id?: string; amount?: number; error_description?: string } | undefined;
  if (!pay?.order_id || !pay.id) return NextResponse.json({ ok: true });

  const { rows } = await pool.query("SELECT order_id, amount_paise FROM payments WHERE razorpay_order_id=$1", [pay.order_id]);
  const row = rows[0];
  if (!row) return NextResponse.json({ ok: true }); // not one of ours / unknown order: acknowledge so Razorpay stops retrying

  if (event.event === "payment.captured" || event.event === "order.paid") {
    if (pay.amount !== row.amount_paise) {
      await logPay({ orderId: row.order_id, stage: "webhook", ok: false, code: "AMOUNT_MISMATCH", message: `${event.event}: amount ${pay.amount} differs from ${row.amount_paise}`, razorpayOrderId: pay.order_id, razorpayPaymentId: pay.id });
      return NextResponse.json({ ok: true });
    }
    const first = await confirmRazorpayPayment(row.order_id, pay.id);
    await logPay({ orderId: row.order_id, stage: "webhook", ok: true, code: first ? "PAID" : "DUPLICATE_IGNORED", message: event.event, amountPaise: row.amount_paise, razorpayOrderId: pay.order_id, razorpayPaymentId: pay.id });
  } else if (event.event === "payment.failed") {
    await recordPaymentProblem(row.order_id, "failed", pay.error_description ?? "Payment failed");
    await logPay({ orderId: row.order_id, stage: "webhook", ok: false, code: "payment.failed", message: pay.error_description ?? "Payment failed", amountPaise: row.amount_paise, razorpayOrderId: pay.order_id, razorpayPaymentId: pay.id });
    await consumeOfferOnFailure(pool, row.order_id); // a signed Razorpay failure notice spends the first-order offer (no-op once paid)
  }
  return NextResponse.json({ ok: true });
}
