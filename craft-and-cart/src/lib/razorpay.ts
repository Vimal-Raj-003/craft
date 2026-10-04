import crypto from "node:crypto";

// Razorpay Standard Checkout. The Key Secret is only ever used in this server-side file.
// RAZORPAY_API_BASE exists so automated tests can point at a local stand-in; it is ignored in production.
const base = () =>
  (process.env.NODE_ENV !== "production" && process.env.RAZORPAY_API_BASE) || "https://api.razorpay.com/v1";

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";

const authHeader = () =>
  "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay ${path} failed: ${data?.error?.description ?? res.status}`);
  return data as T;
}

/** Creates the Razorpay order for an amount WE computed. `receipt` is our order id. */
export function createRazorpayOrder(amountPaise: number, receipt: string) {
  return call<{ id: string; amount: number; currency: string; status: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes: { order_id: receipt } }),
  });
}

export type RazorpayPayment = { id: string; order_id: string; amount: number; status: string; error_description?: string };

/** Payments made against a Razorpay order, straight from Razorpay (used when the browser never reported back). */
export async function listOrderPayments(razorpayOrderId: string) {
  const r = await call<{ items: RazorpayPayment[] }>(`/orders/${encodeURIComponent(razorpayOrderId)}/payments`);
  return r.items ?? [];
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const hmac = (secret: string, data: string | Buffer) => crypto.createHmac("sha256", secret).update(data).digest("hex");

/** Checkout success signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(hmac(secret, `${razorpayOrderId}|${razorpayPaymentId}`), signature.trim().toLowerCase());
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(hmac(secret, rawBody), signature.trim().toLowerCase());
}
