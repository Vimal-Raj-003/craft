"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

/** Super Admin's order-status dropdown. The server re-checks the admin role on every change. */
export default function OrderStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [s, setS] = useState(status);
  const [err, setErr] = useState("");
  return (
    <span className="inline-flex flex-col">
      <select
        aria-label="Order status"
        className="input !w-auto !py-1.5 text-sm capitalize"
        value={s}
        onChange={async (e) => {
          const prev = s;
          setS(e.target.value); setErr("");
          const r = await fetch("/api/admin/orders", { method: "PATCH", body: JSON.stringify({ id, status: e.target.value }) }).catch(() => null);
          if (!r?.ok) { setS(prev); setErr("Could not update"); } else router.refresh();
        }}
      >
        {STATUSES.map((x) => <option key={x}>{x}</option>)}
      </select>
      {err && <span className="mt-1 text-xs text-pink" role="alert">{err}</span>}
    </span>
  );
}
