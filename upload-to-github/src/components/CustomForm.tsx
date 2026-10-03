"use client";
import { useState } from "react";

export default function CustomForm() {
  const [f, setF] = useState({ name: "", email: "", idea: "", budget: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending"); setErr("");
    const r = await fetch("/api/contact/custom", { method: "POST", body: JSON.stringify(f) });
    if (r.ok) setState("done");
    else { setErr((await r.json()).error); setState("idle"); }
  }

  if (state === "done")
    return <div className="glass rounded-3xl p-10 text-center"><p className="text-5xl">🧵</p><p className="mt-4 text-xl font-semibold">Got it! We&apos;ll reply within 24 hours.</p></div>;

  return (
    <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <input className="input" placeholder="Your name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" type="email" placeholder="Email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </div>
      <textarea className="input min-h-32" placeholder="Describe your dream piece — colours, size, occasion…" required value={f.idea} onChange={(e) => setF({ ...f, idea: e.target.value })} />
      <select className="input" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })}>
        <option value="">Budget (optional)</option>
        <option>Under ₹1,000</option><option>₹1,000 – ₹3,000</option><option>₹3,000+</option>
      </select>
      {err && <p className="text-sm text-pink">{err}</p>}
      <button className="btn btn-primary w-full" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send my idea ✨"}</button>
    </form>
  );
}
