"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) { setErr(d.error); setBusy(false); return; }
    window.location.href = d.user.role === "admin" ? "/admin" : "/account";
    router.refresh();
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 pb-10 pt-28 sm:px-6">
      <div className="aurora"><i /><i /><i /></div>
      <form onSubmit={submit} className="glass w-full max-w-md space-y-4 rounded-3xl p-6 sm:rounded-[2rem] sm:p-8">
        <h1 className="text-3xl font-bold">{mode === "login" ? "Welcome back" : "Join the club"} <span className="float inline-block">🧶</span></h1>
        {mode === "register" && <input className="input" placeholder="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        <input className="input" type="email" placeholder="Email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="input" type="password" placeholder="Password (min 8 chars)" required minLength={mode === "register" ? 8 : 1} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p className="text-sm text-pink">{err}</p>}
        <button className="btn btn-primary min-h-12 w-full" disabled={busy}>{busy ? "…" : mode === "login" ? "Sign in" : "Create account"}</button>
        <button type="button" className="min-h-11 w-full text-sm text-dim hover:text-ink" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
