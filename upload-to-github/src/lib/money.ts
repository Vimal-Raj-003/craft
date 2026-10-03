export const formatINR = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export const FREE_SHIPPING_OVER = 99900; // paise
export const FLAT_SHIPPING = 7900; // paise

export const shippingFor = (subtotalPaise: number) =>
  subtotalPaise === 0 || subtotalPaise >= FREE_SHIPPING_OVER ? 0 : FLAT_SHIPPING;
