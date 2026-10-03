import { notFound } from "next/navigation";
import Link from "next/link";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { syncPhonePeOrder } from "@/lib/orders";
import Confetti from "@/components/Confetti";
import OrderWatcher from "@/components/OrderWatcher";

export const dynamic = "force-dynamic";

const load = async (id: string) =>
  (await pool.query("SELECT id,name,status,total_paise,payment_method FROM orders WHERE id=$1", [id])).rows[0];

export default async function OrderPage({ params }: PageProps<"/order/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  let o = await load(id);
  if (!o) notFound();

  // Coming back from PhonePe: ask PhonePe for the real result instead of trusting the browser.
  if (o.payment_method === "online" && (o.status === "pending" || o.status === "failed")) {
    await syncPhonePeOrder(id);
    o = await load(id);
  }

  const cod = o.payment_method === "cod";
  const confirmed = ["paid", "confirmed", "shipped", "delivered"].includes(o.status);
  const pending = o.status === "pending";
  const failed = o.status === "failed" || o.status === "cancelled";

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-28 text-center sm:px-6">
      {confirmed && <Confetti />}
      <OrderWatcher confirmed={confirmed} pending={pending} />
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
              : "Payment received via PhonePe. Our makers are already reaching for the yarn."
            : failed
              ? "No money was taken. You can try again, or choose Cash on Delivery."
              : "Waiting for PhonePe to confirm. This page updates automatically."}
        </p>
        <p className="mt-6 text-sm text-dim">
          Order <span className="font-mono text-ink">{o.id.slice(0, 8)}</span> · {formatINR(o.total_paise)} · {cod ? "Cash on delivery" : "PhonePe"} · <span className="capitalize text-mint">{o.status}</span>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {failed && <Link href="/checkout" className="btn btn-primary">Try again</Link>}
          <Link href="/shop" className={`btn ${failed ? "btn-ghost" : "btn-primary"}`}>Keep shopping</Link>
        </div>
      </div>
    </div>
  );
}
