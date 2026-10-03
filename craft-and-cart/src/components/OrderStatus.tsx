"use client";
import { useState } from "react";

const STATUSES = ["pending", "confirmed", "paid", "shipped", "delivered", "cancelled", "failed"];

export default function OrderStatus({ id, status }: { id: string; status: string }) {
  const [s, setS] = useState(status);
  return (
    <select
      className="input !w-auto !py-1.5 text-sm capitalize"
      value={s}
      onChange={async (e) => {
        const prev = s;
        setS(e.target.value);
        const r = await fetch("/api/admin/orders", { method: "PATCH", body: JSON.stringify({ id, status: e.target.value }) });
        if (!r.ok) setS(prev);
      }}
    >
      {STATUSES.map((x) => <option key={x}>{x}</option>)}
    </select>
  );
}
