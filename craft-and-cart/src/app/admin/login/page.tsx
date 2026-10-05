"use client";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

export default function AdminLogin() {
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/admin-login", { method: "POST", body: JSON.stringify(f) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "Something went wrong"); setBusy(false); return; }
      window.location.href = "/admin/dashboard";
    } catch {
      setErr("Network problem. Please try again."); setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 pb-10 pt-28 sm:px-6">
      <div className="aurora"><i /><i /><i /></div>
      <form onSubmit={submit} className="glass w-full max-w-md space-y-4 rounded-3xl p-6 sm:rounded-[2rem] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-dim">Craft &amp; Cart</p>
        <h1 className="text-3xl font-bold">Admin sign in <span className="inline-block">🔐</span></h1>
        <input className="input" type="email" placeholder="Admin email" name="email" autoComplete="username" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <PasswordInput placeholder="Password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p className="text-sm text-pink" role="alert">{err}</p>}
        <button className="btn btn-primary min-h-12 w-full" disabled={busy}>{busy ? "…" : "Sign in"}</button>
        <p className="text-center text-xs text-dim">Customers: please use the normal <a href="/login" className="underline">sign in</a> page.</p>
      </form>
    </div>
  );
}
