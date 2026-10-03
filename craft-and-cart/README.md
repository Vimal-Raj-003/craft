# Craft & Cart

Animated, dynamic crochet e-commerce store. Next.js 16 · TypeScript · Tailwind v4 · GSAP · Lenis · Motion · React Three Fiber · PostgreSQL · Razorpay.

## Run it (two terminals)

```bash
npm run db:start   # local PostgreSQL (port 54329) — keep running
npm run db:seed    # once: creates tables, products, admin user
npm run dev        # http://localhost:3000
```

Admin login: `admin@craftandcart.local` / `admin12345` (change in `.env.local` before seeding).

## Payments: PhonePe (online) or Cash on Delivery

Customers choose at checkout. "Pay online" uses **PhonePe Payment Gateway** (UPI / PhonePe wallet / cards / netbanking; opens the PhonePe app on phones).

1. Register a merchant account at https://business.phonepe.com and get your Client ID, Client Secret and Client Version (Developer settings).
2. Put them in `.env.local`:

```
PHONEPE_ENV=sandbox            # switch to production when you go live
PHONEPE_CLIENT_ID=...
PHONEPE_CLIENT_SECRET=...
PHONEPE_CLIENT_VERSION=1
PHONEPE_WEBHOOK_USER=...       # you choose these; use the same values on the webhook in the PhonePe dashboard
PHONEPE_WEBHOOK_PASS=...
NEXT_PUBLIC_SITE_URL=https://your-domain.com   # where PhonePe sends the customer back to
```

3. Webhook URL: `https://<domain>/api/webhooks/phonepe` (events `checkout.order.completed`, `checkout.order.failed`).

Payment results are never trusted from the browser: after PhonePe returns the customer, and on every webhook, the server asks PhonePe for the order status before marking it paid.
With the keys blank, online payment runs in **demo mode** (simulated, no money moves). Cash on Delivery works either way.
## Using a regular PostgreSQL install instead

Install PostgreSQL, create a database, run `db/schema.sql`, set `DATABASE_URL` in `.env.local`, then `npm run db:seed`.
Skip `npm run db:start`.

## Layout

- `db/schema.sql` — tables · `scripts/` — DB server + seed
- `src/lib/` — db, auth (JWT cookie), Razorpay helpers, cart store
- `src/app/api/` — products, auth, checkout (+verify), webhook, contact, admin
- `src/components/` — Hero3D, YarnThread (scroll-drawn thread), ProductCard (3D tilt), CartDrawer, cursor/smooth scroll in Providers
