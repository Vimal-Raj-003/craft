import crypto from "node:crypto";

// Razorpay Standard Checkout. The Key Secret is only ever used in this server-side file.
// RAZORPAY_API_BASE exists so automated tests can point at a local stand-in; it is ignored in production.
const base = () =>
  (process.env.NODE_ENV !== "production" && process.env.RAZORPAY_API_BASE) || "https://api.razorpay.com/v1";

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";

const authHeader = () =>
  "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");

/** A Razorpay API failure with the exact, safe facts: HTTP status, Razorpay's own error code and description. */
export class RazorpayError extends Error {
  constructor(
    public path: string,
    public status: number | null, // null = never got an HTTP answer (network / timeout / bad input)
    public code: string, // Razorpay's error.code (e.g. BAD_REQUEST_ERROR) or one of ours (AUTH_FAILED, AMOUNT_INVALID, GATEWAY_UNREACHABLE)
    public description: string,
  ) {
    super(`Razorpay ${path} failed: ${description}`);
  }
}

/** Short, safe, human explanation for the Super Admin (never contains a key or a secret). */
export function explainRazorpayError(e: unknown): { code: string; message: string; hint: string } {
  if (e instanceof RazorpayError) {
    if (e.status === 401 || e.code === "AUTH_FAILED") {
      return {
        code: "AUTH_FAILED",
        message: "Razorpay rejected the API credentials (HTTP 401: Authentication failed).",
        hint: "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not a matching pair. Typical causes: the Key ID and the Secret come from different key generations or different modes (rzp_test_ with a live secret, or the reverse); the Secret was regenerated after it was saved; or the saved value has stray spaces, quotes or a missing character. Re-copy BOTH values from the same Razorpay Dashboard key screen, update .env.production, and recreate craft-web.",
      };
    }
    if (e.code === "AMOUNT_INVALID") return { code: e.code, message: e.description, hint: "The amount sent to Razorpay must be a whole number of paise, at least 100 (₹1)." };
    if (e.status === null) return { code: "GATEWAY_UNREACHABLE", message: e.description, hint: "The server could not reach api.razorpay.com (network, DNS, firewall or timeout)." };
    if (e.status >= 500) return { code: "GATEWAY_ERROR", message: `Razorpay had a server error (HTTP ${e.status}).`, hint: "Usually temporary. Retry in a few minutes." };
    return { code: e.code || "BAD_REQUEST", message: e.description, hint: "Razorpay refused the request; the message above is Razorpay's own reason (for example an account that is not activated for live payments)." };
  }
  return { code: "UNKNOWN", message: "Unexpected error talking to Razorpay.", hint: "See the server log." };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      ...init,
      headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new RazorpayError(path, null, "GATEWAY_UNREACHABLE", (e as Error).name === "TimeoutError" ? "Timed out waiting for Razorpay" : "Could not connect to Razorpay");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { code?: string; description?: string } })?.error;
    throw new RazorpayError(path, res.status, res.status === 401 ? "AUTH_FAILED" : err?.code ?? "BAD_REQUEST", err?.description ?? `HTTP ${res.status}`);
  }
  return data as T;
}

/** Creates the Razorpay order for an amount WE computed (whole paise). `receipt` is our order id. */
export function createRazorpayOrder(amountPaise: number, receipt: string) {
  // Razorpay wants an integer number of paise (₹1 = 100), never rupees, never a decimal.
  if (!Number.isInteger(amountPaise) || amountPaise < 100) {
    throw new RazorpayError("/orders", null, "AMOUNT_INVALID", `Amount must be a whole number of paise, at least 100 (got ${String(amountPaise)})`);
  }
  return call<{ id: string; amount: number; currency: string; status: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes: { order_id: receipt } }),
  });
}

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  method?: string;
  error_code?: string | null;
  error_description?: string | null;
  error_reason?: string | null;
  error_step?: string | null;
  created_at?: number;
};

/** Payments made against a Razorpay order, straight from Razorpay (used when the browser never reported back). */
export async function listOrderPayments(razorpayOrderId: string) {
  const r = await call<{ items: RazorpayPayment[] }>(`/orders/${encodeURIComponent(razorpayOrderId)}/payments`);
  return r.items ?? [];
}

/** Read-only credential check: asks Razorpay for one order. 200 = the key pair is valid for this mode. */
export function pingRazorpay() {
  return call<{ items: unknown[] }>("/orders?count=1");
}

/** What the running server actually received for the three Razorpay settings. Names, modes and hygiene only: NEVER values. */
export function razorpayEnvReport() {
  const id = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const wh = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  const mode = !id ? "missing" : id.startsWith("rzp_live_") ? "live" : id.startsWith("rzp_test_") ? "test" : "unknown";
  const hygiene = (v: string) => (/^\s|\s$/.test(v) ? "has leading/trailing space" : /["']/.test(v) ? "contains a quote character" : /\s/.test(v) ? "contains a space" : /\r|\n/.test(v) ? "contains a line break" : "ok");
  return {
    keyId: { set: Boolean(id), length: id.length, hygiene: id ? hygiene(id) : "n/a", shown: id ? `${id.slice(0, 9)}…${id.slice(-4)}` : "" }, // the Key ID is public by design
    keySecret: { set: Boolean(secret), length: secret.length, hygiene: secret ? hygiene(secret) : "n/a" },
    webhookSecret: { set: Boolean(wh), length: wh.length, hygiene: wh ? hygiene(wh) : "n/a" },
    mode,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    apiBase: base(),
  };
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
