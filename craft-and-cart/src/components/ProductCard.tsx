"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion } from "motion/react";
import { useCart } from "@/lib/cart";
import { flyToCart } from "@/lib/fly";
import { formatINR } from "@/lib/money";
import ProductArt from "./ProductArt";
import type { Product } from "@/lib/db";

export default function ProductCard({ p, index = 0 }: { p: Product; index?: number }) {
  const card = useRef<HTMLDivElement>(null);
  const add = useCart((s) => s.add);

  // 3D tilt + moving glare following the pointer.
  function onMove(e: React.PointerEvent) {
    const el = card.current;
    if (!el || e.pointerType === "touch") return; // the tilt is a mouse effect; do not wobble while scrolling with a finger
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 14}deg) rotateX(${(0.5 - y) * 14}deg) translateZ(0)`;
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  }
  const reset = () => { if (card.current) card.current.style.transform = ""; };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div
        ref={card} onPointerMove={onMove} onPointerLeave={reset} data-hot
        className="glass group relative overflow-hidden rounded-2xl p-2 transition-transform sm:rounded-3xl sm:p-3 duration-200 ease-out will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(400px circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.14), transparent 45%)" }}
        />
        <Link href={`/product/${p.slug}`} className="block">
          <div
            className="relative grid aspect-square place-items-center overflow-hidden rounded-xl sm:rounded-2xl"
            style={{ background: `radial-gradient(circle at 30% 20%, ${p.hue_a}, ${p.hue_b} 75%)` }}
          >
            <ProductArt p={p} sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 46vw" />
            {p.stock <= 5 && p.stock > 0 && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur sm:left-3 sm:top-3 sm:px-3">Only {p.stock} left</span>}
            {p.stock === 0 && <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-xs text-white sm:left-3 sm:top-3 sm:px-3">Sold out</span>}
          </div>
          <div className="px-1 pb-1 pt-3 sm:px-2 sm:pt-4">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <h3 className="text-[15px] font-semibold leading-tight sm:text-lg">{p.name}</h3>
              <span className="whitespace-nowrap text-[15px] font-semibold text-mint sm:text-base">{formatINR(p.price_paise)}</span>
            </div>
            <p className="mt-1 line-clamp-1 text-xs text-dim sm:text-sm">{p.tagline}</p>
            {p.rating && <p className="mt-2 text-xs text-amber">{"★".repeat(Math.round(p.rating))} <span className="text-dim">({p.review_count})</span></p>}
          </div>
        </Link>
        <button
          disabled={p.stock === 0}
          onClick={(e) => {
            add({ productId: p.id, slug: p.slug, name: p.name, emoji: p.emoji, image: p.image_url, hueA: p.hue_a, hueB: p.hue_b, pricePaise: p.price_paise, color: p.colors[0] });
            flyToCart(e.currentTarget, p.emoji);
          }}
          className="btn btn-ghost relative z-20 mt-2 w-full !min-h-11 !px-3 !py-2.5 text-[13px] hover:!bg-gradient-to-r hover:from-pink hover:to-violet sm:mt-3 sm:text-sm"
        >
          {p.stock === 0 ? "Sold out" : "Add to cart +"}
        </button>
      </div>
    </motion.div>
  );
}
