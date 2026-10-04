"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import { useOffer, type OfferProduct } from "@/lib/use-offer";

const FINE_PRINT = [
  "Only one unit of each promotional product gets the promo price. Extra quantity and all other products stay at normal price.",
  "Available once per eligible customer, on your first order only.",
  "Important: A failed payment attempt may consume the offer.",
  "If your eligible order is cancelled, the offer will be restored.",
  "Promo prices apply when you pay online (Razorpay).",
];

const prices = (offers: OfferProduct[]) => offers.map((o) => formatINR(o.offerPaise)).join(" & ");
const names = (offers: OfferProduct[]) => offers.map((o) => `${o.name} (${formatINR(o.offerPaise)})`).join(" and ");

/**
 * "₹1 & ₹2 First Order Product Offer". Guests see the sign-in invitation, eligible customers see the promotional products
 * with add buttons, everyone else (already used / not a first order) sees nothing. The real price is decided by the server at checkout.
 */
export default function OfferBanner({ variant = "full" }: { variant?: "full" | "compact" | "mini" }) {
  const s = useOffer();
  const pathname = usePathname();
  const add = useCart((c) => c.add);
  const setOpen = useCart((c) => c.setOpen);
  const lines = useCart((c) => c.lines);
  const cartIds = lines.map((l) => l.productId);

  if (!s?.offers.length || (s.signedIn && !s.eligible)) return null;
  const offers = s.offers;
  const label = `${prices(offers)} First Order Product Offer`;
  const addOffer = (o: OfferProduct, open: boolean) => {
    add({ productId: o.productId, slug: o.slug, name: o.name, emoji: o.emoji, image: o.image_url, hueA: o.hue_a, hueB: o.hue_b, pricePaise: o.normalPaise, color: o.color ?? undefined });
    if (open) setOpen(true);
  };
  const signInHref = `/login?next=${encodeURIComponent(pathname)}`;
  const registerHref = `/login?mode=register&next=${encodeURIComponent(pathname)}`;
  const badge = <span className="inline-block rounded-full bg-gradient-to-r from-pink to-violet px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">{label}</span>;

  // One slim block for the cart drawer, so the offer never crowds out the items.
  if (variant === "mini") {
    const missing = offers.filter((o) => !cartIds.includes(o.productId));
    return (
      <section aria-label="First order offer" className="space-y-2 rounded-2xl border-2 border-dashed border-[#a8321a]/40 bg-[#fff8e6]/80 p-3 text-sm">
        <span className="inline-block rounded-full bg-gradient-to-r from-pink to-violet px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">{prices(offers)} First Order Offer</span>
        {!s.signedIn ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1 text-dim">Sign in to get {names(offers)} on your first eligible order.</span>
            <Link href={signInHref} className="btn btn-primary !min-h-10 !px-4 !py-2 text-sm">Sign in</Link>
          </div>
        ) : (
          <>
            {missing.length < offers.length && (
              <p className="text-dim">
                {offers.filter((o) => cartIds.includes(o.productId)).map((o) => o.name).join(" and ")} will be at promo price at checkout (pay online). One unit each.
              </p>
            )}
            {missing.map((o) => (
              <div key={o.productId} className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 text-dim">{o.name}: <span className="line-through">{formatINR(o.normalPaise)}</span> <b className="text-mint">{formatINR(o.offerPaise)}</b></span>
                <button className="btn btn-primary !min-h-10 !px-4 !py-2 text-sm" onClick={() => addOffer(o, false)}>Add for {formatINR(o.offerPaise)}</button>
              </div>
            ))}
          </>
        )}
      </section>
    );
  }

  const compact = variant === "compact";
  return (
    <section
      aria-label="First order offer"
      className={`relative overflow-hidden border-2 border-dashed border-[#a8321a]/40 bg-[#fff8e6]/80 ${compact ? "rounded-2xl p-4" : "rounded-3xl p-5 sm:rounded-[2rem] sm:p-8"}`}
    >
      {badge}
      {s.signedIn ? (
        <p className={`mt-2 ${compact ? "text-sm" : ""} text-dim`}>Your first order: one unit of each product below at its promo price.</p>
      ) : (
        <p className={`mt-2 ${compact ? "text-sm" : "text-lg"} text-dim`}>Sign in to get selected products for only {prices(offers).replace(" & ", " and ")} on your first eligible order.</p>
      )}

      <ul className={`mt-4 grid gap-3 ${!compact && offers.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {offers.map((o) => {
          const inCart = cartIds.includes(o.productId);
          return (
            <li key={o.productId} className="flex items-center gap-3 rounded-2xl bg-white/50 p-3">
              {o.image_url && (
                <Link href={`/product/${o.slug}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-20">
                  <Image src={o.image_url} alt={o.name} fill sizes="80px" className="object-cover" />
                </Link>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{o.name}</p>
                <p className="text-sm text-dim">
                  Normal Price: <span className="line-through">{formatINR(o.normalPaise)}</span> · First Order Price: <b className="text-mint">{formatINR(o.offerPaise)}</b>
                </p>
                {s.signedIn && (
                  inCart ? (
                    <Link href="/checkout" className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold underline">In your cart · Go to checkout →</Link>
                  ) : (
                    <button className="btn btn-primary mt-2 !min-h-10 !px-4 !py-2 text-sm" onClick={() => addOffer(o, true)}>Add to cart for {formatINR(o.offerPaise)}</button>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!s.signedIn && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={signInHref} className="btn btn-primary !min-h-11">Sign in</Link>
          <Link href={registerHref} className="btn btn-ghost !min-h-11">Create account</Link>
        </div>
      )}

      {compact ? (
        <p className="mt-3 text-xs text-dim">One unit of each, once per eligible customer, first order only, when you pay online. A failed payment attempt may consume the offer; a cancelled eligible order restores it.</p>
      ) : (
        <ul className="mt-4 space-y-1 text-xs text-dim sm:text-sm">
          {FINE_PRINT.map((t) => <li key={t}>• {t}</li>)}
        </ul>
      )}
    </section>
  );
}
