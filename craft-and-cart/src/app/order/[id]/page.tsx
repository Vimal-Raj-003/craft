import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { getOrderDetail, isUuid } from "@/lib/order-queries";
import { syncRazorpayOrder } from "@/lib/orders";
import Confetti from "@/components/Confetti";
import OrderWatcher from "@/components/OrderWatcher";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: PageProps<"/order/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await getSession();
  if (!user) redirect(`/login?next=/order/${id}`);

  // Customers only ever see their own order; a Super Admin can open any.
  const owner = user.role === "SUPER_ADMIN" ? undefined : user.id;
  let o = await getOrderDetail(id, owner);
  if (!o) notFound();

  // Paid and closed the tab, or the webhook is late? Ask Razorpay itself instead of trusting the browser.
  if (o.payment_method === "online" && o.payment_status !== "paid" && o.status === "pending") {
    await syncRazorpayOrder(id);
    o = (await getOrderDetail(id, owner))!;
  }

  const cod = o.payment_method === "cod";
  const confirmed = ["confirmed", "processing", "shipped", "delivered"].includes(o.status);
  const cancelled = o.status === "cancelled";
  const unpaid = !cod && !confirmed && !cancelled; // online order still waiting for a verified payment
  const failed = cancelled || (unpaid && (o.payment_status === "failed" || o.payment_status === "cancelled"));
  const waiting = unpaid && !failed;

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-28 text-center sm:px-6">
      {confirmed && <Confetti />}
      <OrderWatcher confirmed={confirmed} pending={waiting} />
      <div className="aurora"><i /><i /><i /></div>
      <div className="glass max-w-lg rounded-3xl p-6 sm:rounded-[2.5rem] sm:p-10">
        <p className="float text-7xl">{confirmed ? "🎉" : failed ? "😕" : "⏳"}</p>
        <h1 className="mt-6 text-4xl font-bold">
          {confirmed ? <>Thank you, <span className="text-gradient">{o.name.split(" ")[0]}</span>!</> : failed ? "Payment didn't go through" : "Confirming your payment…"}
        </h1>
        <p className="mt-3 text-dim">
          {confirmed
            ? cod
              ? `Your order is placed. Please keep ${formatINR(o.total_paise)} ready for the delivery partner.`
              : "Payment received and verified. Our makers are already reaching for the yarn."
            : failed
              ? "No money was taken (or it will be refunded by your bank). You can try again, or choose Cash on Delivery."
              : "Waiting for Razorpay to confirm. This page updates automatically."}
        </p>
        <p className="mt-6 text-sm text-dim">
          Order <span className="font-mono text-ink">{o.id.slice(0, 8)}</span> · {formatINR(o.total_paise)} · {cod ? "Cash on delivery" : "Razorpay"} · <span className="capitalize text-mint">{o.status}</span>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {(failed || waiting) && <Link href="/checkout" className="btn btn-primary">Try payment again</Link>}
          <Link href={`/account/orders/${o.id}`} className="btn btn-ghost">View order</Link>
          <Link href="/shop" className={`btn ${failed ? "btn-ghost" : "btn-primary"}`}>Keep shopping</Link>
        </div>
      </div>
    </div>
  );
}
