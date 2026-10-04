"use client";
import Link from "next/link";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/contact/newsletter", { method: "POST", body: JSON.stringify({ email }) });
    const d = await r.json();
    setMsg(r.ok ? "You're on the list 💌" : d.error);
    if (r.ok) setEmail("");
  }

  return (
    <footer className="relative mt-20 bg-bg2/60 px-4 pb-12 pt-0 sm:mt-32 sm:px-6 sm:pb-16">
      <div className="temple-border flip -mx-4 mb-12 sm:-mx-6 sm:mb-16" />
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-3">
        <div>
          <p className="text-2xl font-bold">🧶 Craft <span className="text-gradient">&</span> Cart</p>
          <p className="mt-3 max-w-xs text-sm text-dim">Every stitch made by hand. Every order packed with a little extra love.</p>
        </div>
        <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm text-dim sm:gap-16">
          <ul className="space-y-0.5">
            <li className="font-semibold text-ink">Shop</li>
            <li><Link href="/shop" className="inline-block py-2 hover:text-ink">All products</Link></li>
            <li><Link href="/shop?category=bouquets" className="inline-block py-2 hover:text-ink">Bouquets</Link></li>
            <li><Link href="/shop?category=keychains" className="inline-block py-2 hover:text-ink">Keychains</Link></li>
            <li><Link href="/shop?category=accessories" className="inline-block py-2 hover:text-ink">Accessories</Link></li>
          </ul>
          <ul className="space-y-0.5">
            <li className="font-semibold text-ink">Help</li>
            <li><Link href="/#custom" className="inline-block py-2 hover:text-ink">Custom orders</Link></li>
            <li><Link href="/account" className="inline-block py-2 hover:text-ink">My orders</Link></li>
          </ul>
        </div>
        <form onSubmit={subscribe}>
          <p className="font-semibold">Get drops before anyone else</p>
          <div className="mt-3 flex gap-2">
            <input className="input min-w-0 !min-h-11" type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary !min-h-11">Join</button>
          </div>
          <p className="mt-2 h-5 text-sm text-mint">{msg}</p>
        </form>
      </div>
      <p className="mt-12 text-center text-xs text-dim">© {new Date().getFullYear()} Craft & Cart · Pay online with Razorpay or Cash on Delivery</p>
    </footer>
  );
}
