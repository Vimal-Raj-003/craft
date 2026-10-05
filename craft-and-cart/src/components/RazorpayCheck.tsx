"use client";
import { useState } from "react";

type Step = { id: string; title: string; status: "PASS" | "FAIL" | "WARN" | "SKIPPED"; detail: string; hint?: string };
const TONE = { PASS: "bg-mint/15 text-mint", FAIL: "bg-pink/15 text-pink", WARN: "bg-amber/15 text-amber", SKIPPED: "bg-black/5 text-dim" } as const;

export default function RazorpayCheck() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [at, setAt] = useState("");
  const [busy, setBusy] = useState<"" | "check" | "order">("");
  const [err, setErr] = useState("");

  async function run(createTestOrder: boolean) {
    setBusy(createTestOrder ? "order" : "check"); setErr("");
    const r = await fetch("/api/admin/diagnostics/razorpay", { method: "POST", body: JSON.stringify({ createTestOrder }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy("");
    if (!r || !r.ok) return setErr(d?.error ?? "The check could not run.");
    setSteps(d.steps); setAt(new Date(d.at).toLocaleString("en-IN"));
  }

  const failed = steps?.filter((s) => s.status === "FAIL") ?? [];
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary min-h-12" disabled={busy !== ""} onClick={() => run(false)}>{busy === "check" ? "Checking…" : "Run check"}</button>
        <button className="btn btn-ghost min-h-12" disabled={busy !== ""} onClick={() => run(true)}>{busy === "order" ? "Checking…" : "Run check + create ₹1 test order"}</button>
      </div>
      {err && <p className="mt-4 text-sm text-pink" role="alert">{err}</p>}
      {steps && (
        <div className="mt-6 space-y-3">
          <p className={`rounded-2xl p-4 text-sm font-semibold ${failed.length ? "bg-pink/10 text-pink" : "bg-mint/10 text-mint"}`}>
            {failed.length ? `Failing stage: ${failed.map((s) => s.title).join("; ")}` : "No failing stage."} <span className="font-normal text-dim">· checked {at}</span>
          </p>
          {steps.map((s) => (
            <div key={s.id} className="glass rounded-2xl p-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[s.status]}`}>{s.status}</span>
                <span className="font-semibold">{s.title}</span>
              </div>
              <p className="mt-2 break-words text-dim">{s.detail}</p>
              {s.hint && <p className="mt-2 break-words text-ink">→ {s.hint}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
