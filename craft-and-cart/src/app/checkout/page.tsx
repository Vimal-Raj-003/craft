"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, cartSubtotal } from "@/lib/cart";
import { formatINR, shippingFor } from "@/lib/money";
import { useMounted } from "@/lib/use-mounted";

type Method = "online" | "cod";
type Addr = { id: string; label: string; name: string; phone: string; line1: string; city: string; state: string; pincode: string; is_default: boolean };
type RazorpayOptions = {
  key: string; order_id: string; amount: number; currency: string; name: string; description: string;
  prefill: { name: string; email: string; contact: string };
};

declare global {
  interface Window {
    Razorpay?: new (o: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: { error?: { description?: string } }) => void): void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const router = useRouter();
  const { lines, clear } = useCart();
  const mounted = useMounted();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [method, setMethod] = useState<Method>("online");
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [save, setSave] = useState(true);
  const [f, setF] = useState({ name: "", phone: "", line1: "", city: "", state: "", pincode: "" });

  const fillFrom = (a: Addr) => setF({ name: a.name, phone: a.phone, line1: a.line1, city: a.city, state: a.state, pincode: a.pincode });

  useEffect(() => {
   fetch("/api/auth/me").then((r) => r.json()).then(({ user }) => {
      setSignedIn(Boolean(user));
      if (user) setF((x) => ({ ...x, name: user.name }));
    }).catch(() => setSignedIn(false));
    fetch("/api/account/addresses").then((r) => (r.ok ? r.json() : { addresses: [] })).then(({ addresses }) => {
      setAddresses(addresses);
      const d = addresses.find((a: Addr) => a.is_default) ?? addresses[0];
      if (d) fillFrom(d);
    }).catch(() => {});
  }, []);

  const subtotal = mounted ? cartSubtotal(lines) : 0;
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const report = (body: Record<string, unknown>) =>
    fetch("/api/checkout/verify", { method: "POST", body: JSON.stringify(body) }).catch(() => null);

  async function payWithRazorpay(orderId: string, rz: RazorpayOptions) {
    if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection and try again.");
    const handleOk = async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
      // The server checks the signature; only then is the order confirmed.
      const r = await report({ event: "success", orderId, ...resp });
      if (r?.ok) clear();
      // If verification didn't get through (slow network?) the order page asks Razorpay directly and settles it;
      // the cart is then cleared there once the order is confirmed.
      router.push(`/order/${orderId}`);
    };
    const rzp = new window.Razorpay({
      ...rz,
      theme: { color: "#e8334f" },
      handler: handleOk,
      modal: {
        ondismiss: () => {
          report({ event: "cancelled", orderId, reason: "Checkout window closed" });
          setErr("Payment was cancelled. Your cart is safe, so you can try again.");
          setBusy(false);
        },
      },
    });
    rzp.on("payment.failed", (r) => {
      report({ event: "failed", orderId, reason: r.error?.description ?? "Payment failed" });
      setErr(r.error?.description ?? "Payment failed. Please try again or use another method.");
      setBusy(false);
    });
    rzp.open();
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: method,
          name: f.name, phone: f.phone,
          address: { line1: f.line1, city: f.city, state: f.state, pincode: f.pincode },
          saveAddress: save && addresses.length === 0,
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty, color: l.color })),
        }),
      });
      const data = await res.json();
      if (res.status === 401) { window.location.href = "/login?next=/checkout"; return; }
      if (!res.ok) throw new Error(data.error);

      if (data.method === "cod" || data.alreadyPaid) { clear(); router.push(`/order/${data.orderId}`); return; }
      await payWithRazorpay(data.orderId, data.razorpay);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  if (mounted && lines.length === 0)
    return <div className="grid min-h-screen place-items-center px-6 text-center"><div><p className="text-6xl">🧺</p><p className="mt-4 text-xl">Your cart is empty.</p><a href="/shop" className="btn btn-primary mt-6">Browse the shop</a></div></div>;

  if (signedIn === false)
    return (
      <div className="grid min-h-screen place-items-center px-4 pb-10 pt-28 text-center">
        <div className="glass max-w-md space-y-4 rounded-3xl p-8">
          <p className="text-5xl">🧶</p>
          <h1 className="text-2xl font-bold">Sign in to check out</h1>
          <p className="text-dim">Your cart is saved. Sign in or create a free account so we can keep your orders and payments safe.</p>
          <Link href="/login?next=/checkout" className="btn btn-primary min-h-12 w-full">Sign in</Link>
          <Link href="/login?next=/checkout&mode=register" className="btn btn-ghost min-h-12 w-full">Create an account</Link>
        </div>
      </div>
    );

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
            {addresses.length > 0 && (
              <select className="input" aria-label="Use a saved address" defaultValue={addresses.find((a) => a.is_default)?.id ?? addresses[0].id}
                onChange={(e) => { const a = addresses.find((x) => x.id === e.target.value); if (a) fillFrom(a); }}>
                {addresses.map((a) => <option key={a.id} value={a.id}>{a.label} · {a.line1}, {a.city}</option>)}
              </select>
            )}
            <input className="input" placeholder="Full name" required value={f.name} onChange={set("name")} />
            <input className="input" type="tel" placeholder="Phone (10 digits)" required value={f.phone} onChange={set("phone")} />
            <input className="input" placeholder="Address" required value={f.line1} onChange={set("line1")} />
            <div className="grid gap-4 sm:grid-cols-3">
              <input className="input" placeholder="City" required value={f.city} onChange={set("city")} />
              <input className="input" placeholder="State" required value={f.state} onChange={set("state")} />
              <input className="input" placeholder="Pincode" required inputMode="numeric" maxLength={6} value={f.pincode} onChange={set("pincode")} />
            </div>
            {addresses.length === 0 && (
              <label className="flex min-h-11 items-center gap-3 text-sm text-dim">
                <input type="checkbox" className="h-5 w-5" checked={save} onChange={(e) => setSave(e.target.checked)} /> Save this address to my account
              </label>
            )}
          </div>

          <div className="glass space-y-3 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Payment</h2>
            {option(
              "online",
              "Pay online with Razorpay",
              "UPI, cards, netbanking & wallets — secure and instant",
              <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: "#0b2a6f" }}>Razorpay</span>,
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
          {err && <p className="rounded-xl bg-pink/10 p-3 text-sm text-pink" role="alert">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !mounted || signedIn === null}>
            {busy ? "Processing…" : method === "online" ? `Pay ${formatINR(total)} securely` : `Place order · pay ${formatINR(total)} on delivery`}
          </button>
          <p className="text-center text-xs text-dim">
            {method === "online" ? "🔒 Payments are processed by Razorpay; we never see your card or UPI details" : "No payment needed now"}
          </p>
        </div>
      </form>
    </div>
  );
}
