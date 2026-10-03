"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, cartSubtotal } from "@/lib/cart";
import { formatINR, shippingFor } from "@/lib/money";

type Method = "online" | "cod";

export default function Checkout() {
  const router = useRouter();
  const { lines, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [method, setMethod] = useState<Method>("online");
  const [f, setF] = useState({ name: "", email: "", phone: "", line1: "", city: "", state: "", pincode: "" });

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/me").then((r) => r.json()).then(({ user }) => {
      if (user) setF((x) => ({ ...x, name: user.name, email: user.email }));
    });
  }, []);

  const subtotal = mounted ? cartSubtotal(lines) : 0;
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: method,
          name: f.name, email: f.email, phone: f.phone,
          address: { line1: f.line1, city: f.city, state: f.state, pincode: f.pincode },
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty, color: l.color })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Cash on delivery: confirmed straight away.
      if (data.method === "cod") { clear(); router.push(`/order/${data.orderId}`); return; }

      // Demo mode (no PhonePe keys yet): simulate a successful payment.
      if (data.demo) {
        await fetch("/api/checkout/verify", { method: "POST", body: JSON.stringify({ orderId: data.orderId }) });
        clear(); router.push(`/order/${data.orderId}`); return;
      }

      // Real PhonePe: hand over to PhonePe (opens the PhonePe app on phones). It returns the
      // customer to /order/<id>, which asks PhonePe for the final status before showing the result.
      window.location.href = data.redirectUrl;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  if (mounted && lines.length === 0)
    return <div className="grid min-h-screen place-items-center px-6 text-center"><div><p className="text-6xl">🧺</p><p className="mt-4 text-xl">Your cart is empty.</p><a href="/shop" className="btn btn-primary mt-6">Browse the shop</a></div></div>;

  const option = (m: Method, title: string, sub: string, badge: React.ReactNode) => (
    <label
      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${method === m ? "border-pink bg-pink/10 shadow-[0_8px_30px_-12px_var(--pink)]" : "border-[#7a1d00]/20 hover:border-[#7a1d00]/45"}`}
    >
      <input type="radio" name="pay" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${method === m ? "border-pink" : "border-[#7a1d00]/40"}`}>
        {method === m && <span className="h-2.5 w-2.5 rounded-full bg-pink" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">{title} {badge}</span>
        <span className="mt-1 block text-sm text-dim">{sub}</span>
      </span>
    </label>
  );

  return (
    <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-32 sm:px-6 sm:pt-36">
      <div className="aurora" style={{ opacity: 0.4 }}><i /><i /><i /></div>
      <h1 className="text-4xl font-bold sm:text-5xl">Check<span className="font-serif font-normal italic text-gradient">out</span></h1>
      <form onSubmit={placeOrder} className="mt-8 grid gap-6 sm:mt-10 sm:gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <div className="glass space-y-4 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Delivery details</h2>
            <input className="input" placeholder="Full name" required value={f.name} onChange={set("name")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="input" type="email" placeholder="Email" required value={f.email} onChange={set("email")} />
              <input className="input" type="tel" placeholder="Phone (10 digits)" required value={f.phone} onChange={set("phone")} />
            </div>
            <input className="input" placeholder="Address" required value={f.line1} onChange={set("line1")} />
            <div className="grid gap-4 sm:grid-cols-3">
              <input className="input" placeholder="City" required value={f.city} onChange={set("city")} />
              <input className="input" placeholder="State" required value={f.state} onChange={set("state")} />
              <input className="input" placeholder="Pincode" required inputMode="numeric" maxLength={6} value={f.pincode} onChange={set("pincode")} />
            </div>
          </div>

          <div className="glass space-y-3 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Payment</h2>
            {option(
              "online",
              "Pay online with PhonePe",
              "UPI, PhonePe wallet, cards & netbanking — secure and instant",
              <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: "#5f259f" }}>PhonePe</span>,
            )}
            {option(
              "cod",
              "Cash on delivery",
              "Pay in cash or UPI to the delivery partner when your order arrives",
              <span className="text-2xl" aria-hidden>💵</span>,
            )}
          </div>
        </div>

        <div className="glass h-fit space-y-3 rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Order summary</h2>
          {mounted && lines.map((l) => (
            <div key={`${l.productId}-${l.color}`} className="flex justify-between gap-3 text-sm">
              <span className="text-dim">{l.emoji} {l.name} {l.color && `· ${l.color}`} × {l.qty}</span>
              <span>{formatINR(l.pricePaise * l.qty)}</span>
            </div>
          ))}
          <div className="space-y-2 border-t border-[#7a1d00]/15 pt-4 text-sm">
            <div className="flex justify-between text-dim"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between text-dim"><span>Shipping</span><span>{shipping ? formatINR(shipping) : "Free"}</span></div>
            <div className="flex justify-between text-xl font-bold"><span>Total</span><span>{formatINR(total)}</span></div>
          </div>
          {err && <p className="rounded-xl bg-pink/10 p-3 text-sm text-pink">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !mounted}>
            {busy ? "Processing…" : method === "online" ? `Pay ${formatINR(total)} with PhonePe` : `Place order · pay ${formatINR(total)} on delivery`}
          </button>
          <p className="text-center text-xs text-dim">
            {method === "online" ? "🔒 You'll be taken to PhonePe to complete the payment" : "No payment needed now"}
          </p>
        </div>
      </form>
    </div>
  );
}
