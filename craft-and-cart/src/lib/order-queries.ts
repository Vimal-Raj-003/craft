import { pool } from "./db";

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export type OrderDetail = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  address: { line1: string; city: string; state: string; pincode: string };
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  discount_paise: number;
  offer_status: string | null;
  promo_product_id: number | null;
  status: string;
  payment_method: "online" | "cod";
  created_at: Date;
  payment_status: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: Date | null;
  failure_reason: string | null;
  items: { name: string; color: string | null; qty: number; price_paise: number; promo: boolean; normal_price_paise: number | null; free_shipping: boolean | null }[];
};

/**
 * One order with its items and payment. Pass `ownerId` for customers: the order is only returned if it
 * belongs to that user, so guessing another order's id returns nothing. Omit it only for Super Admin pages.
 */
export async function getOrderDetail(id: string, ownerId?: string): Promise<OrderDetail | null> {
  if (!isUuid(id)) return null;
  const { rows } = await pool.query(
    `SELECT o.id,o.user_id,o.name,o.email,o.phone,o.address,o.subtotal_paise,o.shipping_paise,o.total_paise,o.discount_paise,o.offer_status,o.promo_product_id,o.status,o.payment_method,o.created_at,
            pay.status AS payment_status, pay.razorpay_order_id, pay.razorpay_payment_id, pay.paid_at, pay.failure_reason
       FROM orders o LEFT JOIN payments pay ON pay.order_id=o.id
      WHERE o.id=$1 AND ($2::uuid IS NULL OR o.user_id=$2::uuid)`,
    [id, ownerId ?? null],
  );
  if (!rows[0]) return null;
  const { rows: items } = await pool.query(
    "SELECT name,color,qty,price_paise,promo,normal_price_paise,free_shipping FROM order_items WHERE order_id=$1 ORDER BY id",
    [id],
  );
  return { ...rows[0], items };
}
