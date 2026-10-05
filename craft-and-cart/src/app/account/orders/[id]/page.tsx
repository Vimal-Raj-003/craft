import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrderDetail } from "@/lib/order-queries";
import OrderDetailCard from "@/components/OrderDetailCard";

export const dynamic = "force-dynamic";

export default async function AccountOrder({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  // Scoped to the signed-in customer: someone else's order id gives a plain 404, never their data.
  const order = await getOrderDetail(id, user.id);
  if (!order) notFound();
  return (
    <>
      <Link href="/account" className="mb-4 inline-block py-2 text-sm text-dim hover:text-ink">← All orders</Link>
      <OrderDetailCard o={order} />
    </>
  );
}
