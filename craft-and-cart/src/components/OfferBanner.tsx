"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import { useOffer } from "@/lib/use-offer";

const FINE_PRINT = [
  "Only one promotional product will be ₹1. Other products remain at normal price.",
  "This offer is available once per eligible customer.",
  "Important: A failed payment attempt may consume the offer.",
  "If your eligible order is cancelled, the offer will be restored.",
  "The ₹1 price applies when you pay online (Razorpay).",
];

/**
 * "₹1 First Order Product Offer". Guests see the sign-in invitation, eligible customers see the product and an add button,
 * everyone else (already used / not a first order) sees nothing. The real price is always decided by the server at checkout.
 */
export default function OfferBanner({ variant = "full" }: { variant?: "full" | "compact" | "mini" }) {
  const s = useOffer();
  const pathname = usePathname();
  const add = useCart((c) => c.add);
  const setOpen = useCart((c) => c.setOpen);
  const inCart = useCart((c) => c.lines.some((l) => l.productId === s?.offer?.productId));

  if (!s?.offer || (s.signedIn && !s.eligible)) return null;
  const o = s.offer;
  const compact = variant === "compact";

  // One slim line for the cart drawer, so the offer never crowds out the items.
  if (variant === "mini") {
    return (
      <section aria-label="First order offer" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-2 border-dashed border-[#a8321a]/40 bg-[#fff8e6]/80 p-3 text-sm">
        <span className="rounded-full bg-gradient-to-r from-pink to-violet px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">₹1 First Order Offer</span>
        {!s.signedIn ? (
          <>
            <span className="min-w-0 flex-1 text-dim">Sign in to get {o.name} for only ₹1 on your first eligible order.</span>
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-primary !min-h-10 !px-4 !py-2 text-sm">Sign in</Link>
          </>
        ) : inCart ? (
          <span className="min-w-0 flex-1 text-dim"><b className="text-mint">{o.name}</b> will be {formatINR(o.offerPaise)} at checkout (pay online). One per customer.</span>
        ) : (
          <>
            <span className="min-w-0 flex-1 text-dim">{o.name}: <span className="line-through">{formatINR(o.normalPaise)}</span> <b className="text-mint">{formatINR(o.offerPaise)}</b></span>
            <button
              className="btn btn-primary !min-h-10 !px-4 !py-2 text-sm"
              onClick={() => add({ productId: o.productId, slug: o.slug, name: o.name, emoji: o.emoji, image: o.image_url, hueA: o.hue_a, hueB: o.hue_b, pricePaise: o.normalPaise, color: o.color ?? undefined })}
            >
              Add for {formatINR(o.offerPaise)}
            </button>
          </>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="First order offer"
      className={`relative overflow-hidden border-2 border-dashed border-[#a8321a]/40 bg-[#fff8e6]/80 ${compact ? "rounded-2xl p-4" : "rounded-3xl p-5 sm:rounded-[2rem] sm:p-8"}`}
    >
      <div className={`flex gap-4 ${compact ? "items-center" : "flex-col sm:flex-row sm:items-center sm:gap-6"}`}>
        {o.image_url && (
          <div className={`relative shrink-0 overflow-hidden rounded-2xl ${compact ? "h-16 w-16" : "h-28 w-28 sm:h-36 sm:w-36"}`}>
            <Image src={o.image_url} alt={o.name} fill sizes="144px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="inline-block rounded-full bg-gradient-to-r from-pink to-violet px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            ₹1 First Order Product Offer
          </p>
          <h2 className={`mt-2 font-bold leading-tight ${compact ? "text-lg" : "text-2xl sm:text-3xl"}`}>{o.name}</h2>

          {s.signedIn ? (
            <>
              <p className="mt-1 text-dim">
                Normal Price: <span className="line-through">{formatINR(o.normalPaise)}</span> · First Order Price:{" "}
                <span className="font-bold text-mint">{formatINR(o.offerPaise)}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {inCart ? (
                  <Link href="/checkout" className="btn btn-primary !min-h-11">Go to checkout →</Link>
                ) : (
                  <button
                    className="btn btn-primary !min-h-11"
                    onClick={() => {
                      add({ productId: o.productId, slug: o.slug, name: o.name, emoji: o.emoji, image: o.image_url, hueA: o.hue_a, hueB: o.hue_b, pricePaise: o.normalPaise, color: o.color ?? undefined });
                      setOpen(true);
                    }}
                  >
                    Add to cart for {formatINR(o.offerPaise)}
                  </button>
                )}
                <Link href={`/product/${o.slug}`} className="btn btn-ghost !min-h-11">View product</Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-dim">Sign in to get one selected product for only ₹1 on your first eligible order.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-primary !min-h-11">Sign in</Link>
                <Link href={`/login?mode=register&next=${encodeURIComponent(pathname)}`} className="btn btn-ghost !min-h-11">Create account</Link>
              </div>
            </>
          )}

          {compact ? (
            <p className="mt-3 text-xs text-dim">Only one product is ₹1, once per eligible customer, when you pay online. A failed payment attempt may consume the offer; a cancelled eligible order restores it.</p>
          ) : (
            <ul className="mt-4 space-y-1 text-xs text-dim sm:text-sm">
              {FINE_PRINT.map((t) => <li key={t}>• {t}</li>)}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
