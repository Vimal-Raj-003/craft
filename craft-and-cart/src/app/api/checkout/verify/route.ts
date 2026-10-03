import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { finalizeOrder } from "@/lib/orders";
import { phonepeConfigured } from "@/lib/phonepe";

const Body = z.object({ orderId: z.string().uuid() });

// DEMO-mode only: simulates a successful payment while no PhonePe credentials are configured.
// Once PHONEPE_CLIENT_ID/SECRET are set this endpoint is disabled and payments are confirmed
// exclusively by asking PhonePe (order status API / webhook).
export async function POST(req: Request) {
  if (phonepeConfigured() || process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not available" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { rows } = await pool.query("SELECT payment_method FROM orders WHERE id=$1", [parsed.data.orderId]);
  if (!rows[0]) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (rows[0].payment_method !== "online") return NextResponse.json({ error: "Not an online order" }, { status: 400 });

  await finalizeOrder(parsed.data.orderId, "paid", "demo_payment");
  return NextResponse.json({ ok: true, demo: true });
}
