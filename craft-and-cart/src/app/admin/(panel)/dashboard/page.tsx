import Link from "next/link";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";

export default async function Dashboard() {
  const [{ rows: [s] }, { rows: orders }, { rows: low }, { rows: custom }] = await Promise.all([
    pool.query(`SELECT
        (SELECT count(*)::int FROM orders) AS orders,
        (SELECT count(*)::int FROM users WHERE role='CUSTOMER') AS customers,
        (SELECT coalesce(sum(amount_paise),0)::bigint FROM payments WHERE status='paid') AS sales,
        (SELECT count(*)::int FROM payments WHERE status='paid') AS paid,
        (SELECT count(*)::int FROM orders WHERE status='pending') AS pending`),
    pool.query(
      `SELECT o.id,o.name,o.email,o.total_paise,o.status,o.created_at,pay.status AS payment_status,pay.provider
         FROM orders o LEFT JOIN payments pay ON pay.order_id=o.id ORDER BY o.created_at DESC LIMIT 10`),
    pool.query("SELECT name,stock FROM products WHERE stock<=5 AND active ORDER BY stock"),
    pool.query("SELECT name,email,idea,budget FROM custom_requests ORDER BY created_at DESC LIMIT 5"),
  ]);

  const tiles: [string, string | number][] = [
    ["Total sales", formatINR(Number(s.sales))],
    ["Total orders", s.orders],
    ["Total customers", s.customers],
    ["Successful payments", s.paid],
    ["Pending orders", s.pending],
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map(([k, v]) => (
          <div key={k} className="glass rounded-2xl p-5"><p className="text-sm text-dim">{k}</p><p className="mt-2 text-2xl font-bold sm:text-3xl">{v}</p></div>
        ))}
      </div>

      {low.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm">
          ⚠️ Low stock: {low.map((p) => `${p.name} (${p.stock})`).join(" · ")}
        </div>
      )}

      <div className="mt-10 flex items-end justify-between"><h2 className="text-xl font-semibold">Recent orders</h2><Link href="/admin/orders" className="py-2 text-sm underline">All orders →</Link></div>
      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Order</th><th>Customer</th><th>Total</th><th>Order</th><th>Payment</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[#7a1d00]/15">
                <td className="p-4 font-mono"><Link className="underline" href={`/admin/orders/${o.id}`}>{o.id.slice(0, 8)}</Link></td>
                <td>{o.name}<br /><span className="text-xs text-dim">{o.email}</span></td>
                <td>{formatINR(o.total_paise)}<br /><span className="text-xs text-dim">{o.provider === "cod" ? "COD" : "Razorpay"}</span></td>
                <td><StatusBadge value={o.status} /></td>
                <td><StatusBadge value={o.payment_status} /></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td className="p-6 text-dim" colSpan={5}>No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Custom order requests</h2>
      <div className="mt-4 space-y-3">
        {custom.map((c, i) => (
          <div key={i} className="glass rounded-2xl p-4 text-sm">
            <p className="font-semibold">{c.name} <span className="font-normal text-dim">· {c.email} {c.budget && `· ${c.budget}`}</span></p>
            <p className="mt-1 text-dim">{c.idea}</p>
          </div>
        ))}
        {custom.length === 0 && <p className="text-dim">None yet.</p>}
      </div>
    </>
  );
}
