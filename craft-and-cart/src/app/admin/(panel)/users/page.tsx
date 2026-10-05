import Link from "next/link";
import { pool } from "@/lib/db";
import { requireSuper } from "@/lib/admin-guard";
import UserRoleSelect from "@/components/UserRoleSelect";

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireSuper();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  // password_hash is never selected anywhere in the admin area
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at, count(o.id)::int AS orders
       FROM users u LEFT JOIN orders o ON o.user_id=u.id
      WHERE ($1::text = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.phone ILIKE '%' || $1 || '%')
      GROUP BY u.id ORDER BY (u.role='CUSTOMER'), u.created_at DESC LIMIT 500`,
    [q],
  );
  return (
    <>
      <p className="text-sm text-dim">
        Everyone who has registered. <b>Customer</b> = shopper. <b>Admin</b> = manages orders, customers, payments and products.
        <b> Super Admin</b> = everything, including deleting products, the ₹1/₹2 offers, roles and the Razorpay check.
      </p>
      <form className="mt-4 flex flex-wrap gap-3" role="search">
        <input name="q" defaultValue={q} className="input min-w-0 flex-1" placeholder="Search by name, email or phone" />
        <button className="btn btn-primary min-h-12">Search</button>
        {q && <Link href="/admin/users" className="btn btn-ghost min-h-12">Clear</Link>}
      </form>
      <p className="mt-4 text-sm text-dim">{rows.length} account{rows.length === 1 ? "" : "s"}</p>
      <div className="glass mt-3 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[760px] text-left text-sm [&_td]:pr-4 [&_th]:pr-4">
          <thead className="text-dim"><tr><th className="p-4">Name</th><th>Email</th><th>Phone</th><th>Registered</th><th>Orders</th><th>Role</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-[#7a1d00]/15">
                <td className="p-4">{u.role === "CUSTOMER" ? <Link className="font-medium underline" href={`/admin/customers/${u.id}`}>{u.name}</Link> : <span className="font-medium">{u.name}</span>}</td>
                <td className="break-all">{u.email}</td>
                <td>{u.phone ?? "—"}</td>
                <td className="whitespace-nowrap text-dim">{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                <td>{u.orders}</td>
                <td><UserRoleSelect id={u.id} role={u.role} self={u.id === me.id} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-6 text-dim" colSpan={6}>No accounts found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
