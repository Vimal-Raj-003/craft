import Link from "next/link";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { isUuid } from "@/lib/order-queries";
import StatusBadge from "@/components/StatusBadge";

export default async function Customer({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { rows } = await pool.query("SELECT id,name,email,phone,created_at FROM users WHERE id=$1 AND role='CUSTOMER'", [id]);
  const c = rows[0];
  if (!c) notFound();
  const { rows: orders } = await pool.query(
    `SELECT o.id,o.total_paise,o.status,o.created_at,pay.status AS payment_status,
            (SELECT string_agg(i.name || ' × ' || i.qty, ', ') FROM order_items i WHERE i.order_id=o.id) AS items
       FROM orders o LEFT JOIN payments pay ON pay.order_id=o.id WHERE o.user_id=$1 ORDER BY o.created_at DESC`,
    [id],
  );
  return (
    <>
      <Link href="/admin/customers" className="mb-4 inline-block py-2 text-sm text-dim hover:text-ink">← All customers</Link>
      <div className="glass rounded-3xl p-5 sm:p-7">
        <h2 className="text-2xl font-bold">{c.name}</h2>
        <p className="mt-2 text-sm text-dim">{c.email} · {c.phone ?? "no phone"} · registered {new Date(c.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
      </div>
      <h2 className="mt-8 text-xl font-semibold">Order history</h2>
      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Order</th><th>Items</th><th>Total</th><th>Order</th><th>Payment</th><th className="pr-4">Date</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[#7a1d00]/15">
                <td className="p-4 font-mono"><Link className="underline" href={`/admin/orders/${o.id}`}>{o.id.slice(0, 8)}</Link></td>
                <td className="max-w-[240px] text-dim">{o.items}</td>
                <td>{formatINR(o.total_paise)}</td>
                <td><StatusBadge value={o.status} /></td>
                <td><StatusBadge value={o.payment_status} /></td>
                <td className="whitespace-nowrap pr-4 text-dim">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td className="p-6 text-dim" colSpan={6}>No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
