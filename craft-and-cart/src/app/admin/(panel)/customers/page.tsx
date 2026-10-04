import Link from "next/link";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";

export default async function Customers({ searchParams }: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  // password_hash is never selected anywhere in the admin area.
  const { rows } = await pool.query(
    `SELECT u.id,u.name,u.email,u.phone,u.created_at,
            count(o.id)::int AS orders, coalesce(sum(o.total_paise) FILTER (WHERE o.status <> 'cancelled'),0)::bigint AS spent
       FROM users u LEFT JOIN orders o ON o.user_id=u.id
      WHERE u.role='CUSTOMER' AND ($1::text = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.phone ILIKE '%' || $1 || '%')
      GROUP BY u.id ORDER BY u.created_at DESC LIMIT 300`,
    [q],
  );
  return (
    <>
      <form className="flex flex-wrap gap-3" role="search">
        <input name="q" defaultValue={q} className="input min-w-0 flex-1" placeholder="Search customers by name, email or phone" />
        <button className="btn btn-primary min-h-12">Search</button>
        {q && <Link href="/admin/customers" className="btn btn-ghost min-h-12">Clear</Link>}
      </form>
      <p className="mt-4 text-sm text-dim">{rows.length} customer{rows.length === 1 ? "" : "s"}</p>
      <div className="glass mt-3 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-dim"><tr><th className="p-4">Name</th><th>Email</th><th>Phone</th><th>Registered</th><th>Orders</th><th className="pr-4">Spent</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-[#7a1d00]/15">
                <td className="p-4"><Link className="font-medium underline" href={`/admin/customers/${c.id}`}>{c.name}</Link></td>
                <td>{c.email}</td>
                <td>{c.phone ?? "—"}</td>
                <td className="whitespace-nowrap text-dim">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                <td>{c.orders}</td>
                <td className="pr-4">{formatINR(Number(c.spent))}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-6 text-dim" colSpan={6}>No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
