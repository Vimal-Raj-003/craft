"use client";
import { useState } from "react";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";
import { AFTER_LOGIN_HOME, safeNext } from "@/lib/safe-next";

export default function LoginForm({ initialMode }: { initialMode: "login" | "register" }) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const body = mode === "login" ? { email: f.email, password: f.password } : f;
      const r = await fetch(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "Something went wrong"); setBusy(false); return; }
      // back to the page they wanted (e.g. checkout), otherwise straight to the products - never to /account
      const next = safeNext(new URLSearchParams(window.location.search).get("next"));
      window.location.href = next ?? (d.user.role !== "CUSTOMER" ? "/admin/dashboard" : AFTER_LOGIN_HOME);
    } catch {
      setErr("Network problem. Please try again."); setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 pb-10 pt-28 sm:px-6">
      <div className="aurora"><i /><i /><i /></div>
      <form onSubmit={submit} className="glass w-full max-w-md space-y-4 rounded-3xl p-6 sm:rounded-[2rem] sm:p-8">
        <h1 className="text-3xl font-bold">{mode === "login" ? "Welcome back" : "Join the club"} <span className="float inline-block">🧶</span></h1>
        {mode === "register" && <input className="input" placeholder="Full name" autoComplete="name" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        <input className="input" type="email" placeholder="Email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        {mode === "register" && <input className="input" type="tel" placeholder="Phone number (10 digits)" autoComplete="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />}
        <PasswordInput placeholder={mode === "register" ? "Password (min 8 characters)" : "Password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : 1} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p className="text-sm text-pink" role="alert">{err}</p>}
        <button className="btn btn-primary min-h-12 w-full" disabled={busy}>{busy ? "…" : mode === "login" ? "Sign in" : "Create account"}</button>
        {mode === "login" && (
          <Link href="/forgot-password" className="block py-1 text-center text-sm text-dim hover:text-ink">Forgot your password?</Link>
        )}
        <button type="button" className="min-h-11 w-full text-sm text-dim hover:text-ink" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
