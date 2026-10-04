import Link from "next/link";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import OfferForm from "@/components/OfferForm";
import StatusBadge from "@/components/StatusBadge";

const OFFER_LABEL: Record<string, string> = { held: "Reserved", used: "Used", failed: "Used by failed payment", restored: "Restored", released: "Released" };

export default async function OfferAdmin() {
  const [{ rows: prods }, { rows: cur }, { rows: stats }, { rows: orders }, { rows: events }] = await Promise.all([
    pool.query("SELECT id, name, price_paise FROM products WHERE active ORDER BY name"),
    pool.query(
      `SELECT o.product_id, o.offer_price_paise, o.active, p.name, p.price_paise, p.active AS p_active, p.stock
         FROM first_order_offer o JOIN products p ON p.id=o.product_id ORDER BY o.active DESC, o.id DESC LIMIT 1`,
    ),
    pool.query("SELECT status, count(*)::int AS n FROM offer_claims GROUP BY status"),
    pool.query(
      `SELECT o.id, o.name AS customer, o.email, o.total_paise, o.discount_paise, o.offer_status, o.created_at, pay.status AS payment_status,
              i.name AS product, i.price_paise AS offer_price
         FROM orders o
         LEFT JOIN payments pay ON pay.order_id=o.id
         LEFT JOIN order_items i ON i.order_id=o.id AND i.promo
        WHERE o.discount_paise > 0 OR o.offer_status IS NOT NULL
        ORDER BY o.created_at DESC LIMIT 50`,
    ),
    pool.query(
      `SELECT e.event, e.detail, e.created_at, e.order_id, u.email
         FROM offer_events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.id DESC LIMIT 30`,
    ),
  ]);
  const c = cur[0];
  const count = (s: string) => stats.find((x) => x.status === s)?.n ?? 0;
  const problem = c?.active && (!c.p_active ? "The selected product is inactive, so the offer is not shown." : c.stock < 1 ? "The selected product is out of stock, so the offer is not shown." : c.price_paise <= c.offer_price_paise ? "The product's normal price is not above the offer price, so the offer is not shown." : null);

  return (
    <>
      <p className="text-sm text-dim">Choose the one product customers can buy for ₹1 on their first order (signed-in, first order only, once per customer and phone number, online payment).</p>
      {problem && <p className="mt-3 rounded-2xl border border-amber/40 bg-amber/10 p-3 text-sm">⚠️ {problem}</p>}
      <div className="mt-4">
        <OfferForm
          products={prods.map((p) => ({ id: p.id, name: p.name, priceRupees: String(p.price_paise / 100) }))}
          current={{ productId: c?.product_id ?? null, priceRupees: String((c?.offer_price_paise ?? 100) / 100), active: c?.active ?? true }}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {(["held", "used", "failed", "restored"] as const).map((s) => (
          <div key={s} className="glass rounded-2xl p-5"><p className="text-sm text-dim">{OFFER_LABEL[s]}</p><p className="mt-2 text-3xl font-bold">{count(s)}</p></div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Orders that used the offer</h2>
      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Order</th><th>Customer</th><th>Promo product</th><th>Normal</th><th>₹1 price</th><th>Discount</th><th>Final amount</th><th>Payment</th><th className="pr-4">Offer</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[#7a1d00]/15 align-top">
                <td className="p-4 font-mono"><Link className="underline" href={`/admin/orders/${o.id}`}>{o.id.slice(0, 8)}</Link></td>
                <td>{o.customer}<br /><span className="text-xs text-dim">{o.email}</span></td>
                <td>{o.product ?? "—"}</td>
                <td>{o.offer_price != null ? formatINR(o.offer_price + o.discount_paise) : "—"}</td>
                <td>{o.offer_price != null ? formatINR(o.offer_price) : "—"}</td>
                <td>{formatINR(o.discount_paise)}</td>
                <td>{formatINR(o.total_paise)}</td>
                <td><StatusBadge value={o.payment_status} /></td>
                <td className="pr-4">{OFFER_LABEL[o.offer_status] ?? o.offer_status ?? "—"}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td className="p-6 text-dim" colSpan={9}>No offer orders yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Recent offer activity</h2>
      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">When</th><th>Customer</th><th>Event</th><th className="pr-4">Detail</th></tr></thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i} className="border-t border-[#7a1d00]/15">
                <td className="whitespace-nowrap p-4 text-dim">{new Date(e.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td>{e.email ?? "—"}</td>
                <td className="capitalize">{e.event}</td>
                <td className="pr-4 text-dim">{e.detail ?? ""}{e.order_id && <> · <Link className="underline" href={`/admin/orders/${e.order_id}`}>{e.order_id.slice(0, 8)}</Link></>}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td className="p-6 text-dim" colSpan={4}>No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
