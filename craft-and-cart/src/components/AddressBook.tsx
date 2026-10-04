"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Addr = { id: string; label: string; name: string; phone: string; line1: string; city: string; state: string; pincode: string; is_default: boolean };

export default function AddressBook({ addresses, defaultName }: { addresses: Addr[]; defaultName: string }) {
  const router = useRouter();
  const blank = { label: "Home", name: defaultName, phone: "", line1: "", city: "", state: "", pincode: "" };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/account/addresses", { method: "POST", body: JSON.stringify(f) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r || !r.ok) return setErr(d?.error ?? "Network problem. Please try again.");
    setF(blank);
    router.refresh();
  }
  async function act(id: string, method: "PATCH" | "DELETE") {
    await fetch(`/api/account/addresses/${id}`, { method });
    router.refresh();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Saved addresses</h2>
        {addresses.length === 0 && <p className="glass rounded-2xl p-5 text-dim">No saved addresses yet.</p>}
        {addresses.map((a) => (
          <div key={a.id} className="glass rounded-2xl p-5 text-sm">
            <p className="font-semibold">{a.label} {a.is_default && <span className="ml-1 rounded-full bg-mint/15 px-2 py-0.5 text-xs text-mint">Default</span>}</p>
            <p className="mt-1">{a.name} · {a.phone}</p>
            <p className="text-dim">{a.line1}, {a.city}, {a.state} {a.pincode}</p>
            <div className="mt-3 flex gap-4">
              {!a.is_default && <button className="min-h-11 text-dim underline hover:text-ink" onClick={() => act(a.id, "PATCH")}>Make default</button>}
              <button className="min-h-11 text-pink underline" onClick={() => act(a.id, "DELETE")}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="glass h-fit space-y-3 rounded-3xl p-6">
        <h2 className="text-xl font-semibold">Add an address</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Label (Home, Work)" required maxLength={30} value={f.label} onChange={set("label")} />
          <input className="input" placeholder="Full name" required minLength={2} value={f.name} onChange={set("name")} />
        </div>
        <input className="input" type="tel" placeholder="Phone (10 digits)" required value={f.phone} onChange={set("phone")} />
        <input className="input" placeholder="Address" required minLength={3} value={f.line1} onChange={set("line1")} />
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="input" placeholder="City" required value={f.city} onChange={set("city")} />
          <input className="input" placeholder="State" required value={f.state} onChange={set("state")} />
          <input className="input" placeholder="Pincode" required inputMode="numeric" maxLength={6} value={f.pincode} onChange={set("pincode")} />
        </div>
        {err && <p className="text-sm text-pink" role="alert">{err}</p>}
        <button className="btn btn-primary min-h-12 w-full" disabled={busy}>{busy ? "Saving…" : "Save address"}</button>
      </form>
    </div>
  );
}
