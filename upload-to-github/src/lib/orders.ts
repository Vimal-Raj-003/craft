import { pool } from "./db";
import { getOrderStatus, phonepeConfigured } from "./phonepe";

/** Idempotently confirms an order (paid online, or accepted as cash-on-delivery) and decrements stock. */
export async function finalizeOrder(orderId: string, status: "paid" | "confirmed", ref: string | null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // A previously failed online attempt may still succeed on retry, so 'failed' can move to 'paid'.
    const upd = await client.query(
      "UPDATE orders SET status=$2, payment_ref=COALESCE($3,payment_ref) WHERE id=$1 AND status IN ('pending','failed') RETURNING id",
      [orderId, status, ref],
    );
    if (upd.rowCount) {
      await client.query(
        `UPDATE products p SET stock = GREATEST(p.stock - i.qty, 0)
         FROM order_items i WHERE i.order_id=$1 AND i.product_id=p.id`,
        [orderId],
      );
    }
    await client.query("COMMIT");
    return Boolean(upd.rowCount);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function failPendingOrder(orderId: string) {
  await pool.query("UPDATE orders SET status='failed' WHERE id=$1 AND status='pending'", [orderId]);
}

/** Asks PhonePe directly for the order's state (never trust the browser) and updates our record. */
export async function syncPhonePeOrder(orderId: string) {
  if (!phonepeConfigured()) return;
  const { rows } = await pool.query("SELECT status,payment_method FROM orders WHERE id=$1", [orderId]);
  const o = rows[0];
  if (!o || o.payment_method !== "online" || !["pending", "failed"].includes(o.status)) return;
  try {
    const s = await getOrderStatus(orderId);
    if (s.state === "COMPLETED") await finalizeOrder(orderId, "paid", s.transactionId ?? s.orderId ?? null);
    else if (s.state === "FAILED") await failPendingOrder(orderId);
  } catch (e) {
    console.error("PhonePe status sync failed", e);
  }
}
