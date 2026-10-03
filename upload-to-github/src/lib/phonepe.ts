import crypto from "node:crypto";

// PhonePe Payment Gateway — Standard Checkout v2 (https://developer.phonepe.com)
const ENDPOINTS = {
  sandbox: {
    token: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    api: "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2",
  },
  production: {
    token: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    api: "https://api.phonepe.com/apis/pg/checkout/v2",
  },
} as const;

const env = () => (process.env.PHONEPE_ENV === "production" ? ENDPOINTS.production : ENDPOINTS.sandbox);

export const phonepeConfigured = () => Boolean(process.env.PHONEPE_CLIENT_ID && process.env.PHONEPE_CLIENT_SECRET);
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const g = globalThis as unknown as { ppToken?: { value: string; expiresAt: number } };

async function accessToken() {
  const cached = g.ppToken;
  if (cached && cached.expiresAt - 60 > Date.now() / 1000) return cached.value;

  const res = await fetch(env().token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.PHONEPE_CLIENT_ID!,
      client_version: process.env.PHONEPE_CLIENT_VERSION ?? "1",
      client_secret: process.env.PHONEPE_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`PhonePe auth failed: ${data.message ?? res.status}`);
  g.ppToken = { value: data.access_token, expiresAt: data.expires_at };
  return data.access_token as string;
}

/** Starts a PhonePe checkout; send the customer to `redirectUrl` (opens the PhonePe app on phones). */
export async function createPayment(merchantOrderId: string, amountPaise: number, returnUrl: string) {
  const res = await fetch(`${env().api}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `O-Bearer ${await accessToken()}` },
    body: JSON.stringify({
      merchantOrderId,
      amount: amountPaise,
      expireAfter: 1800,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Craft & Cart order",
        merchantUrls: { redirectUrl: returnUrl },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.redirectUrl) throw new Error(`PhonePe pay failed: ${data.message ?? res.status}`);
  return { redirectUrl: data.redirectUrl as string, phonepeOrderId: data.orderId as string };
}

export type PhonePeState = "COMPLETED" | "FAILED" | "PENDING";

export async function getOrderStatus(merchantOrderId: string) {
  const res = await fetch(`${env().api}/order/${encodeURIComponent(merchantOrderId)}/status`, {
    headers: { Authorization: `O-Bearer ${await accessToken()}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PhonePe status failed: ${data.message ?? res.status}`);
  const txn = Array.isArray(data.paymentDetails) ? data.paymentDetails[0]?.transactionId : undefined;
  return { state: (data.state ?? "PENDING") as PhonePeState, orderId: data.orderId as string | undefined, transactionId: txn as string | undefined };
}

/** PhonePe sends `Authorization: SHA256(username:password)` with webhooks. */
export function verifyWebhookAuth(header: string) {
  const user = process.env.PHONEPE_WEBHOOK_USER;
  const pass = process.env.PHONEPE_WEBHOOK_PASS;
  if (!user || !pass) return false;
  const expected = crypto.createHash("sha256").update(`${user}:${pass}`).digest("hex");
  const got = header.trim().replace(/^sha256\s*/i, "").toLowerCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
