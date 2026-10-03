"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { flyToCart } from "@/lib/fly";
import type { Product } from "@/lib/db";

export default function AddToCart({ p }: { p: Product }) {
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);
  const [color, setColor] = useState(p.colors[0]);
  const [qty, setQty] = useState(1);
  const line = { productId: p.id, slug: p.slug, name: p.name, emoji: p.emoji, image: p.image_url, hueA: p.hue_a, hueB: p.hue_b, pricePaise: p.price_paise, color };

  return (
    <div className="mt-8 space-y-6">
      {p.colors.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-dim">Colour: <span className="text-ink">{color}</span></p>
          <div className="flex flex-wrap gap-2">
            {p.colors.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm transition ${c === color ? "border-pink bg-pink/15" : "border-[#7a1d00]/25 text-dim hover:border-[#7a1d00]/50"}`}>{c}</button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="glass flex items-center rounded-full">
          <button className="h-11 w-11 text-xl" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</button>
          <span className="w-8 text-center">{qty}</span>
          <button className="h-11 w-11 text-xl" onClick={() => setQty(Math.min(p.stock || 1, qty + 1))} aria-label="Increase">+</button>
        </div>
        <button disabled={p.stock === 0} className="btn btn-primary min-h-12 flex-1 basis-40"
          onClick={(e) => { add(line, qty); flyToCart(e.currentTarget, p.emoji); }}>
          {p.stock === 0 ? "Sold out" : "Add to cart"}
        </button>
        <button disabled={p.stock === 0} className="btn btn-ghost min-h-12 flex-1 basis-32 sm:flex-none" onClick={() => { add(line, qty); setOpen(true); }}>Buy now</button>
      </div>
    </div>
  );
}
