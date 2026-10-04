"use client";
import { useMounted } from "@/lib/use-mounted";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCart, cartSubtotal } from "@/lib/cart";
import { formatINR, shippingFor, FREE_SHIPPING_OVER } from "@/lib/money";
import { useOffer } from "@/lib/use-offer";
import OfferBanner from "./OfferBanner";

export default function CartDrawer() {
  const { lines, open, setOpen, setQty, remove } = useCart();
  const mounted = useMounted();
  const subtotal = mounted ? cartSubtotal(lines) : 0;
  // Preview of the first-order offer (display only; the server prices the real order at checkout)
  const offerState = useOffer();
  const promoLine = offerState?.eligible && offerState.offer ? lines.find((l) => l.productId === offerState.offer!.productId) : undefined;
  const discount = mounted && promoLine && offerState?.offer ? Math.max(0, promoLine.pricePaise - offerState.offer.offerPaise) : 0;
  const payable = subtotal - discount;
  const progress = Math.min(payable / FREE_SHIPPING_OVER, 1);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="glass fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col bg-bg2/95 p-4 sm:p-6"
            data-lenis-prevent
            style={{ background: "rgba(255,247,226,.985)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your cart</h2>
              <button onClick={() => setOpen(false)} className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Close cart">✕</button>
            </div>

            <div className="mb-5 rounded-2xl bg-[#7a1d00]/5 p-3 text-sm">
              <p className="mb-2 text-dim">
                {payable >= FREE_SHIPPING_OVER ? "🎉 Free shipping unlocked!" : `Add ${formatINR(FREE_SHIPPING_OVER - payable)} more for free shipping`}
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#7a1d00]/10">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-pink to-mint" animate={{ width: `${progress * 100}%` }} />
              </div>
            </div>

            <div className="-mr-2 flex-1 space-y-3 overflow-y-auto pr-2">
              {mounted && <OfferBanner variant="mini" />}
              {mounted && lines.length === 0 && (
                <p className="mt-16 text-center text-dim">Your cart is empty.<br />Go find something soft ✨</p>
              )}
              <AnimatePresence initial={false}>
                {mounted && lines.map((l) => (
                  <motion.div
                    key={`${l.productId}-${l.color}`} layout
                    initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40, height: 0 }}
                    className="flex gap-3 rounded-2xl border border-[#7a1d00]/15 bg-[#7a1d00]/5 p-3"
                  >
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl text-3xl"
                      style={{ background: l.image ? `center / cover url(${l.image})` : `linear-gradient(135deg, ${l.hueA}, ${l.hueB})` }}>
                      {l.image ? null : l.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/product/${l.slug}`} onClick={() => setOpen(false)} className="block truncate py-1 font-semibold">{l.name}</Link>
                      <p className="text-xs text-dim">{l.color}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => setQty(l.productId, l.color, l.qty - 1)} aria-label="Decrease">−</button>
                        <span className="w-5 text-center text-sm">{l.qty}</span>
                        <button className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => setQty(l.productId, l.color, l.qty + 1)} aria-label="Increase">+</button>
                        <button className="ml-auto min-h-10 px-2 text-xs text-dim hover:text-pink" onClick={() => remove(l.productId, l.color)}>Remove</button>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{formatINR(l.pricePaise * l.qty)}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-5 space-y-2 border-t border-[#7a1d00]/15 pt-5 text-sm">
              <div className="flex justify-between text-dim"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-mint"><span>First order ₹1 product discount <span className="text-xs text-dim">(pay online)</span></span><span>−{formatINR(discount)}</span></div>
              )}
              <div className="flex justify-between text-dim"><span>Shipping</span><span>{shippingFor(payable) === 0 ? "Free" : formatINR(shippingFor(payable))}</span></div>
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatINR(payable + shippingFor(payable))}</span></div>
              <Link href="/checkout" onClick={() => setOpen(false)}
                className={`btn btn-primary mt-3 w-full ${!lines.length ? "pointer-events-none opacity-40" : ""}`}>
                Checkout securely →
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
