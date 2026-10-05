import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await requireUser("/account");
  const { rows: orders } = await pool.query(
    `SELECT o.id,o.status,o.total_paise,o.created_at,pay.status AS payment_status,
            (SELECT string_agg(i.name || ' × ' || i.qty, ', ') FROM order_items i WHERE i.order_id=o.id) AS items
       FROM orders o LEFT JOIN payments pay ON pay.order_id=o.id
      WHERE o.user_id=$1 ORDER BY o.created_at DESC`,
    [user.id],
  );

  return (
    <>
      <h2 className="text-xl font-semibold">Your orders</h2>
      <div className="mt-4 space-y-3">
        {orders.length === 0 && (
          <div className="glass rounded-2xl p-6 text-dim">No orders yet — <Link href="/shop" className="font-semibold text-ink underline">go find something soft</Link>.</div>
        )}
        {orders.map((o) => (
          <Link key={o.id} href={`/account/orders/${o.id}`} className="glass block rounded-2xl p-5 transition hover:-translate-y-0.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{o.items}</p>
                <p className="text-xs text-dim">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              <p className="font-semibold">{formatINR(o.total_paise)}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-dim">
              <span className="flex items-center gap-2">Order <StatusBadge value={o.status} /></span>
              <span className="flex items-center gap-2">Payment <StatusBadge value={o.payment_status} /></span>
              <span className="ml-auto font-semibold text-ink">View details →</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
