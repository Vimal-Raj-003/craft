"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileForms(props: { name: string; email: string; phone: string; since: string }) {
  const router = useRouter();
  const [f, setF] = useState({ name: props.name, phone: props.phone });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState<{ k: string; text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState("");

  async function send(kind: "profile" | "password") {
    setBusy(kind); setMsg(null);
    const r = await fetch("/api/account/profile", {
      method: kind === "profile" ? "PATCH" : "POST",
      body: JSON.stringify(kind === "profile" ? f : pw),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy("");
    if (!r || !r.ok) return setMsg({ k: kind, text: d?.error ?? "Network problem. Please try again.", ok: false });
    if (kind === "password") setPw({ current: "", next: "" });
    setMsg({ k: kind, text: kind === "profile" ? "Profile saved." : "Password changed.", ok: true });
    router.refresh();
  }

  const note = (k: string) => msg?.k === k && <p className={`text-sm ${msg.ok ? "text-mint" : "text-pink"}`} role="status">{msg.text}</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={(e) => { e.preventDefault(); send("profile"); }} className="glass space-y-4 rounded-3xl p-6">
        <h2 className="text-xl font-semibold">Profile</h2>
        <label className="block text-sm text-dim">Full name
          <input className="input mt-1" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label className="block text-sm text-dim">Email
          <input className="input mt-1 opacity-70" value={props.email} readOnly />
        </label>
        <label className="block text-sm text-dim">Phone
          <input className="input mt-1" type="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </label>
        <p className="text-xs text-dim">Member since {props.since}</p>
        {note("profile")}
        <button className="btn btn-primary min-h-12 w-full" disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save profile"}</button>
      </form>

      <form onSubmit={(e) => { e.preventDefault(); send("password"); }} className="glass h-fit space-y-4 rounded-3xl p-6">
        <h2 className="text-xl font-semibold">Change password</h2>
        <input className="input" type="password" placeholder="Current password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <input className="input" type="password" placeholder="New password (min 8 characters)" autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        {note("password")}
        <button className="btn btn-ghost min-h-12 w-full" disabled={busy === "password"}>{busy === "password" ? "Changing…" : "Change password"}</button>
      </form>
    </div>
  );
}
