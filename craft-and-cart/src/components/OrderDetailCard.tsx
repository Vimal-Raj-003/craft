import { formatINR } from "@/lib/money";
import type { OrderDetail } from "@/lib/order-queries";
import StatusBadge from "./StatusBadge";

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

/** Full order view shared by the customer's "Order details" page and the Super Admin order page. */
export default function OrderDetailCard({ o, children }: { o: OrderDetail; children?: React.ReactNode }) {
  const cod = o.payment_method === "cod";
  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-dim">Order</p>
            <p className="break-all font-mono text-lg font-semibold">{o.id}</p>
            <p className="mt-1 text-sm text-dim">Placed {fmt(o.created_at)}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div><p className="mb-1 text-dim">Order status</p><StatusBadge value={o.status} /></div>
            <div><p className="mb-1 text-dim">Payment</p><StatusBadge value={o.payment_status} /></div>
          </div>
        </div>
        {children}
      </div>

      <div className="glass overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Item</th><th>Qty</th><th>Price</th><th className="pr-4 text-right">Total</th></tr></thead>
          <tbody>
            {o.items.map((i, n) => (
              <tr key={n} className="border-t border-[#7a1d00]/15">
                <td className="p-4">{i.name}{i.color && <span className="text-dim"> · {i.color}</span>}</td>
                <td>{i.qty}</td>
                <td>{formatINR(i.price_paise)}</td>
                <td className="pr-4 text-right">{formatINR(i.price_paise * i.qty)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-[#7a1d00]/15">
            <tr><td className="px-4 pt-3 text-dim" colSpan={3}>Subtotal</td><td className="pr-4 pt-3 text-right">{formatINR(o.subtotal_paise)}</td></tr>
            <tr><td className="px-4 text-dim" colSpan={3}>Shipping</td><td className="pr-4 text-right">{o.shipping_paise ? formatINR(o.shipping_paise) : "Free"}</td></tr>
            <tr className="font-bold"><td className="px-4 pb-4 pt-1" colSpan={3}>Total</td><td className="pr-4 pb-4 pt-1 text-right">{formatINR(o.total_paise)}</td></tr>
          </tfoot>
        </table>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass rounded-3xl p-5 text-sm sm:p-7">
          <h2 className="text-lg font-semibold">Delivery</h2>
          <p className="mt-3 font-medium">{o.name}</p>
          <p className="text-dim">{o.address.line1}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p>
          <p className="mt-2 text-dim">{o.phone} · {o.email}</p>
        </div>
        <div className="glass rounded-3xl p-5 text-sm sm:p-7">
          <h2 className="text-lg font-semibold">Payment</h2>
          <dl className="mt-3 space-y-1.5">
            <div className="flex justify-between gap-4"><dt className="text-dim">Method</dt><dd>{cod ? "Cash on delivery" : "Razorpay (online)"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-dim">Status</dt><dd className="capitalize">{o.payment_status ?? "—"}</dd></div>
            {!cod && <div className="flex justify-between gap-4"><dt className="text-dim">Razorpay order</dt><dd className="break-all text-right font-mono text-xs">{o.razorpay_order_id ?? "—"}</dd></div>}
            {!cod && <div className="flex justify-between gap-4"><dt className="text-dim">Razorpay payment</dt><dd className="break-all text-right font-mono text-xs">{o.razorpay_payment_id ?? "—"}</dd></div>}
            <div className="flex justify-between gap-4"><dt className="text-dim">Paid on</dt><dd>{fmt(o.paid_at)}</dd></div>
            {o.failure_reason && o.payment_status !== "paid" && <div className="flex justify-between gap-4"><dt className="text-dim">Note</dt><dd className="text-right">{o.failure_reason}</dd></div>}
          </dl>
        </div>
      </div>
    </div>
  );
}
