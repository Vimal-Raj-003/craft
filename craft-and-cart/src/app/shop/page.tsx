import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { listProducts, listCategories } from "@/lib/db";
import { getActiveOffers } from "@/lib/offer";
import OfferBanner from "@/components/OfferBanner";

export const dynamic = "force-dynamic";

export default async function Shop({ searchParams }: PageProps<"/shop">) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const [products, categories, offers] = await Promise.all([listProducts({ category, sort, q }), listCategories(), getActiveOffers()]);

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { category, sort, q, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/shop${p.size ? `?${p}` : ""}`;
  };
  const chip = (active: boolean) =>
    `inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm transition ${active ? "border-transparent bg-gradient-to-r from-pink to-violet text-white" : "glass text-dim hover:text-ink"}`;

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-32 sm:px-6 sm:pt-36">
      <div className="aurora" style={{ opacity: 0.5 }}><i /><i /><i /></div>
      <h1 className="text-[2.6rem] font-bold min-[400px]:text-5xl sm:text-7xl">The <span className="font-serif font-normal italic text-gradient">shop</span></h1>

      <div className="mt-8"><OfferBanner variant="compact" /></div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link href={href({ category: undefined })} className={chip(!category)}>All</Link>
        {categories.map((c) => <Link key={c.slug} href={href({ category: c.slug })} className={chip(category === c.slug)}>{c.name}</Link>)}
        <form className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto" action="/shop">
          {category && <input type="hidden" name="category" value={category} />}
          <input name="q" defaultValue={q} placeholder="Search…" className="input !min-h-11 min-w-0 flex-1 !py-2 sm:!w-44 sm:flex-none" />
          <select name="sort" defaultValue={sort ?? ""} className="input !min-h-11 !w-auto !py-2">
            <option value="">Newest</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
          </select>
          <button className="btn btn-ghost !min-h-11 !py-2">Go</button>
        </form>
      </div>

      {products.length === 0 ? (
        <p className="mt-24 text-center text-dim">Nothing matched. Try another search 🧶</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-6 lg:grid-cols-3">
          {products.map((p, i) => <ProductCard key={p.id} p={p} index={i} promoPaise={offers.find((o) => o.productId === p.id)?.offerPaise} />)}
        </div>
      )}
    </div>
  );
}
