"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { slug: string; name: string };
export type ProductFormValues = {
  id?: number;
  name: string; sku: string; tagline: string; description: string;
  priceRupees: string; stock: string; categorySlug: string; colors: string;
  active: boolean; featured: boolean; imageUrl: string | null;
};

/** Create or edit a product (Super Admin). Photos can be uploaded once the product exists. */
export default function ProductForm({ initial, categories }: { initial: ProductFormValues; categories: Category[] }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const isNew = initial.id === undefined;
  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => setV((x) => ({ ...x, [k]: val }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const body = {
      name: v.name, sku: v.sku, tagline: v.tagline, description: v.description,
      pricePaise: Math.round(Number(v.priceRupees) * 100), stock: Number(v.stock), categorySlug: v.categorySlug,
      colors: v.colors.split(",").map((c) => c.trim()).filter(Boolean), active: v.active, featured: v.featured,
    };
    const r = await fetch(isNew ? "/api/admin/products" : `/api/admin/products/${initial.id}`, { method: isNew ? "POST" : "PATCH", body: JSON.stringify(body) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r || !r.ok) return setMsg({ ok: false, text: d?.error ?? "Network problem. Please try again." });
    if (isNew) { router.push(`/admin/products/${d.id}`); return; }
    setMsg({ ok: true, text: "Saved." });
    router.refresh();
  }

  async function upload(file: File) {
    setImgBusy(true); setMsg(null);
    const r = await fetch(`/api/admin/products/${initial.id}/image`, { method: "POST", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setImgBusy(false);
    if (!r || !r.ok) return setMsg({ ok: false, text: d?.error ?? "Upload failed." });
    set("imageUrl", d.url);
    setMsg({ ok: true, text: "Photo updated." });
    router.refresh();
  }

  const label = "block text-sm text-dim";
  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass space-y-4 rounded-3xl p-5 sm:p-7">
        <label className={label}>Product name<input className="input mt-1" required minLength={2} value={v.name} onChange={(e) => set("name", e.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>SKU<input className="input mt-1" required value={v.sku} onChange={(e) => set("sku", e.target.value)} /></label>
          <label className={label}>Category
            <select className="input mt-1" value={v.categorySlug} onChange={(e) => set("categorySlug", e.target.value)}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Normal price (₹)<input className="input mt-1" type="number" min="1" step="0.01" required value={v.priceRupees} onChange={(e) => set("priceRupees", e.target.value)} />
            <span className={`mt-1 block text-xs ${Number(v.priceRupees) > 0 && Number(v.priceRupees) <= 300 ? "font-semibold text-mint" : "text-dim"}`}>
              {Number(v.priceRupees) > 0 && Number(v.priceRupees) <= 300 ? "FREE Shipping (priced ₹300 or below)" : "Standard shipping applies (free over ₹999 orders)"}
            </span>
          </label>
          <label className={label}>Stock<input className="input mt-1" type="number" min="0" step="1" required value={v.stock} onChange={(e) => set("stock", e.target.value)} /></label>
        </div>
        <label className={label}>Short tagline<input className="input mt-1" maxLength={160} value={v.tagline} onChange={(e) => set("tagline", e.target.value)} /></label>
        <label className={label}>Description<textarea className="input mt-1 min-h-32" maxLength={2000} value={v.description} onChange={(e) => set("description", e.target.value)} /></label>
        <label className={label}>Colour options (comma separated)<input className="input mt-1" value={v.colors} onChange={(e) => set("colors", e.target.value)} /></label>
        <div className="flex flex-wrap gap-6">
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={v.active} onChange={(e) => set("active", e.target.checked)} /> Active (visible in the shop)</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured on the home page</label>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? "text-mint" : "text-pink"}`} role="status">{msg.text}</p>}
        <button className="btn btn-primary min-h-12 w-full sm:w-auto" disabled={busy}>{busy ? "Saving…" : isNew ? "Create product" : "Save changes"}</button>
      </div>

      <div className="glass h-fit space-y-4 rounded-3xl p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Product photo</h2>
        {isNew ? (
          <p className="text-sm text-dim">Create the product first, then upload its photo here.</p>
        ) : (
          <>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#7a1d00]/5">
              {v.imageUrl ? <Image src={v.imageUrl} alt={v.name} fill sizes="320px" className="object-cover" unoptimized /> : <p className="grid h-full place-items-center p-4 text-center text-sm text-dim">No photo yet</p>}
            </div>
            <label className="btn btn-ghost min-h-12 w-full cursor-pointer">
              {imgBusy ? "Uploading…" : v.imageUrl ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={imgBusy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </label>
            <p className="text-xs text-dim">JPEG, PNG or WebP, up to 5 MB, at least 300 × 300 pixels. It is cropped to a square and optimised automatically.</p>
          </>
        )}
      </div>
    </form>
  );
}
