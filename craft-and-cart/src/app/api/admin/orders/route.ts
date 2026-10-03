import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const s = await getSession();
  return s?.role === "admin" ? s : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { rows } = await pool.query(
    `SELECT o.id,o.name,o.email,o.total_paise,o.status,o.created_at,
            (SELECT json_agg(json_build_object('name',i.name,'qty',i.qty)) FROM order_items i WHERE i.order_id=o.id) AS items
     FROM orders o ORDER BY o.created_at DESC LIMIT 100`,
  );
  return NextResponse.json({ orders: rows });
}

const Patch = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "paid", "shipped", "delivered", "cancelled", "failed"]),
});

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = Patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await pool.query("UPDATE orders SET status=$2 WHERE id=$1", [p.data.id, p.data.status]);
  return NextResponse.json({ ok: true });
}
