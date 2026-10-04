import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import ProductCard from "@/components/ProductCard";
import CustomForm from "@/components/CustomForm";
import { Reveal } from "@/components/Reveal";
import { listProducts, listCategories } from "@/lib/db";
import { getActiveOffer } from "@/lib/offer";
import OfferBanner from "@/components/OfferBanner";

export const dynamic = "force-dynamic";

const WORDS = ["Bouquets", "Keychains", "Jasmine gajra", "Jhumkas", "Kolam scrunchies", "Marigold", "Lotus", "Bag charms"];
const FESTIVALS = [
  ["🌾", "Pongal", "Thai Pongal gifts in sunshine yellow", "/shop?category=bouquets"],
  ["🛶", "Onam", "Pookalam-inspired bouquets & charms", "/shop?category=bouquets"],
  ["🌼", "Ugadi", "Mango-leaf green & neem-bloom keepsakes", "/shop?category=keychains"],
  ["🪔", "Deepavali", "Diya-bright accessories for gifting", "/shop?category=accessories"],
];
const STEPS = [
  ["01", "Pick your piece", "Browse ready-to-ship items or request something fully custom."],
  ["02", "We hand-stitch", "Each piece is looped, shaped and finished by one maker — never a machine."],
  ["03", "Packed with love", "Eco-friendly packaging with a handwritten note, shipped in 2–5 days."],
];

export default async function Home() {
  const [featured, categories, offer] = await Promise.all([listProducts({ featured: true }), listCategories(), getActiveOffer()]);

  return (
    <>
      <HeroSection />

      <div className="temple-border -mx-[var(--side)]" />
      <div className="relative -mx-[var(--side)] overflow-hidden bg-[#f5a623]/10 py-4 sm:py-5">
        <div className="marquee">
          {[...WORDS, ...WORDS, ...WORDS, ...WORDS].map((w, i) => (
            <span key={i} className="mx-5 flex items-center gap-5 whitespace-nowrap font-serif text-2xl italic text-dim sm:mx-8 sm:gap-8 sm:text-3xl">
              {w} <span className="text-pink">✦</span>
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16"><OfferBanner /></section>

      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-32">
        <Reveal>
          <p className="text-sm uppercase tracking-[.3em] text-mint">Collections</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-6xl">Find your <span className="font-serif font-normal italic text-gradient">vibe</span></h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-4">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.08}>
              <Link href={`/shop?category=${c.slug}`} data-hot className="glass group relative block h-full overflow-hidden rounded-2xl p-4 transition hover:-translate-y-2 hover:border-pink/60 sm:rounded-3xl sm:p-6">
                <span className="absolute -right-6 -top-6 text-8xl opacity-10 transition group-hover:rotate-12 group-hover:opacity-30">{["💐", "🔑", "🌺", "🐘", "🏡"][i]}</span>
                <h3 className="text-lg font-semibold sm:text-xl">{c.name}</h3>
                <p className="mt-2 text-[13px] text-dim sm:text-sm">{c.blurb}</p>
                <p className="mt-4 text-sm text-mint transition group-hover:translate-x-2 sm:mt-6">Explore →</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-32">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[.3em] text-mint">Bestsellers</p>
            <h2 className="mt-3 text-4xl font-bold sm:text-6xl">Loved by <span className="font-serif font-normal italic text-gradient">hundreds</span></h2>
          </div>
          <Link href="/shop" className="btn btn-ghost !min-h-11">View all →</Link>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-6 lg:grid-cols-3">
          {featured.slice(0, 6).map((p, i) => <ProductCard key={p.id} p={p} index={i} promo={p.id === offer?.productId} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-32">
        <Reveal>
          <p className="text-sm uppercase tracking-[.3em] text-mint">Festival gifting</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-6xl">Celebrate in <span className="font-serif font-normal italic text-gradient">every season</span></h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-4">
          {FESTIVALS.map(([icon, name, blurb, href], i) => (
            <Reveal key={name} delay={i * 0.08}>
              <Link href={href} data-hot className="glass group block h-full rounded-2xl p-4 transition hover:-translate-y-2 hover:border-amber/60 sm:rounded-3xl sm:p-6">
                <span className="float inline-block text-4xl sm:text-5xl">{icon}</span>
                <h3 className="mt-3 text-lg font-semibold sm:mt-4 sm:text-xl">{name}</h3>
                <p className="mt-2 text-[13px] text-dim sm:text-sm">{blurb}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="quote" className="mx-auto max-w-4xl scroll-mt-24 px-4 pt-20 sm:px-6 sm:pt-32">
        <Reveal>
          <figure className="relative overflow-hidden rounded-[2.5rem] border-2 border-dashed border-[#a8321a]/35 bg-[#fff8e6]/70 px-5 py-12 text-center sm:px-12 sm:py-20">
            <span className="pointer-events-none absolute left-6 top-0 select-none font-serif text-[7rem] leading-[1.1] text-[#e8334f]/20" aria-hidden>&ldquo;</span>
            <span className="pointer-events-none absolute bottom-0 right-6 select-none font-serif text-[7rem] leading-[0.6] text-[#e8334f]/20" aria-hidden>&rdquo;</span>
            <blockquote className="relative text-[2rem] font-bold leading-tight min-[400px]:text-4xl sm:text-6xl">
              Handmade{" "}
              <span className="font-serif font-normal italic text-gradient">with love</span>
              <span className="heartbeat ml-3 inline-block align-middle text-[#e8334f]" aria-hidden>♥</span>
            </blockquote>
            <figcaption className="relative mt-5 text-lg text-dim">Every stitch is made by hand, one loop at a time.</figcaption>
          </figure>
        </Reveal>
      </section>

      <section id="story" className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-32">
        <Reveal>
          <p className="text-sm uppercase tracking-[.3em] text-mint">How it works</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-bold sm:text-6xl">Slow craft. <span className="font-serif font-normal italic text-gradient">Fast love.</span></h2>
          <p className="mt-4 max-w-xl text-dim">Inspired by the patient hands behind Kanchipuram silk, Kerala kasavu borders and the morning kolam — each piece is looped by one maker in the South.</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-3">
          {STEPS.map(([n, t, d], i) => (
            <Reveal key={n} delay={i * 0.12}>
              <div className="glass h-full rounded-3xl p-6 sm:p-8">
                <p className="text-gradient text-6xl font-bold">{n}</p>
                <h3 className="mt-6 text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-dim">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="custom" className="mx-auto grid max-w-6xl gap-8 px-4 pt-20 sm:gap-12 sm:px-6 sm:pt-32 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm uppercase tracking-[.3em] text-mint">Custom orders</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-6xl">Dream it. <span className="font-serif font-normal italic text-gradient">We&apos;ll stitch it.</span></h2>
          <p className="mt-6 max-w-md text-lg text-dim">Want a pet portrait, a wedding gift or a team mascot? Tell us your idea and we&apos;ll send a quote and sketch within 24 hours.</p>
        </Reveal>
        <Reveal delay={0.15}><CustomForm /></Reveal>
      </section>
    </>
  );
}
