import { pool, listProducts, listCategories } from "./db";
import { getActiveOffers } from "./offer";
import { FLAT_SHIPPING, FREE_SHIPPING_ITEM_MAX, FREE_SHIPPING_OVER, formatINR } from "./money";
import { mailConfigured } from "./mail";
import { razorpayConfigured } from "./razorpay";

// Customer-support assistant. It is deliberately NOT a language model: every answer comes from (a) the live product
// catalogue, (b) the shop's real rules (shipping, offers, payment) read from the same code that charges customers,
// (c) the signed-in customer's OWN orders, or (d) the short fixed FAQ below. If none of those can answer, it says so
// and points to the support phone. It never invents policies, prices, dates or availability.

export const SUPPORT_PHONE = "9943200746";

export type ChatLink = { label: string; href: string };
export type ChatReply = {
  text: string;
  links?: ChatLink[];
  chips?: string[];
  /** ask "Was this helpful?" after this answer */
  feedback: boolean;
  /** could not answer: show the Call Support button straight away */
  escalate?: boolean;
};

const STOP = new Set("a an the is are do you have has i me my we our your for of to in on at it its this that with and or any can could would please tell about what which how much does there price cost rs rupees rupee inr show want need get buy available availability stock".split(" "));
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9₹ ]+/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => norm(s).split(" ").filter((t) => t && !STOP.has(t));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** whole-word / whole-phrase match on the normalised question */
const has = (q: string, words: string[]) => words.some((w) => new RegExp(`(^| )${esc(w)}( |$)`).test(q));
const stem = (t: string) => t.replace(/(ies)$/, "y").replace(/(es|s)$/, "");

const freeShippingText = `Shipping is FREE for any product priced ${formatINR(FREE_SHIPPING_ITEM_MAX)} or below, and for the ₹1/₹2 first-order offer units. For a cart with anything priced above ${formatINR(FREE_SHIPPING_ITEM_MAX)}, shipping is ${formatINR(FLAT_SHIPPING)}, and free when the order comes to ${formatINR(FREE_SHIPPING_OVER)} or more.`;

const unknown = (): ChatReply => ({
  text: `I'm sorry, I don't have a confirmed answer to that. I only answer from this shop's real information, so I won't guess. Our support team can help you directly.`,
  feedback: false,
  escalate: true,
  chips: ["Shipping", "Offers", "Payment", "Track my order"],
});

type Ctx = { userId: string | null };

export async function answerChat(raw: string, ctx: Ctx): Promise<ChatReply> {
  const q = norm(raw);
  if (!q) return { text: "Please type your question.", feedback: false };

  // ---- greetings / thanks
  if (/^(hi|hii|hello|hey|namaste|vanakkam|good (morning|afternoon|evening))\b/.test(q) && q.split(" ").length <= 4) {
    return { text: "Hi 👋 Welcome to JillJill Crafts. How can I help you today?", feedback: false, chips: ["Products", "Offers", "Shipping", "Payment", "Track my order"] };
  }
  if (/^(thanks|thank you|thx|ok thanks|great|nice)\b/.test(q) && q.split(" ").length <= 4) return { text: "You're welcome! Anything else I can help with?", feedback: false };

  // ---- talk to a person
  if (has(q, ["human", "agent", "person", "speak to", "talk to", "call", "phone", "contact", "support", "helpline", "customer care", "complaint", "complain"])) {
    return { text: `You can reach our support team by phone on ${SUPPORT_PHONE}. Tap the button below to call (it only dials when you tap it).`, feedback: false, escalate: true };
  }

  // ---- order status (the customer's OWN orders only)
  const hexInQ = /\b[0-9a-f]{8}\b/i.test(raw);
  if (/\border(s)?\b/.test(q) && (hexInQ || has(q, ["status", "track", "tracking", "where", "my", "delivered", "dispatched", "shipped", "id", "number", "placed"])) && !has(q, ["how to order", "how do i order", "how can i order"])) {
    if (!ctx.userId) {
      return { text: "To see your orders, please sign in first. Then ask me again, or open My Orders.", links: [{ label: "Sign in", href: "/login?next=/account" }], feedback: true };
    }
    const hex = (raw.match(/[0-9a-f]{8}(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?/i) ?? [])[0]?.toLowerCase();
    const { rows } = await pool.query(
      `SELECT o.id, o.status, o.total_paise, o.created_at, pay.status AS pay_status
         FROM orders o LEFT JOIN payments pay ON pay.order_id=o.id
        WHERE o.user_id=$1 AND ($2::text IS NULL OR o.id::text LIKE $2 || '%')
        ORDER BY o.created_at DESC LIMIT 3`,
      [ctx.userId, hex ?? null],
    );
    if (!rows.length) {
      return { text: hex ? "I couldn't find an order with that number on your account." : "You don't have any orders yet.", links: [{ label: "Browse the shop", href: "/shop" }], feedback: true };
    }
    const lines = rows.map((o) => `#${o.id.slice(0, 8)} · ${new Date(o.created_at).toLocaleDateString("en-IN")} · ${formatINR(o.total_paise)} · order ${o.status}, payment ${o.pay_status ?? "unknown"}`);
    return {
      text: `Here ${rows.length === 1 ? "is your order" : "are your latest orders"}:\n${lines.join("\n")}\nOpen My Orders for full details.`,
      links: [{ label: "My Orders", href: "/account" }],
      feedback: true,
    };
  }

  // ---- offers / promotions / coupons
  if (has(q, ["offer", "offers", "discount", "discounts", "coupon", "coupons", "promo", "promos", "promotion", "first order", "₹1", "rs 1", "rs1", "one rupee", "₹2", "rs 2", "two rupee", "deal", "deals", "sale"])) {
    const offers = await getActiveOffers();
    if (!offers.length) return { text: "There is no first-order offer running right now. We don't use coupon codes.", feedback: true };
    const list = offers.map((o) => `• ${o.name}: normal ${formatINR(o.normalPaise)}, first-order price ${formatINR(o.offerPaise)}`).join("\n");
    return {
      text: `First-order offer: ${list}\nRules: sign in and use it on your FIRST order. Only one unit of each promotional product gets the promo price (extra units and other products are normal price). It's once per customer and phone number, applies when you pay online, and the promo items ship FREE. A failed payment attempt may use up the offer; if your eligible order is cancelled, the offer is restored. We don't use coupon codes.`,
      links: offers.map((o) => ({ label: o.name, href: `/product/${o.slug}` })),
      feedback: true,
    };
  }

  // ---- payment
  if (has(q, ["payment", "payments", "pay", "paying", "paid", "razorpay", "upi", "card", "cards", "netbanking", "net banking", "cod", "cash on delivery", "wallet", "wallets", "deducted", "debited", "transaction", "failed", "gpay", "phonepe"])) {
    const online = razorpayConfigured();
    const base = online
      ? "You can pay online with Razorpay (UPI, cards, netbanking and wallets) or choose Cash on Delivery. We never see or store your card or UPI details; Razorpay handles them."
      : "Online payment is temporarily unavailable right now, but Cash on Delivery works.";
    const extra = has(q, ["failed", "deducted", "debited", "money", "stuck", "pending", "declined"])
      ? " If a payment failed or is still pending, open My Orders: the page re-checks with Razorpay by itself. If money was debited and your order still isn't confirmed after a few minutes, please call our support team."
      : "";
    return { text: base + extra + " (The ₹1/₹2 first-order prices apply only to online payment.)", feedback: true, links: extra ? [{ label: "My Orders", href: "/account" }] : undefined };
  }

  // ---- shipping / delivery
  if (has(q, ["shipping", "delivery charge", "delivery charges", "free shipping", "courier", "postage", "ship", "shipped"]) && !has(q, ["how long", "when will", "days"])) {
    return { text: freeShippingText, feedback: true };
  }
  if (has(q, ["how long", "delivery time", "delivery date", "days", "when will", "arrive", "dispatch time", "how many days"])) {
    return { text: "Our site says orders are packed and shipped in 2–5 days. Each piece is handmade, so for an exact delivery date for a particular item please call our support team.", feedback: true, links: [{ label: "Call support", href: `tel:${SUPPORT_PHONE}` }] };
  }

  // ---- returns / refunds / cancellation (no published policy: do not invent one)
  if (has(q, ["return", "returns", "refund", "refunds", "exchange", "cancel", "cancellation", "replace", "replacement", "damaged", "wrong item", "money back"])) {
    return { text: "I don't have a published return, refund or cancellation policy to quote, and I won't guess one. Please speak to our support team about your order.", feedback: false, escalate: true };
  }

  // ---- account help
  if (has(q, ["forgot", "reset password", "password", "passwords"])) {
    return mailConfigured()
      ? { text: "Open Sign in and choose “Forgot your password?”. Enter your email and we'll send a link (valid for one hour) to choose a new password. Signed in already? You can change it under My Account → Profile.", links: [{ label: "Forgot password", href: "/forgot-password" }], feedback: true }
      : { text: "Password reset by email isn't set up on this shop yet. If you're signed in you can change your password under My Account → Profile; otherwise please call our support team.", links: [{ label: "My Account", href: "/account/profile" }], feedback: true, escalate: true };
  }
  if (has(q, ["sign up", "signup", "register", "registration", "create account", "new account", "login", "log in", "sign in", "signin", "account"])) {
    return { text: "To order you need a free account: choose Create account, then enter your name, email, phone number and a password (8+ characters). After you sign up you're signed in automatically and taken to the shop. Your orders, profile and saved addresses are under My Account.", links: [{ label: "Create account", href: "/login?mode=register" }, { label: "Sign in", href: "/login" }], feedback: true };
  }

  // ---- custom orders
  if (has(q, ["custom", "customised", "customized", "personalised", "personalized", "made to order", "special request"])) {
    return { text: "Yes, we take custom orders: tell us your idea and we'll send a quote and sketch within 24 hours (as stated on our home page).", links: [{ label: "Custom orders", href: "/#custom" }], feedback: true };
  }

  // ---- privacy
  if (has(q, ["privacy", "my data", "personal data", "cookies", "terms"])) {
    return { text: "You can read how we handle your information in our Privacy Policy.", links: [{ label: "Privacy Policy", href: "/privacy-policy" }], feedback: true };
  }

  // ---- products (live catalogue)
  const [products, categories] = await Promise.all([listProducts({}), listCategories()]);
  const qt = tokens(raw).map(stem);

  // category browsing
  const cat = categories.find((c) => has(q, [c.slug, c.slug.replace(/s$/, ""), c.name.toLowerCase(), c.name.toLowerCase().replace(/s$/, "")]));
  const nameHits = products
    .map((p) => {
      const pt = new Set(tokens(`${p.name} ${p.tagline} ${p.category_name ?? ""}`).map(stem));
      const nameT = new Set(tokens(p.name).map(stem));
      const score = qt.reduce((n, t) => n + (nameT.has(t) ? 3 : pt.has(t) ? 1 : 0), 0);
      return { p, score, nameScore: qt.filter((t) => nameT.has(t)).length };
    })
    .filter((x) => x.nameScore > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const stockText = (s: number) => (s === 0 ? "sold out" : s <= 5 ? `only ${s} left` : "in stock");
  const shipText = (price: number) => (price <= FREE_SHIPPING_ITEM_MAX ? "FREE shipping" : `shipping ${formatINR(FLAT_SHIPPING)} (free on orders of ${formatINR(FREE_SHIPPING_OVER)}+)`);
  const line = (p: (typeof products)[number]) => `• ${p.name} — ${formatINR(p.price_paise)}, ${stockText(p.stock)}, ${shipText(p.price_paise)}`;

  const catFirst = cat && qt.length <= 2 && qt.every((t) => tokens(`${cat.name} ${cat.slug}`).map(stem).includes(t));
  if (nameHits.length && !catFirst) {
    return { text: `Here's what I found:\n${nameHits.map((h) => line(h.p)).join("\n")}`, links: nameHits.map((h) => ({ label: h.p.name, href: `/product/${h.p.slug}` })), feedback: true };
  }
  if (cat) {
    const list = products.filter((p) => p.category_slug === cat.slug).slice(0, 6);
    if (list.length) return { text: `${cat.name}: ${cat.blurb}\n${list.map(line).join("\n")}`, links: [{ label: `See all ${cat.name}`, href: `/shop?category=${cat.slug}` }], feedback: true };
  }
  if (has(q, ["cheap", "cheapest", "lowest", "budget", "under", "below", "less than", "affordable"])) {
    const cheap = [...products].filter((p) => p.stock > 0).sort((a, b) => a.price_paise - b.price_paise).slice(0, 5);
    return { text: `Our lowest-priced items right now (all ship free up to ${formatINR(FREE_SHIPPING_ITEM_MAX)}):\n${cheap.map(line).join("\n")}`, links: [{ label: "Browse the shop", href: "/shop?sort=price-asc" }], feedback: true };
  }
  if (has(q, ["product", "products", "what do you sell", "catalog", "catalogue", "collection", "collections", "crochet", "items", "shop", "gift", "gifts"])) {
    return { text: `We sell handmade crochet: ${categories.map((c) => c.name).join(", ")}. We have ${products.length} products from ${formatINR(Math.min(...products.map((p) => p.price_paise)))} to ${formatINR(Math.max(...products.map((p) => p.price_paise)))}. Ask me about a specific item (for example “price of the teddy bear”) or a category.`, links: [{ label: "Browse the shop", href: "/shop" }], feedback: true, chips: categories.map((c) => c.name) };
  }

  return unknown();
}
