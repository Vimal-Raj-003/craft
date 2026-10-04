import Link from "next/link";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import { getOrderDetail } from "@/lib/order-queries";
import OrderDetailCard from "@/components/OrderDetailCard";
import OrderStatus from "@/components/OrderStatus";

export default async function AdminOrder({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const o = await getOrderDetail(id); // Super Admin: any order (the layout already enforced the role)
  if (!o) notFound();
  const customer = o.user_id ? (await pool.query("SELECT id,name,email,phone FROM users WHERE id=$1", [o.user_id])).rows[0] : null;
  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-block py-2 text-sm text-dim hover:text-ink">← All orders</Link>
      <OrderDetailCard o={o}>
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#7a1d00]/15 pt-5 text-sm">
          <label className="flex items-center gap-3">Update order status <OrderStatus id={o.id} status={o.status} /></label>
          {customer && <Link className="underline" href={`/admin/customers/${customer.id}`}>Customer: {customer.name}</Link>}
        </div>
      </OrderDetailCard>
    </>
  );
}
