"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserRoleSelect({ id, role, self }: { id: string; role: string; self: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [err, setErr] = useState("");
  if (self) return <span className="text-sm text-dim">{role === "SUPER_ADMIN" ? "Super Admin" : role} (you)</span>;
  return (
    <span className="inline-flex flex-col">
      <select
        aria-label="Role"
        className="input !w-auto !py-1.5 text-sm"
        value={value}
        onChange={async (e) => {
          const prev = value;
          setValue(e.target.value); setErr("");
          const r = await fetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role: e.target.value }) }).catch(() => null);
          const d = await r?.json().catch(() => ({}));
          if (!r?.ok) { setValue(prev); setErr(d?.error ?? "Could not change the role"); } else router.refresh();
        }}
      >
        <option value="CUSTOMER">Customer</option>
        <option value="ADMIN">Admin</option>
        <option value="SUPER_ADMIN">Super Admin</option>
      </select>
      {err && <span className="mt-1 text-xs text-pink" role="alert">{err}</span>}
    </span>
  );
}
