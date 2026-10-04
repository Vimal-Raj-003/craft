"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { id: number; name: string; priceRupees: string };

export default function OfferForm({ products, current }: { products: Opt[]; current: { productId: number | null; priceRupees: string; active: boolean } }) {
  const router = useRouter();
  const [productId, setProductId] = useState(String(current.productId ?? products[0]?.id ?? ""));
  const [price, setPrice] = useState(current.priceRupees);
  const [active, setActive] = useState(current.active);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/offer", {
      method: "PUT",
      body: JSON.stringify({ productId: Number(productId), offerPricePaise: Math.round(Number(price) * 100), active }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r || !r.ok) return setMsg({ ok: false, text: d?.error ?? "Network problem. Please try again." });
    setMsg({ ok: true, text: active ? "Saved. This is now the ₹1 first-order product." : "Saved. The offer is switched off." });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="glass space-y-4 rounded-3xl p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <label className="block text-sm text-dim">First Order ₹1 Product
          <select className="input mt-1" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} (normal ₹{p.priceRupees})</option>)}
          </select>
        </label>
        <label className="block text-sm text-dim">Offer price (₹)
          <input className="input mt-1" type="number" min="1" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={active} onChange={(e) => setActive(e.target.checked)} /> Offer is active</label>
      <p className="text-xs text-dim">Only one product can be the first-order product at a time. Saving a different product switches the previous one off. The minimum offer price is ₹1.</p>
      {msg && <p className={`text-sm ${msg.ok ? "text-mint" : "text-pink"}`} role="status">{msg.text}</p>}
      <button className="btn btn-primary min-h-12" disabled={busy || !products.length}>{busy ? "Saving…" : "Save offer"}</button>
    </form>
  );
}
