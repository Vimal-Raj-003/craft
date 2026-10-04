"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { id: number; name: string; priceRupees: string };

/** One promotional slot: slot 1 = the ₹1 product, slot 2 = the ₹2 product. */
export default function OfferForm({ slot, products, current }: { slot: 1 | 2; products: Opt[]; current: { productId: number | null; active: boolean } }) {
  const router = useRouter();
  const [productId, setProductId] = useState(String(current.productId ?? products[0]?.id ?? ""));
  const [active, setActive] = useState(current.active);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/offer", { method: "PUT", body: JSON.stringify({ slot, productId: Number(productId), active }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r || !r.ok) return setMsg({ ok: false, text: d?.error ?? "Network problem. Please try again." });
    setMsg({ ok: true, text: active ? `Saved. This is now the ₹${slot} first-order product.` : `Saved. The ₹${slot} offer is switched off.` });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="glass space-y-4 rounded-3xl p-5 sm:p-7">
      <h3 className="text-lg font-semibold">First Order ₹{slot} Product</h3>
      <label className="block text-sm text-dim">Product
        <select className="input mt-1" value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} (normal ₹{p.priceRupees})</option>)}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={active} onChange={(e) => setActive(e.target.checked)} /> ₹{slot} offer is active</label>
      {msg && <p className={`text-sm ${msg.ok ? "text-mint" : "text-pink"}`} role="status">{msg.text}</p>}
      <button className="btn btn-primary min-h-12" disabled={busy || !products.length}>{busy ? "Saving…" : `Save ₹${slot} product`}</button>
    </form>
  );
}
