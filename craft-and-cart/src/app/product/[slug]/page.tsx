import { notFound } from "next/navigation";
import Link from "next/link";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { getProduct, listProducts, listReviews } from "@/lib/db";
import { FREE_SHIPPING_ITEM_MAX, formatINR } from "@/lib/money";
import { getActiveOffers } from "@/lib/offer";
import OfferBanner from "@/components/OfferBanner";
import ProductArt from "@/components/ProductArt";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">) {
  const p = await getProduct((await params).slug);
  return { title: p ? `${p.name} — Craft & Cart` : "Not found" };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const [reviews, related, offers] = await Promise.all([
    listReviews(p.id),
    listProducts({ category: p.category_slug ?? undefined }),
    getActiveOffers(),
  ]);
  const isPromo = offers.some((o) => o.productId === p.id);

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-32 sm:px-6 sm:pt-36">
      <div className="aurora" style={{ opacity: 0.4 }}><i /><i /><i /></div>
      <Link href="/shop" className="-ml-2 inline-flex min-h-11 items-center rounded-full px-2 text-sm text-dim hover:text-ink">← Back to shop</Link>
      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <div
          className="glass group relative grid aspect-square place-items-center overflow-hidden rounded-3xl sm:rounded-[2.5rem]"
          style={{ background: `radial-gradient(circle at 30% 20%, ${p.hue_a}, ${p.hue_b} 80%)` }}
        >
          <ProductArt p={p} sizes="(min-width:1024px) 560px, 92vw" priority emojiClass="text-[11rem]" />
        </div>
        <Reveal>
          <p className="text-sm uppercase tracking-[.3em] text-mint">{p.category_name}</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{p.name}</h1>
          <p className="mt-2 font-serif text-xl italic text-dim">{p.tagline}</p>
          {p.rating && <p className="mt-4 text-amber">{"★".repeat(Math.round(p.rating))} <span className="text-sm text-dim">{p.rating} · {p.review_count} {p.review_count === 1 ? "review" : "reviews"}</span></p>}
          <p className="mt-6 text-4xl font-bold text-gradient">{formatINR(p.price_paise)}</p>
          <p className="mt-6 leading-relaxed text-dim">{p.description}</p>
          <p className="mt-4 text-sm text-dim">{p.stock > 0 ? (p.stock <= 5 ? `Only ${p.stock} left` : "In stock") : "Currently sold out"} · {p.price_paise <= FREE_SHIPPING_ITEM_MAX ? <b className="text-mint">FREE Shipping</b> : isPromo ? "The first-order offer unit ships FREE; otherwise free shipping over ₹999" : "Free shipping over ₹999"}</p>
          {isPromo && <div className="mt-6"><OfferBanner variant="compact" /></div>}
          <AddToCart p={p} />
        </Reveal>
      </div>

      {reviews.length > 0 && (
        <section className="mt-24">
          <h2 className="text-3xl font-bold">What people say</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.map((r, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="glass rounded-2xl p-5">
                  <p className="text-amber">{"★".repeat(r.rating)}</p>
                  <p className="mt-2 text-dim">&ldquo;{r.body}&rdquo;</p>
                  <p className="mt-3 text-sm font-semibold">{r.author}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mt-24">
        <h2 className="text-3xl font-bold">You might also love</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {related.filter((r) => r.id !== p.id).slice(0, 3).map((r, i) => <ProductCard key={r.id} p={r} index={i} promoPaise={offers.find((o) => o.productId === r.id)?.offerPaise} />)}
        </div>
      </section>
    </div>
  );
}
