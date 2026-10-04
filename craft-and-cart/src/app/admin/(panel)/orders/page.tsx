import Link from "next/link";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import OrderStatus from "@/components/OrderStatus";
import StatusBadge from "@/components/StatusBadge";

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const { rows: orders } = await pool.query(
    `SELECT o.id,o.name,o.email,o.phone,o.total_paise,o.status,o.created_at,pay.status AS payment_status,pay.provider,pay.razorpay_payment_id,
            (SELECT string_agg(i.name || ' × ' || i.qty, ', ') FROM order_items i WHERE i.order_id=o.id) AS items
       FROM orders o LEFT JOIN payments pay ON pay.order_id=o.id
      WHERE ($1::text = '' OR o.id::text ILIKE $1 || '%' OR o.name ILIKE '%' || $1 || '%' OR o.email ILIKE '%' || $1 || '%'
             OR o.phone ILIKE '%' || $1 || '%' OR pay.razorpay_payment_id ILIKE '%' || $1 || '%' OR pay.razorpay_order_id ILIKE '%' || $1 || '%')
      ORDER BY o.created_at DESC LIMIT 200`,
    [q],
  );

  return (
    <>
      <form className="flex flex-wrap gap-3" role="search">
        <input name="q" defaultValue={q} className="input min-w-0 flex-1" placeholder="Search by order id, name, email, phone or Razorpay id" />
        <button className="btn btn-primary min-h-12">Search</button>
        {q && <Link href="/admin/orders" className="btn btn-ghost min-h-12">Clear</Link>}
      </form>
      <p className="mt-4 text-sm text-dim">{orders.length} order{orders.length === 1 ? "" : "s"}{q && ` matching “${q}”`}</p>
      <div className="glass mt-3 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Date</th><th className="pr-4">Status</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[#7a1d00]/15 align-top">
                <td className="p-4 font-mono"><Link className="underline" href={`/admin/orders/${o.id}`}>{o.id.slice(0, 8)}</Link></td>
                <td>{o.name}<br /><span className="text-xs text-dim">{o.email}</span></td>
                <td className="max-w-[220px] text-dim">{o.items}</td>
                <td>{formatINR(o.total_paise)}</td>
                <td><StatusBadge value={o.payment_status} /><br /><span className="text-xs text-dim">{o.provider === "cod" ? "COD" : "Razorpay"}</span></td>
                <td className="whitespace-nowrap text-dim">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                <td className="pr-4"><OrderStatus id={o.id} status={o.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td className="p-6 text-dim" colSpan={7}>No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
