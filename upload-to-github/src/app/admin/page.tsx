import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import OrderStatus from "@/components/OrderStatus";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await getSession();
  if (user?.role !== "admin") redirect("/login");

  const [{ rows: [stats] }, { rows: orders }, { rows: low }, { rows: custom }] = await Promise.all([
    pool.query(`SELECT count(*)::int AS orders,
                       coalesce(sum(total_paise) FILTER (WHERE status IN ('paid','shipped','delivered')),0)::int AS revenue,
                       (SELECT count(*)::int FROM users) AS users,
                       (SELECT count(*)::int FROM newsletter) AS subs
                FROM orders`),
    pool.query(`SELECT id,name,email,total_paise,status,payment_method,created_at FROM orders ORDER BY created_at DESC LIMIT 50`),
    pool.query(`SELECT name,stock FROM products WHERE stock<=5 AND active ORDER BY stock`),
    pool.query(`SELECT name,email,idea,budget FROM custom_requests ORDER BY created_at DESC LIMIT 10`),
  ]);

  const tiles = [
    ["Revenue", formatINR(stats.revenue)], ["Orders", stats.orders], ["Customers", stats.users], ["Subscribers", stats.subs],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-32 sm:px-6 sm:pt-36">
      <h1 className="text-4xl font-bold">Studio <span className="text-gradient">dashboard</span></h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([k, v]) => (
          <div key={k} className="glass rounded-2xl p-5"><p className="text-sm text-dim">{k}</p><p className="mt-2 text-3xl font-bold">{v}</p></div>
        ))}
      </div>

      {low.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm">
          ⚠️ Low stock: {low.map((p) => `${p.name} (${p.stock})`).join(" · ")}
        </div>
      )}

      <h2 className="mt-12 text-xl font-semibold">Recent orders</h2>
      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[#7a1d00]/15">
                <td className="p-4 font-mono">{o.id.slice(0, 8)}</td>
                <td>{o.name}<br /><span className="text-xs text-dim">{o.email}</span></td>
                <td>{formatINR(o.total_paise)}<br /><span className="text-xs text-dim">{o.payment_method === "cod" ? "COD" : "PhonePe"}</span></td>
                <td><OrderStatus id={o.id} status={o.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td className="p-6 text-dim" colSpan={4}>No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Custom order requests</h2>
      <div className="mt-4 space-y-3">
        {custom.map((c, i) => (
          <div key={i} className="glass rounded-2xl p-4 text-sm">
            <p className="font-semibold">{c.name} <span className="font-normal text-dim">· {c.email} {c.budget && `· ${c.budget}`}</span></p>
            <p className="mt-1 text-dim">{c.idea}</p>
          </div>
        ))}
        {custom.length === 0 && <p className="text-dim">None yet.</p>}
      </div>
    </div>
  );
}
