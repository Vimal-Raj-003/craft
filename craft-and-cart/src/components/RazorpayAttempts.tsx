"use client";
import { useState } from "react";

type Attempt = { id: string; status: string; method: string | null; amount: number; errorCode: string | null; errorDescription: string | null; errorReason: string | null; errorStep: string | null; createdAt: string | null };

/** SUPER_ADMIN button on a payment: shows what Razorpay itself recorded for this order (including why an attempt failed). */
export default function RazorpayAttempts({ paymentId }: { paymentId: string }) {
  const [data, setData] = useState<{ attempts: Attempt[]; expectedPaise: number } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setErr("");
    const r = await fetch(`/api/admin/payments/${paymentId}/razorpay`).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r || !r.ok) return setErr([d?.error, d?.hint].filter(Boolean).join(" → ") || "Could not ask Razorpay.");
    setData(d);
  }
  return (
    <div>
      <button className="btn btn-primary min-h-12" onClick={load} disabled={busy}>{busy ? "Asking Razorpay…" : "Ask Razorpay what happened"}</button>
      {err && <p className="mt-3 break-words text-sm text-pink" role="alert">{err}</p>}
      {data && (
        <div className="mt-4 space-y-3 text-sm">
          {data.attempts.length === 0 && <p className="text-dim">Razorpay has no payment attempt for this order: the customer never completed or even started a payment in the Razorpay window.</p>}
          {data.attempts.map((a) => (
            <div key={a.id} className="glass rounded-2xl p-4">
              <p className="font-mono text-xs">{a.id}</p>
              <p className="mt-1"><b className="capitalize">{a.status}</b> · {a.method ?? "method unknown"} · {(a.amount / 100).toFixed(2)} INR{a.amount !== data.expectedPaise && <b className="ml-2 text-pink">(expected {(data.expectedPaise / 100).toFixed(2)})</b>}</p>
              {(a.errorCode || a.errorDescription) && <p className="mt-1 break-words text-pink">{[a.errorCode, a.errorDescription, a.errorReason && `reason: ${a.errorReason}`, a.errorStep && `step: ${a.errorStep}`].filter(Boolean).join(" · ")}</p>}
              {a.createdAt && <p className="text-xs text-dim">{new Date(a.createdAt).toLocaleString("en-IN")}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
