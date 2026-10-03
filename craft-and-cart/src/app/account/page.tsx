import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await getSession();
  if (!user) redirect("/login");
  const { rows: orders } = await pool.query(
    `SELECT o.id,o.status,o.total_paise,o.created_at,
            (SELECT string_agg(i.name || ' × ' || i.qty, ', ') FROM order_items i WHERE i.order_id=o.id) AS items
     FROM orders o WHERE o.user_id=$1 ORDER BY o.created_at DESC`,
    [user.id],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-32 sm:px-6 sm:pt-36">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">Hi, <span className="text-gradient">{user.name.split(" ")[0]}</span> 👋</h1>
        <LogoutButton />
      </div>
      <h2 className="mt-12 text-xl font-semibold">Your orders</h2>
      <div className="mt-4 space-y-3">
        {orders.length === 0 && <p className="text-dim">No orders yet — go find something soft.</p>}
        {orders.map((o) => (
          <div key={o.id} className="glass flex items-center justify-between gap-4 rounded-2xl p-5">
            <div className="min-w-0">
              <p className="truncate font-medium">{o.items}</p>
              <p className="text-xs text-dim">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("en-IN")}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatINR(o.total_paise)}</p>
              <p className="text-xs capitalize text-mint">{o.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
