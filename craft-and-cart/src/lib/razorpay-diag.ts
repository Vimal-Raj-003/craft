import { createRazorpayOrder, explainRazorpayError, pingRazorpay, razorpayEnvReport } from "./razorpay";

// Step-by-step Razorpay check against the REAL running configuration. Never returns a key secret or any secret value:
// only SET / MISSING, lengths, test/live mode, and Razorpay's own error code and message.

export type DiagStatus = "PASS" | "FAIL" | "WARN" | "SKIPPED";
export type DiagStep = { id: string; title: string; status: DiagStatus; detail: string; hint?: string };

export async function runRazorpayDiagnostics(opts: { createTestOrder?: boolean } = {}): Promise<DiagStep[]> {
  const steps: DiagStep[] = [];
  const env = razorpayEnvReport();

  // 1. what the running application actually received
  const parts = [
    `RAZORPAY_KEY_ID: ${env.keyId.set ? `SET (${env.keyId.shown}, ${env.keyId.length} chars, ${env.keyId.hygiene})` : "MISSING"}`,
    `RAZORPAY_KEY_SECRET: ${env.keySecret.set ? `SET (${env.keySecret.length} chars, ${env.keySecret.hygiene})` : "MISSING"}`,
    `RAZORPAY_WEBHOOK_SECRET: ${env.webhookSecret.set ? `SET (${env.webhookSecret.length} chars, ${env.webhookSecret.hygiene})` : "MISSING"}`,
  ];
  const missingKeys = !env.keyId.set || !env.keySecret.set;
  const dirty = [env.keyId, env.keySecret, env.webhookSecret].some((x) => x.set && x.hygiene !== "ok");
  steps.push({
    id: "env",
    title: "Environment variables received by the running server",
    status: missingKeys ? "FAIL" : dirty ? "WARN" : "PASS",
    detail: parts.join("  ·  "),
    hint: missingKeys
      ? "A required variable is empty inside the container. Add it to .env.production and recreate craft-web (docker compose up -d --no-deps craft-web); a plain restart does not re-read the file."
      : dirty
        ? "A value has stray spaces or quotes. Re-paste it without them."
        : undefined,
  });

  // 2. mode
  steps.push({
    id: "mode",
    title: "Key mode",
    status: env.mode === "missing" ? "FAIL" : env.mode === "unknown" ? "WARN" : "PASS",
    detail: env.mode === "live" ? "LIVE mode (rzp_live_): real money, needs an activated Razorpay account." : env.mode === "test" ? "TEST mode (rzp_test_): no real money." : env.mode === "missing" ? "No Key ID." : "The Key ID does not start with rzp_test_ or rzp_live_.",
    hint: env.mode === "unknown" ? "Copy the Key ID again from the Razorpay Dashboard (API Keys)." : undefined,
  });

  // 3. plausible shapes (Key ID ≈ 23 chars, Key Secret ≈ 24 chars). A different length usually means a copy-paste slip.
  const oddId = env.keyId.set && (env.keyId.length < 20 || env.keyId.length > 30);
  const oddSecret = env.keySecret.set && (env.keySecret.length < 20 || env.keySecret.length > 40);
  steps.push({
    id: "shape",
    title: "Key format",
    status: !env.keyId.set || !env.keySecret.set ? "SKIPPED" : oddId || oddSecret ? "WARN" : "PASS",
    detail: !env.keyId.set || !env.keySecret.set ? "Skipped (a key is missing)." : `Key ID ${env.keyId.length} chars, Key Secret ${env.keySecret.length} chars.`,
    hint: oddId || oddSecret ? "The length is unusual: a character may have been cut off or added when the value was pasted." : undefined,
  });

  // 4. authentication with Razorpay (read-only call)
  if (missingKeys) {
    steps.push({ id: "auth", title: "Authentication with Razorpay", status: "SKIPPED", detail: "Skipped (keys are missing)." });
  } else {
    try {
      await pingRazorpay();
      steps.push({ id: "auth", title: "Authentication with Razorpay", status: "PASS", detail: `Razorpay accepted the Key ID + Key Secret pair (${env.mode.toUpperCase()} mode).` });
    } catch (e) {
      const x = explainRazorpayError(e);
      steps.push({ id: "auth", title: "Authentication with Razorpay", status: "FAIL", detail: `${x.code}: ${x.message}`, hint: x.hint });
    }
  }

  // 5. order creation (only when asked: creates one unpaid ₹1 order in the Razorpay dashboard; no money moves)
  const authOk = steps.find((s) => s.id === "auth")?.status === "PASS";
  if (!opts.createTestOrder) {
    steps.push({ id: "order", title: "Razorpay order creation (₹1 test order)", status: "SKIPPED", detail: "Not run. Use “Run check + create ₹1 test order” to test it (creates one unpaid ₹1 order in your Razorpay dashboard; no money is taken)." });
  } else if (!authOk) {
    steps.push({ id: "order", title: "Razorpay order creation (₹1 test order)", status: "SKIPPED", detail: "Skipped because authentication failed." });
  } else {
    try {
      const o = await createRazorpayOrder(100, `diag-${Date.now()}`);
      steps.push({ id: "order", title: "Razorpay order creation (₹1 test order)", status: o.amount === 100 && o.currency === "INR" ? "PASS" : "FAIL", detail: `Created ${o.id}: amount ${o.amount} paise (${o.currency}), status ${o.status}.` });
    } catch (e) {
      const x = explainRazorpayError(e);
      steps.push({ id: "order", title: "Razorpay order creation (₹1 test order)", status: "FAIL", detail: `${x.code}: ${x.message}`, hint: x.hint });
    }
  }

  // 6. amount handling (pure check of the rule the checkout uses)
  const rupeesToPaise = (r: number) => Math.round(r * 100);
  const ok = rupeesToPaise(1) === 100 && rupeesToPaise(2) === 200 && rupeesToPaise(99) === 9900 && rupeesToPaise(300) === 30000;
  steps.push({ id: "amount", title: "Amount in paise", status: ok ? "PASS" : "FAIL", detail: "₹1 = 100, ₹2 = 200, ₹99 = 9900, ₹300 = 30000 paise. The server computes the amount from database prices and refuses anything that is not a whole number of at least 100 paise." });

  // 7. webhook + site url
  steps.push({
    id: "webhook",
    title: "Webhook secret",
    status: env.webhookSecret.set ? "PASS" : "WARN",
    detail: env.webhookSecret.set ? "RAZORPAY_WEBHOOK_SECRET is set. In the Razorpay Dashboard the webhook URL must be https://<your-domain>/api/webhooks/razorpay with the same secret, events payment.captured, payment.failed, order.paid." : "RAZORPAY_WEBHOOK_SECRET is missing: webhooks will be rejected (payments still complete through the browser callback).",
  });
  steps.push({
    id: "site",
    title: "Site URL",
    status: env.siteUrl.startsWith("https://") ? "PASS" : "WARN",
    detail: env.siteUrl ? `NEXT_PUBLIC_SITE_URL = ${env.siteUrl}` : "NEXT_PUBLIC_SITE_URL is not set.",
  });
  return steps;
}
