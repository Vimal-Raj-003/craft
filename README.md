# Craft & Cart — Handmade Crochet Store

A full-stack online store for handmade crochet: bouquets that never wilt, keychains, hair accessories and amigurumi,
wrapped in a South Indian (Pongal) design with smooth animations. Customers can browse, add to cart, and check out with
**PhonePe** (UPI, cards, netbanking) or **Cash on Delivery**; the owner manages orders from an **admin dashboard**.

<table>
  <tr>
    <td width="68%"><img src="craft-and-cart/docs/screenshots/home-desktop.jpg" alt="Home page on a laptop"></td>
    <td width="32%"><img src="craft-and-cart/docs/screenshots/home-mobile.jpg" alt="Home page on a phone"></td>
  </tr>
  <tr>
    <td><img src="craft-and-cart/docs/screenshots/product-desktop.jpg" alt="Product page"></td>
    <td><img src="craft-and-cart/docs/screenshots/shop-mobile.jpg" alt="Shop on a phone"></td>
  </tr>
</table>

> This repository is named **craft**. The website itself is in the [`craft-and-cart/`](craft-and-cart) folder.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Repository layout](#repository-layout)
4. [Run it locally](#run-it-locally)
5. [Environment variables](#environment-variables)
6. [npm scripts](#npm-scripts)
7. [How payments work](#how-payments-work)
8. [Database](#database)
9. [Pages and API routes](#pages-and-api-routes)
10. [Deploy it online](#deploy-it-online)
11. [Security notes](#security-notes)
12. [Known limitations](#known-limitations)
13. [Troubleshooting](#troubleshooting)

---

## Features

**Storefront**
- Home page with an animated hero, collections, bestsellers, festival gifting, a "how it works" story and a custom-order form.
- Shop with category filters, search and price sorting; product pages with photos, colour options and customer reviews.
- Products and prices always come from the database, never from the browser.

**Cart and checkout**
- Cart that remembers items between visits, with a free-shipping progress bar (free over ₹999, otherwise ₹79).
- Checkout with address validation and a choice of **PhonePe** or **Cash on Delivery**.
- Order status page that updates itself while a payment is being confirmed; stock is reduced only when an order is confirmed.

**Accounts and admin**
- Customer sign-up and sign-in (passwords hashed with bcrypt, session in an httpOnly cookie), and an "My orders" page.
- Admin dashboard: revenue, order list with a status dropdown, low-stock warnings, and custom-order requests.
- Newsletter sign-up and custom-order requests are saved in the database.

**Design and experience**
- South Indian Pongal theme: mango-leaf garland, sunrise scene with a boiling Pongal pot, kolam borders and greetings in Tamil, Malayalam, Telugu and Kannada.
- Smooth scrolling, animated product cards, a flying "add to cart" animation and a confetti burst after an order (all respect "reduce motion").
- Fully responsive: hamburger menu on phones, two-column product grids, 44 px tap targets, lighter effects on small screens.

## Tech stack

| Area | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) with React 19 and TypeScript |
| Styling | Tailwind CSS v4 and a custom design system in `globals.css` |
| Animation | GSAP, Lenis (smooth scroll), Motion, hand-drawn SVG scenes |
| State | Zustand (cart, saved in the browser) |
| Database | PostgreSQL through the `pg` driver (plain SQL, no ORM) |
| Auth | `jose` (signed JWT in an httpOnly cookie) and `bcryptjs` |
| Validation | `zod` on every API route |
| Payments | PhonePe Payment Gateway (Standard Checkout v2) and Cash on Delivery |
| Hosting | Render (see `render.yaml`); a Railway guide is in `craft-and-cart/DEPLOY.md` |

## Repository layout

```
craft/
├── README.md                 ← you are here
├── render.yaml               ← one-click deploy to Render (website + database)
├── craft-and-cart/           ← THE WEBSITE
│   ├── src/app/              pages and API routes (shop, product, checkout, order, admin, ...)
│   ├── src/components/       UI: navbar, hero, scenes, product cards, cart drawer, ...
│   ├── src/lib/              database, auth, cart, money, orders and PhonePe helpers
│   ├── db/schema.sql         database tables
│   ├── scripts/              local database server and the seed script
│   ├── public/               product photos and images
│   ├── docs/screenshots/     screenshots used in this README
│   ├── .env.example          every setting the site understands (copy to .env.local)
│   └── DEPLOY.md             alternative deployment guide (Railway)
├── crochet_website/          an early Flask test (not used by the store)
└── template/                 an early HTML test page (not used by the store)
```

## Run it locally

**You need:** [Node.js](https://nodejs.org) 20.9 or newer (developed on Node 24) and npm. You do **not** need to install
PostgreSQL: the project can start its own copy.

```bash
git clone https://github.com/Vimal-Raj-003/craft.git
cd craft/craft-and-cart

npm install

# 1. create your settings file
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local

# 2. start the built-in PostgreSQL (leave this running in its own terminal)
npm run db:start

# 3. in a second terminal: create the tables, products and the admin account
npm run db:seed

# 4. start the website
npm run dev
```

Open **http://localhost:3000**.

The seed script creates 17 sample products across four collections and one admin account. For local use the admin login
is `admin@craftandcart.local` with the demo password `admin12345`, or whatever you put in `ADMIN_PASSWORD`.
**Never use the demo password on a public site** (the seed script refuses to create a weak admin for an online database).

Prefer your own PostgreSQL? Create a database, run `db/schema.sql` in it, set `DATABASE_URL` in `.env.local`, run
`npm run db:seed`, and skip `npm run db:start`.

## Environment variables

Copy [`craft-and-cart/.env.example`](craft-and-cart/.env.example) to `.env.local`. It is never committed.

| Variable | Needed | What it does |
|---|---|---|
| `DATABASE_URL` | always | PostgreSQL connection string. Local default is the built-in database. |
| `DATABASE_SSL` | if your host requires it | `true` to connect over SSL. |
| `JWT_SECRET` | **required in production** | Signs login cookies. Use a long random string. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | when seeding | The admin account. The password is **required** (10+ characters) for an online database. |
| `NEXT_PUBLIC_SITE_URL` | for PhonePe | Your public address; PhonePe returns customers here. |
| `PHONEPE_ENV` | for PhonePe | `sandbox` for testing, `production` when live. |
| `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION` | for PhonePe | Credentials from the PhonePe merchant dashboard. |
| `PHONEPE_WEBHOOK_USER` / `PHONEPE_WEBHOOK_PASS` | for PhonePe | Credentials PhonePe uses to prove a webhook is genuine; you choose them. |

## npm scripts

Run these inside `craft-and-cart/`.

| Command | What it does |
|---|---|
| `npm run dev` | Start the website in development mode with live reload. |
| `npm run build` / `npm start` | Build and run the production version. |
| `npm run lint` | Check the code style. |
| `npm run db:start` | Start the built-in local PostgreSQL (port 54329, data in `.pgdata/`). |
| `npm run db:seed` | Create tables and sample data for local development (reads `.env.local`). |
| `npm run db:setup` | Same, for a hosted database (reads settings from the environment). Safe to repeat. |

## How payments work

At checkout the customer chooses:

- **Cash on Delivery:** the order is confirmed immediately with status `confirmed`.
- **PhonePe:** the server creates a PhonePe order and sends the customer to PhonePe (the PhonePe app opens on phones).
  When they come back, and again when PhonePe calls the webhook, the **server asks PhonePe for the real status** before
  marking the order `paid`. The browser is never trusted for the result.

**Setting up PhonePe:** create a merchant account at <https://business.phonepe.com>, copy the Client ID, Client Secret and
Client Version into `.env.local`, and set the webhook to `https://<your-site>/api/webhooks/phonepe` with the events
`checkout.order.completed` and `checkout.order.failed`.

**Without PhonePe keys**
- On your own computer, "Pay online" runs in a **demo mode** that simulates a successful payment (no money moves).
- On a live site (`NODE_ENV=production`), "Pay online" is **switched off** with a clear message and only Cash on Delivery
  works. Fake payments can never be created online.

## Database

Tables are defined in [`db/schema.sql`](craft-and-cart/db/schema.sql): `users`, `categories`, `products`, `orders`,
`order_items`, `reviews`, `custom_requests` and `newsletter`. Prices are stored in paise (integers), orders keep a copy of
each item's name and price, and the schema is safe to run repeatedly.

The seed script ([`scripts/seed.ts`](craft-and-cart/scripts/seed.ts)) defines the catalogue. To change products, edit it and
run the seed command again. On an online database it never resets your stock numbers and adds no sample reviews.

## Pages and API routes

| Page | Purpose |
|---|---|
| `/` | Home |
| `/shop`, `/product/[slug]` | Browse and view products |
| `/checkout`, `/order/[id]` | Checkout and order status |
| `/login`, `/account` | Sign in, order history |
| `/admin` | Admin dashboard (admin accounts only) |

| API route | Purpose |
|---|---|
| `GET /api/products` | Product list (filters: `category`, `q`, `sort`, `featured`) |
| `POST /api/auth/[register\|login\|logout]`, `GET /api/auth/me` | Accounts and sessions |
| `POST /api/checkout`, `POST /api/checkout/verify` | Create an order; demo-payment confirmation (local only) |
| `POST /api/webhooks/phonepe` | PhonePe payment notifications (signature-checked) |
| `POST /api/contact/[newsletter\|custom]` | Newsletter and custom-order requests |
| `GET/PATCH /api/admin/orders` | Admin order list and status changes (admin only) |

## Deploy it online

### Render (website and database together)

The file [`render.yaml`](render.yaml) describes everything Render needs.

1. Push this repository to GitHub (already done if you are reading this there).
2. Go to <https://dashboard.render.com/blueprint/new?repo=https://github.com/Vimal-Raj-003/craft> and log in with GitHub.
3. When asked, enter an **`ADMIN_PASSWORD`** (10+ characters, typed only into Render). The session secret is generated for you.
4. Click **Apply**. Render builds the site and creates the PostgreSQL database (about 5–8 minutes). On every start the site
   creates or updates the tables and products, then runs.
5. Open the `.onrender.com` address Render gives you. Then add your PhonePe variables (see above) and set
   `NEXT_PUBLIC_SITE_URL` to that address.

Notes: Render's free plan puts the site to sleep after about 15 minutes without visitors (the first visit takes ~30 seconds
to wake it) and its free database is temporary. Choose paid plans before you take real orders.

### Railway or another host

[`craft-and-cart/DEPLOY.md`](craft-and-cart/DEPLOY.md) has a step-by-step Railway guide. Any host that can run Node.js 20+
and PostgreSQL works: set the environment variables above, build with `npm run build`, start with `npm start`, and run
`npm run db:setup` once against the online database.

## Security notes

- No passwords, keys or `.env` files are stored in this repository; `.gitignore` also excludes `venv`, caches and the local database.
- Every API input is validated with `zod`; every database query is parameterised.
- Passwords are hashed with bcrypt; sessions are signed, httpOnly cookies. The site refuses to start sessions in production without `JWT_SECRET`.
- Order totals, prices and stock are always calculated on the server.
- Payment results come only from PhonePe's status API, and webhooks must carry the correct signature.
- Admin pages and the admin API check the user's role on every request.

## Known limitations

- Some products still show an illustrated placeholder instead of a photo; add images in `public/products/` and set `image_url` in the seed.
- Product names, prices and descriptions in the seed are sample content. Replace them with your real catalogue.
- Line items such as "100% handmade" and "4.9★ customer love" on the home page are fixed text, not live data.
- Customers cannot write reviews yet; reviews are read-only.
- There is no email or SMS notification yet; new orders appear in the admin dashboard.
- There is no in-app product editor yet; products are managed through the seed script.

## Troubleshooting

| Problem | Fix |
|---|---|
| `connect ECONNREFUSED` / the site shows no products | The database is not running: start it with `npm run db:start`, then `npm run db:seed`. |
| Port 3000 or 54329 is already in use | Stop the other program, or run `npm run dev -- -p 3100` (and set `PGPORT` for the database). |
| "JWT_SECRET must be set in production" | Add a `JWT_SECRET` environment variable on your host. |
| "Online payment isn't available yet" on the live site | Add the `PHONEPE_*` variables; until then only Cash on Delivery works. |
| Seeding an online database refuses to run | Set `ADMIN_PASSWORD` (10+ characters) in the environment first. |
| `npm run db:start` fails on first run | Delete the `.pgdata/` folder and run it again to recreate the local database. |

---

Made with love and a lot of yarn.
