import Link from "next/link";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { isUuid } from "@/lib/order-queries";
import StatusBadge from "@/components/StatusBadge";
import RazorpayAttempts from "@/components/RazorpayAttempts";

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default async function PaymentDetail({ params }: PageProps<"/admin/payments/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { rows } = await pool.query(
    `SELECT pay.*, o.name AS customer, o.email, o.status AS order_status, o.total_paise
       FROM payments pay JOIN orders o ON o.id=pay.order_id WHERE pay.id=$1`,
    [id],
  );
  const p = rows[0];
  if (!p) notFound();
  const { rows: events } = await pool.query(
    "SELECT stage, ok, code, message, amount_paise, razorpay_payment_id, created_at FROM payment_events WHERE order_id=$1 ORDER BY id",
    [p.order_id],
  );
  const isSuper = Boolean(await getAdmin());
  return (
    <>
      <Link href="/admin/payments" className="mb-4 inline-block py-2 text-sm text-dim hover:text-ink">← All payments</Link>
      <div className="glass rounded-3xl p-5 text-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-dim">Payment for order</p>
            <p className="font-mono text-lg font-semibold"><Link className="underline" href={`/admin/orders/${p.order_id}`}>{p.order_id}</Link></p>
            <p className="mt-1 text-dim">{p.customer} · {p.email}</p>
          </div>
          <div className="flex gap-4"><div><p className="mb-1 text-dim">Payment</p><StatusBadge value={p.status} /></div><div><p className="mb-1 text-dim">Order</p><StatusBadge value={p.order_status} /></div></div>
        </div>
        <dl className="mt-5 space-y-1.5">
          <div className="flex justify-between gap-4"><dt className="text-dim">Method</dt><dd>{p.provider === "cod" ? "Cash on delivery" : "Razorpay"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-dim">Amount</dt><dd>{formatINR(p.amount_paise)} <span className="text-xs text-dim">({p.amount_paise} paise, {p.currency})</span></dd></div>
          <div className="flex justify-between gap-4"><dt className="text-dim">Razorpay order</dt><dd className="break-all text-right font-mono text-xs">{p.razorpay_order_id ?? "—"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-dim">Razorpay payment</dt><dd className="break-all text-right font-mono text-xs">{p.razorpay_payment_id ?? "—"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-dim">Paid on</dt><dd>{fmt(p.paid_at)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-dim">Created / updated</dt><dd>{fmt(p.created_at)} / {fmt(p.updated_at)}</dd></div>
          {p.failure_reason && p.status !== "paid" && <div className="flex justify-between gap-4"><dt className="text-dim">Last problem</dt><dd className="break-words text-right text-pink">{p.failure_reason}</dd></div>}
        </dl>
      </div>

      {p.provider === "razorpay" && isSuper && <div className="mt-6"><RazorpayAttempts paymentId={p.id} /></div>}

      <h2 className="mt-8 text-xl font-semibold">Payment timeline</h2>
      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-left text-sm [&_td]:pr-4 [&_th]:pr-4">
          <thead className="text-dim"><tr><th className="p-4">When</th><th>Stage</th><th>Result</th><th>Code</th><th>Detail</th></tr></thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i} className="border-t border-[#7a1d00]/15 align-top">
                <td className="whitespace-nowrap p-4 text-dim">{fmt(e.created_at)}</td>
                <td>{e.stage}</td>
                <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.ok ? "bg-mint/15 text-mint" : "bg-pink/15 text-pink"}`}>{e.ok ? "ok" : "failed"}</span></td>
                <td className="font-mono text-xs">{e.code ?? "—"}</td>
                <td className="max-w-[320px] break-words text-dim">{e.message ?? "—"}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td className="p-6 text-dim" colSpan={5}>No stages recorded for this order.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
