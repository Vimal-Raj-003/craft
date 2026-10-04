import type { Pool, PoolClient } from "pg";
import { pool } from "./db";
import { shippingFor } from "./money";

// "First order promotional products": up to TWO selected products (slot 1 = the ₹1 product, slot 2 = the ₹2 product).
// In a signed-in customer's FIRST order, ONE unit of each promotional product costs its promo price; every other unit
// and every other product stays at normal price. Everything here runs on the server; the browser never decides a price.

export type Q = Pool | PoolClient;
const run = (q: Q, text: string, params?: unknown[]) => (q as Pool).query(text, params);

export type ActiveOffer = {
  offerId: number;
  slot: number;
  productId: number;
  slug: string;
  name: string;
  image_url: string | null;
  emoji: string;
  hue_a: string;
  hue_b: string;
  colors: string[];
  normalPaise: number;
  offerPaise: number;
  stock: number;
};

/** The active promotional products (each must be an active, in-stock product priced above its promo price), by slot. */
export async function getActiveOffers(q: Q = pool): Promise<ActiveOffer[]> {
  const { rows } = await run(
    q,
    `SELECT o.id AS "offerId", o.slot, p.id AS "productId", p.slug, p.name, p.image_url, p.emoji, p.hue_a, p.hue_b, p.colors,
            p.price_paise AS "normalPaise", o.offer_price_paise AS "offerPaise", p.stock
       FROM first_order_offer o JOIN products p ON p.id = o.product_id
      WHERE o.active AND p.active AND p.stock >= 1 AND p.price_paise > o.offer_price_paise
      ORDER BY o.slot`,
  );
  return rows as ActiveOffer[];
}

/** Last 10 digits of a phone number, used to allow one offer per phone. */
export const phoneKey = (raw: string | null | undefined) => {
  const d = (raw ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
};

export type Reason = "guest" | "used" | "failed" | "previous_order" | "phone" | "online_only" | "not_in_cart" | "no_offer";
export type Eligibility = { eligible: boolean; reason: Reason | null; heldOrderId: string | null };

/**
 * Is this signed-in customer allowed the first-order offer right now?
 *  - not already used / spent by a failed payment (a cancelled order restores it)
 *  - FIRST order only: no earlier confirmed/processing/shipped/delivered order
 *  - none of their phone numbers (account + delivery) belongs to another customer's active claim
 * One claim covers the whole first order, i.e. both promotional products together.
 */
export async function checkEligibility(q: Q, userId: string, deliveryPhone?: string | null): Promise<Eligibility> {
  const { rows: claim } = await run(q, "SELECT status, order_id FROM offer_claims WHERE user_id=$1", [userId]);
  const c = claim[0] as { status: string; order_id: string | null } | undefined;
  if (c?.status === "used") return { eligible: false, reason: "used", heldOrderId: null };
  if (c?.status === "failed") return { eligible: false, reason: "failed", heldOrderId: null };

  const { rowCount } = await run(
    q,
    "SELECT 1 FROM orders WHERE user_id=$1 AND status IN ('confirmed','processing','shipped','delivered') LIMIT 1",
    [userId],
  );
  if (rowCount) return { eligible: false, reason: "previous_order", heldOrderId: null };

  const { rows: u } = await run(q, "SELECT phone FROM users WHERE id=$1", [userId]);
  const keys = [...new Set([phoneKey(u[0]?.phone as string | undefined), phoneKey(deliveryPhone)].filter(Boolean))] as string[];
  if (keys.length) {
    const clash = await run(
      q,
      "SELECT 1 FROM offer_claims WHERE user_id <> $1 AND phone_key = ANY($2) AND status IN ('held','used','failed') LIMIT 1",
      [userId, keys],
    );
    if (clash.rowCount) return { eligible: false, reason: "phone", heldOrderId: null };
  }
  return { eligible: true, reason: null, heldOrderId: c?.status === "held" ? c.order_id : null };
}

// ---------------------------------------------------------------------------------------------------------------
// Pricing

export type QuoteItem = { productId: number; qty: number; color?: string };
export type PricedLine = { productId: number; name: string; color: string | null; qty: number; unitPaise: number; normalPaise: number; promo: boolean };
export type ProductRow = { id: number; name: string; price_paise: number; stock: number };

export type OfferInfo = {
  products: { id: number; slot: number; slug: string; name: string; image_url: string | null; normalPaise: number; offerPaise: number; applied: boolean }[];
  eligible: boolean;
  applied: boolean; // at least one promotional price was applied
  reason: Reason | null;
};

export type Quote =
  | { ok: false; error: string; status: number }
  | {
      ok: true;
      lines: PricedLine[];
      products: Map<number, ProductRow>;
      subtotal: number; // normal prices
      discount: number; // total of all promotional discounts
      shipping: number; // existing rule, applied to what is actually charged for the items
      total: number;
      promos: ActiveOffer[]; // the promotional products whose price was applied
      offer: OfferInfo;
      eligibility: Eligibility;
    };

/**
 * Splits the cart into priced lines. For each promotional product in the cart only ONE unit gets the promo price;
 * every other unit and every other item is normal price.
 */
export function priceItems(items: QuoteItem[], byId: Map<number, ProductRow>, promos: ActiveOffer[]) {
  const lines: PricedLine[] = [];
  let subtotal = 0;
  let discount = 0;
  const used = new Set<number>();
  for (const it of items) {
    const p = byId.get(it.productId)!;
    subtotal += p.price_paise * it.qty;
    const promo = promos.find((o) => o.productId === it.productId);
    if (promo && !used.has(promo.productId)) {
      used.add(promo.productId);
      lines.push({ productId: p.id, name: p.name, color: it.color ?? null, qty: 1, unitPaise: promo.offerPaise, normalPaise: p.price_paise, promo: true });
      discount += p.price_paise - promo.offerPaise;
      if (it.qty > 1) lines.push({ productId: p.id, name: p.name, color: it.color ?? null, qty: it.qty - 1, unitPaise: p.price_paise, normalPaise: p.price_paise, promo: false });
    } else {
      lines.push({ productId: p.id, name: p.name, color: it.color ?? null, qty: it.qty, unitPaise: p.price_paise, normalPaise: p.price_paise, promo: false });
    }
  }
  return { lines, subtotal, discount };
}

/**
 * The one place that decides what a cart costs. Used by the checkout page (display) and the checkout API (the real order).
 * `userId` null = guest (never gets the offer).
 */
export async function computeQuote(
  q: Q,
  opts: { userId: string | null; method: "online" | "cod"; items: QuoteItem[]; phone?: string | null },
): Promise<Quote> {
  const ids = [...new Set(opts.items.map((i) => i.productId))];
  const { rows } = await run(q, "SELECT id,name,price_paise,stock FROM products WHERE id = ANY($1) AND active", [ids]);
  const byId = new Map((rows as ProductRow[]).map((p) => [p.id, p]));
  const wanted = new Map<number, number>();
  for (const it of opts.items) wanted.set(it.productId, (wanted.get(it.productId) ?? 0) + it.qty);
  for (const it of opts.items) {
    const p = byId.get(it.productId);
    if (!p) return { ok: false, error: "A product in your cart is no longer available", status: 400 };
    if (p.stock < (wanted.get(it.productId) ?? it.qty)) return { ok: false, error: `Only ${p.stock} left of ${p.name}`, status: 409 };
  }

  const offers = await getActiveOffers(q);
  let eligibility: Eligibility = { eligible: false, reason: offers.length ? "guest" : "no_offer", heldOrderId: null };
  if (offers.length && opts.userId) eligibility = await checkEligibility(q, opts.userId, opts.phone);

  const inCart = offers.filter((o) => opts.items.some((i) => i.productId === o.productId));
  let reason: Reason | null = eligibility.reason;
  let promos: ActiveOffer[] = [];
  if (offers.length && opts.userId && eligibility.eligible) {
    if (opts.method !== "online") reason = "online_only";
    else if (!inCart.length) reason = "not_in_cart";
    else promos = inCart;
  }

  const { lines, subtotal, discount } = priceItems(opts.items, byId, promos);
  const shipping = shippingFor(subtotal - discount);
  return {
    ok: true,
    lines,
    products: byId,
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
    promos,
    offer: {
      products: offers.map((o) => ({
        id: o.productId, slot: o.slot, slug: o.slug, name: o.name, image_url: o.image_url,
        normalPaise: o.normalPaise, offerPaise: o.offerPaise, applied: promos.some((p) => p.productId === o.productId),
      })),
      eligible: eligibility.eligible,
      applied: promos.length > 0,
      reason,
    },
    eligibility,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Offer state changes. Each is idempotent and only touches the claim that is tied to THIS order.

const event = (q: Q, userId: string | null, orderId: string | null, name: string, detail?: string) =>
  run(q, "INSERT INTO offer_events(user_id,order_id,event,detail) VALUES($1,$2,$3,$4)", [userId, orderId, name, detail ?? null]);

/** Checkout created an online order at promotional prices: the customer's first-order offer is now held for that order. */
export async function holdOffer(client: PoolClient, userId: string, orderId: string, deliveryPhone: string) {
  const key = phoneKey(deliveryPhone);
  const { rows } = await run(client, "SELECT status, order_id FROM offer_claims WHERE user_id=$1 FOR UPDATE", [userId]);
  const old = rows[0] as { status: string; order_id: string | null } | undefined;

  if (old?.status === "held" && old.order_id && old.order_id !== orderId) {
    // The customer changed the cart: the earlier unpaid offer order is replaced by this one.
    await run(client, "UPDATE orders SET status='cancelled', offer_status='released' WHERE id=$1 AND status='pending'", [old.order_id]);
    await run(client, "UPDATE payments SET status='cancelled', updated_at=now() WHERE order_id=$1 AND status IN ('pending','failed')", [old.order_id]);
    await event(client, userId, old.order_id, "replaced", "cart changed before payment; unpaid order cancelled");
  }
  if (old) {
    await run(client, "UPDATE offer_claims SET status='held', order_id=$2, phone_key=$3, updated_at=now() WHERE user_id=$1", [userId, orderId, key]);
  } else {
    await run(client, "INSERT INTO offer_claims(user_id,status,order_id,phone_key) VALUES($1,'held',$2,$3)", [userId, orderId, key]);
  }
  await run(client, "UPDATE orders SET offer_status='held' WHERE id=$1", [orderId]);
  await event(client, userId, orderId, "held");
}

/** Payment verified by the server: the offer is USED. */
export async function markOfferUsed(q: Q, orderId: string) {
  const { rows } = await run(
    q,
    "UPDATE offer_claims SET status='used', updated_at=now() WHERE order_id=$1 AND status IN ('held','failed') RETURNING user_id",
    [orderId],
  );
  if (rows[0]) {
    await run(q, "UPDATE orders SET offer_status='used' WHERE id=$1", [orderId]);
    await event(q, rows[0].user_id as string, orderId, "used", "payment verified");
  }
}

/** Razorpay reported a genuine failed payment attempt (verified server-side): per the business rule the offer is spent. */
export async function consumeOfferOnFailure(q: Q, orderId: string) {
  const { rows } = await run(
    q,
    "UPDATE offer_claims SET status='failed', updated_at=now() WHERE order_id=$1 AND status='held' RETURNING user_id",
    [orderId],
  );
  if (rows[0]) {
    await run(q, "UPDATE orders SET offer_status='failed' WHERE id=$1", [orderId]);
    await event(q, rows[0].user_id as string, orderId, "failed", "Razorpay reported a failed payment attempt");
  }
}

/** The order really became CANCELLED: give the offer back, once. A second call finds nothing to restore. */
export async function restoreOfferForOrder(q: Q, orderId: string) {
  const { rows } = await run(
    q,
    `UPDATE offer_claims SET status='restored', order_id=NULL, phone_key=NULL, updated_at=now()
      WHERE order_id=$1 AND status IN ('held','used','failed') RETURNING user_id`,
    [orderId],
  );
  if (rows[0]) {
    await run(q, "UPDATE orders SET offer_status='restored' WHERE id=$1", [orderId]);
    await event(q, rows[0].user_id as string, orderId, "restored", "order cancelled");
  }
}
