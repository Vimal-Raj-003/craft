import { NextResponse } from "next/server";
import { verifyWebhookAuth } from "@/lib/phonepe";
import { syncPhonePeOrder } from "@/lib/orders";

// Configure in PhonePe Business dashboard → Developer settings → Webhook:
//   URL: https://<your-domain>/api/webhooks/phonepe   (username/password = PHONEPE_WEBHOOK_USER / _PASS)
// Events: checkout.order.completed, checkout.order.failed
export async function POST(req: Request) {
  if (!verifyWebhookAuth(req.headers.get("authorization") ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const merchantOrderId: unknown = body?.payload?.merchantOrderId;
  if (typeof merchantOrderId === "string" && /^[0-9a-f-]{36}$/.test(merchantOrderId)) {
    // Don't trust the callback body alone: re-check the state with PhonePe, then update.
    await syncPhonePeOrder(merchantOrderId);
  }
  return NextResponse.json({ ok: true });
}
