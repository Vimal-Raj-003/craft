import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";
import { ORDER_STATUSES, setOrderStatus } from "@/lib/orders";

export async function GET(req: Request) {
  if (!(await getStaff())) return fail("Forbidden", 403);
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80);
  const { rows } = await pool.query(
    `SELECT o.id,o.name,o.email,o.total_paise,o.status,o.created_at,pay.status AS payment_status,
            (SELECT json_agg(json_build_object('name',i.name,'qty',i.qty)) FROM order_items i WHERE i.order_id=o.id) AS items
       FROM orders o LEFT JOIN payments pay ON pay.order_id=o.id
      WHERE ($1::text IS NULL OR o.id::text ILIKE $1 || '%' OR o.name ILIKE '%' || $1 || '%' OR o.email ILIKE '%' || $1 || '%'
             OR pay.razorpay_payment_id ILIKE '%' || $1 || '%' OR pay.razorpay_order_id ILIKE '%' || $1 || '%')
      ORDER BY o.created_at DESC LIMIT 200`,
    [q || null],
  );
  return NextResponse.json({ orders: rows });
}

const Patch = z.object({ id: z.string().uuid(), status: z.enum(ORDER_STATUSES) });

export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  if (!(await getStaff())) return fail("Forbidden", 403);
  const p = Patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Invalid input");
  const r = await setOrderStatus(p.data.id, p.data.status);
  if (r === "not_found") return fail("Order not found", 404);
  if (r === "reopen_blocked") return fail("This cancelled order already returned the customer's ₹1 offer, so it cannot be reopened. Ask the customer to place a new order.", 409);
  return NextResponse.json({ ok: true });
}
