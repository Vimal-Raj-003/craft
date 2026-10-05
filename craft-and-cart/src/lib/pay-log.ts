import { pool } from "./db";

export type PayStage =
  | "order_create"      // our server asked Razorpay for an order
  | "checkout_open"     // the browser opened the Razorpay window
  | "client_cancelled"  // the customer closed the window
  | "client_failed"     // Razorpay's window reported a failed attempt (bank / UPI / card decline ...)
  | "verify"            // our server checked the payment signature
  | "webhook"           // a signed Razorpay webhook arrived
  | "status_sync"       // our server asked Razorpay for the payment state
  | "db_update";        // our database was updated to PAID

/** Strip anything that could be a secret or a token (long hex/base64 runs), then cap the length. */
const scrub = (s: string | null | undefined, max = 300) =>
  (s ?? "")
    .replace(/[A-Za-z0-9+/_-]{32,}={0,2}/g, "[redacted]")
    .replace(/(secret|password|token|authorization|cvv|otp)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .slice(0, max);

/**
 * One safe diagnostic row per payment stage (and a single JSON line on the server log).
 * Never pass keys, secrets, passwords, session tokens, OTPs, CVV or card data into this function.
 */
export async function logPay(e: {
  orderId?: string | null;
  stage: PayStage;
  ok: boolean;
  code?: string | null;
  message?: string | null;
  amountPaise?: number | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
}) {
  const row = {
    order_id: e.orderId ?? null,
    stage: e.stage,
    ok: e.ok,
    code: scrub(e.code, 80) || null,
    message: scrub(e.message) || null,
    amount_paise: Number.isInteger(e.amountPaise) ? (e.amountPaise as number) : null,
    razorpay_order_id: e.razorpayOrderId?.slice(0, 60) ?? null,
    razorpay_payment_id: e.razorpayPaymentId?.slice(0, 60) ?? null,
  };
  console.log(JSON.stringify({ at: new Date().toISOString(), pay: row }));
  try {
    await pool.query(
      `INSERT INTO payment_events(order_id,stage,ok,code,message,amount_paise,razorpay_order_id,razorpay_payment_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [row.order_id, row.stage, row.ok, row.code, row.message, row.amount_paise, row.razorpay_order_id, row.razorpay_payment_id],
    );
  } catch (err) {
    console.error("could not write payment_events", (err as Error).message); // diagnostics must never break a payment
  }
}
