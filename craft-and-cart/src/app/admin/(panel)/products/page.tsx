import Image from "next/image";
import Link from "next/link";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";

export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const { rows } = await pool.query(
    `SELECT p.id, p.sku, p.name, p.price_paise, p.stock, p.active, p.image_url, c.name AS category,
            (SELECT o.offer_price_paise FROM first_order_offer o WHERE o.product_id=p.id AND o.active LIMIT 1) AS promo_paise
       FROM products p LEFT JOIN categories c ON c.id=p.category_id
      WHERE ($1::text = '' OR p.name ILIKE '%' || $1 || '%' OR p.sku ILIKE '%' || $1 || '%')
      ORDER BY p.active DESC, p.id DESC`,
    [q],
  );
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex min-w-[15rem] flex-1 flex-wrap gap-3" role="search">
          <input name="q" defaultValue={q} className="input min-w-[8rem] flex-1" placeholder="Search by name or SKU" />
          <button className="btn btn-ghost min-h-12">Search</button>
        </form>
        <Link href="/admin/products/new" className="btn btn-primary min-h-12">+ Add product</Link>
      </div>
      <p className="mt-4 text-sm text-dim">{rows.length} product{rows.length === 1 ? "" : "s"}</p>
      <div className="glass mt-3 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th className="pr-4">Status</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-[#7a1d00]/15">
                <td className="p-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#7a1d00]/5">
                      {p.image_url && <Image src={p.image_url} alt="" fill sizes="48px" className="object-cover" unoptimized />}
                    </span>
                    <span className="font-medium underline">{p.name}</span>
                    {p.promo_paise != null && <span className="rounded-full bg-gradient-to-r from-pink to-violet px-2 py-0.5 text-xs font-bold text-white">First order {formatINR(p.promo_paise)}</span>}
                  </Link>
                </td>
                <td className="font-mono text-xs">{p.sku}</td>
                <td className="text-dim">{p.category ?? "—"}</td>
                <td>{formatINR(p.price_paise)}</td>
                <td className={p.stock <= 5 ? "font-semibold text-pink" : ""}>{p.stock}</td>
                <td className="pr-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.active ? "bg-mint/15 text-mint" : "bg-black/5 text-dim"}`}>{p.active ? "Active" : "Inactive"}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-6 text-dim" colSpan={6}>No products found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
