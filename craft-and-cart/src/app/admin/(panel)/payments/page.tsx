import Link from "next/link";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";

const FILTERS = ["all", "paid", "pending", "failed", "cancelled"] as const;

export default async function Payments({ searchParams }: PageProps<"/admin/payments">) {
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f === sp.status) ?? "all";
  const { rows } = await pool.query(
    `SELECT pay.id,pay.order_id,pay.provider,pay.status,pay.amount_paise,pay.razorpay_order_id,pay.razorpay_payment_id,pay.paid_at,pay.created_at,pay.failure_reason,
            o.name AS customer, o.email
       FROM payments pay JOIN orders o ON o.id=pay.order_id
      WHERE ($1 = 'all' OR pay.status = $1)
      ORDER BY coalesce(pay.paid_at, pay.created_at) DESC LIMIT 300`,
    [filter],
  );
  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by payment status">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? "/admin/payments" : `/admin/payments?status=${f}`}
            className={`btn !min-h-11 !px-4 !py-2 text-sm capitalize ${filter === f ? "btn-primary" : "btn-ghost"}`}>{f}</Link>
        ))}
      </div>
      <div className="glass mt-5 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Razorpay order ID</th><th>Razorpay payment ID</th><th>Date</th><th className="pr-4">Details</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-[#7a1d00]/15 align-top">
                <td className="p-4 font-mono"><Link className="underline" href={`/admin/orders/${p.order_id}`}>{p.order_id.slice(0, 8)}</Link></td>
                <td>{p.customer}<br /><span className="text-xs text-dim">{p.email}</span></td>
                <td>{formatINR(p.amount_paise)}<br /><span className="text-xs text-dim">{p.provider === "cod" ? "COD" : "Razorpay"}</span></td>
                <td><StatusBadge value={p.status} />{p.failure_reason && p.status !== "paid" && <><br /><span className="text-xs text-dim">{p.failure_reason}</span></>}</td>
                <td className="break-all font-mono text-xs">{p.razorpay_order_id ?? "—"}</td>
                <td className="break-all font-mono text-xs">{p.razorpay_payment_id ?? "—"}</td>
                <td className="whitespace-nowrap text-dim">{new Date(p.paid_at ?? p.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="pr-4"><Link className="underline" href={`/admin/payments/${p.id}`}>View</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-6 text-dim" colSpan={8}>No payments found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
