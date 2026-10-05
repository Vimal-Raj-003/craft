import Link from "next/link";
import { pool } from "@/lib/db";
import { requireSuper } from "@/lib/admin-guard";
import { formatINR } from "@/lib/money";
import RazorpayCheck from "@/components/RazorpayCheck";

export default async function Diagnostics() {
  await requireSuper();
  const { rows: problems } = await pool.query(
    `SELECT e.stage, e.code, e.message, e.amount_paise, e.created_at, e.order_id
       FROM payment_events e WHERE e.ok = false ORDER BY e.id DESC LIMIT 15`,
  );
  const { rows: last } = await pool.query(
    `SELECT stage, ok, code, created_at FROM payment_events WHERE stage IN ('order_create','verify','webhook') ORDER BY id DESC LIMIT 1`,
  );
  return (
    <>
      <p className="text-sm text-dim">
        Tests Razorpay with the settings the <b>running server</b> actually has (not just the .env file): variables received, test/live mode,
        whether Razorpay accepts the key pair, and (optionally) a ₹1 test order. Secrets are never shown.
      </p>
      <div className="mt-5"><RazorpayCheck /></div>

      <h2 className="mt-10 text-xl font-semibold">What customers actually hit (latest problems)</h2>
      <p className="mt-1 text-sm text-dim">
        Every payment attempt is logged stage by stage. {last[0] ? `Latest activity: ${last[0].stage} · ${last[0].ok ? "ok" : "failed"} · ${new Date(last[0].created_at).toLocaleString("en-IN")}.` : "No payment attempt has been logged yet."}
      </p>
      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-left text-sm [&_td]:pr-4 [&_th]:pr-4">
          <thead className="text-dim"><tr><th className="p-4">When</th><th>Stage</th><th>Code</th><th>Reason</th><th>Amount</th><th>Order</th></tr></thead>
          <tbody>
            {problems.map((p, i) => (
              <tr key={i} className="border-t border-[#7a1d00]/15 align-top">
                <td className="whitespace-nowrap p-4 text-dim">{new Date(p.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td>{p.stage}</td>
                <td className="font-mono text-xs">{p.code ?? "—"}</td>
                <td className="max-w-[320px] break-words text-dim">{p.message ?? "—"}</td>
                <td>{p.amount_paise != null ? formatINR(p.amount_paise) : "—"}</td>
                <td className="font-mono">{p.order_id ? <Link className="underline" href={`/admin/orders/${p.order_id}`}>{p.order_id.slice(0, 8)}</Link> : "—"}</td>
              </tr>
            ))}
            {problems.length === 0 && <tr><td className="p-6 text-dim" colSpan={6}>No failed payment stage has been recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
