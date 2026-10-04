import { pool } from "./db";
import { listOrderPayments, razorpayConfigured } from "./razorpay";

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const DECREMENT_STOCK = `
  UPDATE products p SET stock = GREATEST(p.stock - i.qty, 0)
  FROM order_items i WHERE i.order_id=$1 AND i.product_id=p.id`;

/**
 * A verified Razorpay payment: marks the payment paid and confirms the order (and takes stock) exactly once.
 * Safe to call repeatedly (browser verify, webhook and status sync can all arrive for the same payment).
 * Returns true only the first time.
 */
export async function confirmRazorpayPayment(orderId: string, razorpayPaymentId: string | null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pay = await client.query(
      `UPDATE payments SET status='paid', razorpay_payment_id=COALESCE($2, razorpay_payment_id), paid_at=now(), failure_reason=NULL, updated_at=now()
       WHERE order_id=$1 AND provider='razorpay' AND status <> 'paid' RETURNING id`,
      [orderId, razorpayPaymentId],
    );
    if (!pay.rowCount) {
      await client.query("COMMIT");
      return false;
    }
    const o = await client.query("UPDATE orders SET status='confirmed' WHERE id=$1 AND status='pending' RETURNING id", [orderId]);
    if (o.rowCount) await client.query(DECREMENT_STOCK, [orderId]);
    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Cash on delivery: the order is accepted now, the payment stays pending until delivery. */
export async function confirmCodOrder(orderId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const o = await client.query("UPDATE orders SET status='confirmed' WHERE id=$1 AND status='pending' RETURNING id", [orderId]);
    if (o.rowCount) await client.query(DECREMENT_STOCK, [orderId]);
    await client.query("COMMIT");
    return Boolean(o.rowCount);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** The customer closed the Razorpay window, or the bank declined. Never overrides a payment that succeeded. */
export async function recordPaymentProblem(orderId: string, kind: "cancelled" | "failed", reason: string | null) {
  await pool.query(
    `UPDATE payments SET status=$2, failure_reason=$3, updated_at=now()
     WHERE order_id=$1 AND provider='razorpay' AND status <> 'paid'`,
    [orderId, kind, reason?.slice(0, 300) ?? null],
  );
}

/**
 * Asks Razorpay directly whether the order was paid (never trusts the browser). Used on the order page,
 * so a customer who paid and then closed the tab still gets a confirmed order even before the webhook arrives.
 */
export async function syncRazorpayOrder(orderId: string) {
  if (!razorpayConfigured()) return;
  const { rows } = await pool.query(
    "SELECT razorpay_order_id, amount_paise, status FROM payments WHERE order_id=$1 AND provider='razorpay'",
    [orderId],
  );
  const p = rows[0];
  if (!p || p.status === "paid" || !p.razorpay_order_id) return;
  try {
    const paid = (await listOrderPayments(p.razorpay_order_id)).find((x) => x.status === "captured" && x.amount === p.amount_paise);
    if (paid) await confirmRazorpayPayment(orderId, paid.id);
  } catch (e) {
    console.error("Razorpay status sync failed", e);
  }
}

/** Admin changes the fulfilment stage. Cash-on-delivery money is recorded as received once delivered. */
export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query("SELECT status FROM orders WHERE id=$1 FOR UPDATE", [orderId]);
    if (!cur.rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("UPDATE orders SET status=$2 WHERE id=$1", [orderId, status]);
    if (status === "delivered") {
      await client.query(
        "UPDATE payments SET status='paid', paid_at=now(), updated_at=now() WHERE order_id=$1 AND provider='cod' AND status='pending'",
        [orderId],
      );
    } else if (status === "cancelled") {
      // stock was taken when the order was confirmed; give it back
      if (["confirmed", "processing"].includes(cur.rows[0].status)) {
        await client.query(
          `UPDATE products p SET stock = p.stock + i.qty FROM order_items i WHERE i.order_id=$1 AND i.product_id=p.id`,
          [orderId],
        );
      }
      await client.query(
        "UPDATE payments SET status='cancelled', updated_at=now() WHERE order_id=$1 AND provider='cod' AND status='pending'",
        [orderId],
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
