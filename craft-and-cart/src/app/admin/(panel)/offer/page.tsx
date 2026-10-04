import Link from "next/link";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import OfferForm from "@/components/OfferForm";
import StatusBadge from "@/components/StatusBadge";

const OFFER_LABEL: Record<string, string> = { held: "Reserved", used: "Used", failed: "Used by failed payment", restored: "Restored", released: "Released" };

type PromoItem = { name: string; normal: number | null; offer: number };

export default async function OfferAdmin() {
  const [{ rows: prods }, { rows: cur }, { rows: stats }, { rows: orders }, { rows: events }] = await Promise.all([
    pool.query("SELECT id, name, price_paise FROM products WHERE active ORDER BY name"),
    pool.query(
      `SELECT DISTINCT ON (o.slot) o.slot, o.product_id, o.offer_price_paise, o.active, p.name, p.price_paise, p.active AS p_active, p.stock
         FROM first_order_offer o JOIN products p ON p.id=o.product_id ORDER BY o.slot, o.active DESC, o.id DESC`,
    ),
    pool.query("SELECT status, count(*)::int AS n FROM offer_claims GROUP BY status"),
    pool.query(
      `SELECT o.id, o.name AS customer, o.email, o.total_paise, o.discount_paise, o.offer_status, o.created_at, pay.status AS payment_status,
              (SELECT json_agg(json_build_object('name', i.name, 'normal', i.normal_price_paise, 'offer', i.price_paise) ORDER BY i.id)
                 FROM order_items i WHERE i.order_id=o.id AND i.promo) AS promos
         FROM orders o LEFT JOIN payments pay ON pay.order_id=o.id
        WHERE o.discount_paise > 0 OR o.offer_status IS NOT NULL
        ORDER BY o.created_at DESC LIMIT 50`,
    ),
    pool.query(
      `SELECT e.event, e.detail, e.created_at, e.order_id, u.email
         FROM offer_events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.id DESC LIMIT 30`,
    ),
  ]);
  const count = (s: string) => stats.find((x) => x.status === s)?.n ?? 0;
  const slotRow = (n: number) => cur.find((c) => c.slot === n);
  const problem = (n: number) => {
    const c = slotRow(n);
    if (!c?.active) return null;
    if (!c.p_active) return `The ₹${n} product is inactive, so its offer is not shown.`;
    if (c.stock < 1) return `The ₹${n} product is out of stock, so its offer is not shown.`;
    if (c.price_paise <= n * 100) return `The ₹${n} product's normal price is not above ₹${n}, so its offer is not shown.`;
    return null;
  };
  const options = prods.map((p) => ({ id: p.id, name: p.name, priceRupees: String(p.price_paise / 100) }));

  return (
    <>
      <p className="text-sm text-dim">
        Choose the product customers can buy for ₹1 and the product they can buy for ₹2 on their <b>first order</b> (signed-in, once per customer and phone number, online payment).
        Only one unit of each gets the promo price; everything else is normal price. A product cannot be both.
      </p>
      {([1, 2] as const).map((n) => problem(n) && <p key={n} className="mt-3 rounded-2xl border border-amber/40 bg-amber/10 p-3 text-sm">⚠️ {problem(n)}</p>)}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {([1, 2] as const).map((n) => (
          <OfferForm key={n} slot={n} products={options} current={{ productId: slotRow(n)?.product_id ?? null, active: slotRow(n)?.active ?? false }} />
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {(["held", "used", "failed", "restored"] as const).map((s) => (
          <div key={s} className="glass rounded-2xl p-5"><p className="text-sm text-dim">{OFFER_LABEL[s]}</p><p className="mt-2 text-3xl font-bold">{count(s)}</p></div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Orders that used the offer</h2>
      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Order</th><th>Customer</th><th>Promo products (normal → promo)</th><th>Discount</th><th>Final amount</th><th>Payment</th><th className="pr-4">Offer</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[#7a1d00]/15 align-top">
                <td className="p-4 font-mono"><Link className="underline" href={`/admin/orders/${o.id}`}>{o.id.slice(0, 8)}</Link></td>
                <td>{o.customer}<br /><span className="text-xs text-dim">{o.email}</span></td>
                <td>
                  {((o.promos ?? []) as PromoItem[]).map((p, i) => (
                    <div key={i}>{p.name}: {p.normal != null ? formatINR(p.normal + 0) : formatINR(p.offer + o.discount_paise)} → <b>{formatINR(p.offer)}</b></div>
                  ))}
                  {!(o.promos ?? []).length && "—"}
                </td>
                <td>{formatINR(o.discount_paise)}</td>
                <td>{formatINR(o.total_paise)}</td>
                <td><StatusBadge value={o.payment_status} /></td>
                <td className="pr-4">{OFFER_LABEL[o.offer_status] ?? o.offer_status ?? "—"}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td className="p-6 text-dim" colSpan={7}>No offer orders yet.</td></tr>}
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
