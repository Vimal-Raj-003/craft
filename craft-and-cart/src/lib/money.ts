export const formatINR = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export const FREE_SHIPPING_OVER = 99900; // paise: orders of ₹999 or more ship free
export const FLAT_SHIPPING = 7900; // paise
export const FREE_SHIPPING_ITEM_MAX = 30000; // paise: a product priced ₹300 or below ships free

/** The existing rule for an order that has at least one item that is not free-shipping eligible. */
export const shippingFor = (subtotalPaise: number) =>
  subtotalPaise === 0 || subtotalPaise >= FREE_SHIPPING_OVER ? 0 : FLAT_SHIPPING;

/** One unit ships free when its NORMAL price is ₹300 or less, or it is a promotional (₹1 / ₹2) unit the offer is applied to. */
export const isFreeShippingUnit = (normalPaise: number, promoApplied = false) => promoApplied || normalPaise <= FREE_SHIPPING_ITEM_MAX;

/**
 * Display-only version for the browser (cart drawer / checkout fallback): is every unit in the cart free-shipping eligible?
 * `promoProductIds` are the promotional products the offer applies to (ONE unit of each ships free as a promo unit).
 * The server recomputes all of this; the browser's numbers never decide a charge.
 */
export function cartShipsFree(lines: { productId: number; qty: number; pricePaise: number }[], promoProductIds: number[] = []) {
  const qty = new Map<number, { qty: number; price: number }>();
  for (const l of lines) {
    const cur = qty.get(l.productId);
    qty.set(l.productId, { qty: (cur?.qty ?? 0) + l.qty, price: cur?.price ?? l.pricePaise });
  }
  for (const [id, { qty: q, price }] of qty) {
    if (price <= FREE_SHIPPING_ITEM_MAX) continue;
    if (promoProductIds.includes(id) && q <= 1) continue; // the single promo unit ships free
    return false;
  }
  return true;
}
