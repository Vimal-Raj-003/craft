import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { fail } from "@/lib/http";
import { explainRazorpayError, listOrderPayments } from "@/lib/razorpay";

/** SUPER_ADMIN only: asks Razorpay for every attempt made against this payment's Razorpay order (status, method, failure reason). */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/payments/[id]/razorpay">) {
  if (!(await getAdmin())) return fail("Forbidden", 403);
  const id = (await ctx.params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Not found", 404);
  const { rows } = await pool.query("SELECT razorpay_order_id, amount_paise FROM payments WHERE id=$1 AND provider='razorpay'", [id]);
  if (!rows[0]?.razorpay_order_id) return fail("This payment has no Razorpay order", 404);
  try {
    const attempts = await listOrderPayments(rows[0].razorpay_order_id);
    return NextResponse.json({
      razorpayOrderId: rows[0].razorpay_order_id,
      expectedPaise: rows[0].amount_paise,
      attempts: attempts.map((a) => ({
        id: a.id, status: a.status, method: a.method ?? null, amount: a.amount,
        errorCode: a.error_code ?? null, errorDescription: a.error_description ?? null, errorReason: a.error_reason ?? null, errorStep: a.error_step ?? null,
        createdAt: a.created_at ? new Date(a.created_at * 1000).toISOString() : null,
      })),
    });
  } catch (e) {
    const x = explainRazorpayError(e);
    return NextResponse.json({ error: `${x.code}: ${x.message}`, hint: x.hint }, { status: 502 });
  }
}
