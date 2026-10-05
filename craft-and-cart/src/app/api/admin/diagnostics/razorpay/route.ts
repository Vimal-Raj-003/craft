import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { fail, rateLimit, sameOrigin } from "@/lib/http";
import { runRazorpayDiagnostics } from "@/lib/razorpay-diag";

/** SUPER_ADMIN only. Runs the Razorpay check against the live configuration. Returns statuses and Razorpay's messages, never a secret. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const me = await getAdmin();
  if (!me) return fail("Forbidden", 403);
  if (!rateLimit(`diag:${me.id}`, 20, 10 * 60_000)) return fail("Too many checks. Please wait a few minutes.", 429);
  const body = (await req.json().catch(() => ({}))) as { createTestOrder?: boolean };
  const steps = await runRazorpayDiagnostics({ createTestOrder: body.createTestOrder === true });
  const res = NextResponse.json({ steps, at: new Date().toISOString() });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
