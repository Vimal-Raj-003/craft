# Putting Craft & Cart online (Railway: website + PostgreSQL together)

You end up with a public link like `https://craft-and-cart.up.railway.app` that anyone can open.
Railway is paid after its trial credit, so check https://railway.com/pricing. Render (render.com) works the same way.

## What you need
- A Railway account (https://railway.com, sign in with GitHub or email)
- Node.js on this PC (already installed)

## Steps

### 1. Install the Railway tool and log in (once)
Open PowerShell in this folder (`craft-and-cart`):
```
npm install -g @railway/cli
railway login
```
A browser tab opens; approve it.

### 2. Create the project and the database
```
railway init            # name it e.g. craft-and-cart
railway add --database postgres
```

### 3. Create the website service and set its settings
In the Railway dashboard, open the project:
1. Click **New → Empty Service**, name it `web`.
2. Open `web` → **Variables** and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway fills this in from the database) |
| `DATABASE_SSL` | `false` for Railway's internal address (set `true` on hosts that require SSL, e.g. Render) |
| `JWT_SECRET` | a long random string, 40+ characters (keep it secret and never change it casually) |
| `NEXT_PUBLIC_SITE_URL` | your final link, e.g. `https://craft-and-cart.up.railway.app` (fill in after step 5) |

Add the `PHONEPE_*` variables later, when you have PhonePe credentials (see README.md).

### 4. Upload and deploy the website
```
railway link            # choose the project, then the `web` service
railway up
```
Railway builds the site (`next build`) and starts it (`next start`). Wait for "Deployed".

### 5. Get your public link
Dashboard → `web` → **Settings → Networking → Generate Domain**. That address is your shareable link.
Put it in `NEXT_PUBLIC_SITE_URL`, then redeploy (`railway up`).

### 6. Load your shop into the online database (once)
The tables and products have to be created in the new database. In the dashboard open
**Postgres → Variables** and copy `DATABASE_PUBLIC_URL`, then run in PowerShell:
```
$env:DATABASE_URL = "<paste DATABASE_PUBLIC_URL here>"
$env:DATABASE_SSL = "true"
$env:ADMIN_PASSWORD = "<choose a strong admin password, 10+ characters>"
npm run db:setup
```
This creates the tables, your products and the admin account (`admin@craftandcart.local`).
It refuses to run against an online database without a strong `ADMIN_PASSWORD`.
Online databases get **no sample reviews** and your stock numbers are never reset by re-running it.

### 7. Check it
Open your link, browse the shop, place a Cash-on-Delivery test order, log in at `/login` as the admin.

## Taking online payments (PhonePe)
Until the `PHONEPE_*` variables are set, **"Pay online" is switched off on the live site** (customers see a
message and can use Cash on Delivery). Add your PhonePe credentials, set `PHONEPE_ENV=production`, and add the
webhook `https://<your-link>/api/webhooks/phonepe` in the PhonePe dashboard. Full details: README.md.

## Updating the site later
Change the code, then run `railway up` again.

## Before you tell customers
- Replace placeholder text (prices, descriptions) with your real ones.
- The home page shows "4.9★ customer love" and "100% handmade" as fixed text: change or remove what isn't true yet.
- Change the admin email/password if you shared them anywhere.
