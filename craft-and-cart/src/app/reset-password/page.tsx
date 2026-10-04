"use client";
import { useState } from "react";
import Link from "next/link";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    const r = await fetch("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r || !r.ok) { setErr(d?.error ?? "Something went wrong. Please try again."); setBusy(false); return; }
    setDone(true);
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 pb-10 pt-28 sm:px-6">
      <div className="aurora"><i /><i /><i /></div>
      <form onSubmit={submit} className="glass w-full max-w-md space-y-4 rounded-3xl p-6 sm:rounded-[2rem] sm:p-8">
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        {done ? (
          <>
            <p className="text-dim">Your password has been changed. You can sign in now.</p>
            <Link href="/login" className="btn btn-primary min-h-12 w-full">Sign in</Link>
          </>
        ) : (
          <>
            <input className="input" type="password" placeholder="New password (min 8 characters)" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            {err && <p className="text-sm text-pink" role="alert">{err}</p>}
            <button className="btn btn-primary min-h-12 w-full" disabled={busy}>{busy ? "…" : "Change password"}</button>
            <Link href="/forgot-password" className="block py-1 text-center text-sm text-dim hover:text-ink">Need a new link?</Link>
          </>
        )}
      </form>
    </div>
  );
}
