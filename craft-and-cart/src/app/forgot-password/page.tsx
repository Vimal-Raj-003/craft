"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) }).catch(() => null);
    if (!r || !r.ok) { setErr("Something went wrong. Please try again."); setBusy(false); return; }
    setDone(true);
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 pb-10 pt-28 sm:px-6">
      <div className="aurora"><i /><i /><i /></div>
      <form onSubmit={submit} className="glass w-full max-w-md space-y-4 rounded-3xl p-6 sm:rounded-[2rem] sm:p-8">
        <h1 className="text-3xl font-bold">Forgot password?</h1>
        {done ? (
          <p className="text-dim">If an account exists for <b className="text-ink">{email}</b>, a reset link is on its way. It works for one hour.</p>
        ) : (
          <>
            <p className="text-sm text-dim">Enter your email and we&apos;ll send you a link to choose a new password.</p>
            <input className="input" type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            {err && <p className="text-sm text-pink" role="alert">{err}</p>}
            <button className="btn btn-primary min-h-12 w-full" disabled={busy}>{busy ? "…" : "Send reset link"}</button>
          </>
        )}
        <Link href="/login" className="block py-1 text-center text-sm text-dim hover:text-ink">Back to sign in</Link>
      </form>
    </div>
  );
}
