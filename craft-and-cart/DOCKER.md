# Deploying Craft & Cart with Docker (Hostinger VPS, Ubuntu 24.04)

Target: **https://craft.jilljill.in** → existing Nginx → `127.0.0.1:3215` → container `craft-web` → container `craft-db` (PostgreSQL 16).

Nothing here touches your other Docker apps or Nginx sites. Everything is namespaced `craft`:

| Thing | Name | Notes |
|---|---|---|
| Containers | `craft-web`, `craft-db` | |
| Docker network | `craft_net` | used by these two containers only |
| Database volume | `craft_db_data` | survives `down` and rebuilds |
| Published port | `127.0.0.1:3215 → 3000` | localhost only; **no** ports 80/443; PostgreSQL 5432 is **not published at all** |

All commands run on the VPS inside `craft/craft-and-cart` (the folder that contains `docker-compose.production.yml`).
To keep them short:

```bash
alias craft='docker compose -p craft -f docker-compose.production.yml --env-file .env.production'
```

## 0. Before you start (read-only checks; they change nothing)

```bash
ss -ltnp | grep ':3215' || echo "port 3215 is free"          # must say it is free
docker ps --format '{{.Names}}' | grep -E '^craft-' || echo "no craft-* containers yet"
dig +short craft.jilljill.in                                   # must show this VPS's IP
docker compose version                                         # Compose v2
```

## 1. Get the code

```bash
git clone https://github.com/Vimal-Raj-003/craft.git     # first time
cd craft/craft-and-cart
```

## 2. Create the settings file (two required secrets)

```bash
cp .env.production.example .env.production
chmod 600 .env.production
echo "CRAFT_DB_PASSWORD=$(openssl rand -hex 24)" >> .env.production    # then remove the empty CRAFT_DB_PASSWORD= line
echo "JWT_SECRET=$(openssl rand -hex 32)"        >> .env.production    # then remove the empty JWT_SECRET= line
nano .env.production                                                    # check; add RAZORPAY_* / SMTP_* (see below)
```

The stack refuses to start if either secret is missing. `JWT_SECRET` must be 32+ characters (the site also checks this at start-up).

## 3. Build and start

```bash
craft build            # = docker compose -p craft -f docker-compose.production.yml --env-file .env.production build
craft up -d
craft ps               # both should become "healthy" (about 1 minute)
```

## 4. Create the tables, products and the first Super Admin (once)

Choose a strong admin password (10+ characters). It is typed once, here, and is not stored in the running container:

```bash
ADMIN_PASSWORD='choose-a-strong-password' ADMIN_EMAIL='you@example.com' \
  craft run --rm -e ADMIN_PASSWORD -e ADMIN_EMAIL craft-web node scripts/db-setup.cjs
```

Safe to run again later: it upgrades the tables in place, updates products but never resets stock, never adds sample reviews, and never changes an existing admin password.

The account it creates has the role `SUPER_ADMIN` and signs in at **https://craft.jilljill.in/admin/login**. To add another Super Admin, promote an existing customer, or reset a Super Admin's password later:

```bash
ADMIN_EMAIL='someone@example.com' ADMIN_PASSWORD='a-strong-password' \
  craft run --rm -e ADMIN_EMAIL -e ADMIN_PASSWORD craft-web node scripts/create-admin.cjs
```

## 5. Add the Nginx site (a new file; existing sites are untouched)

```bash
sudo cp deploy/nginx/craft.jilljill.in.conf /etc/nginx/sites-available/craft.jilljill.in
sudo ln -s /etc/nginx/sites-available/craft.jilljill.in /etc/nginx/sites-enabled/craft.jilljill.in
sudo nginx -t                      # MUST say "syntax is ok" and "test is successful"
sudo systemctl reload nginx        # only then reload
```

Get the certificate if you do not have one yet (see the comments at the top of that file), for example
`sudo certbot certonly --nginx -d craft.jilljill.in`.

## 6. Test

```bash
curl -s http://127.0.0.1:3215/api/health                       # {"ok":true}
BASE_URL=https://craft.jilljill.in ADMIN_EMAIL='you@example.com' ADMIN_PASSWORD='...' bash deploy/smoke-test.sh
```

The smoke test checks health, pages, images, HTTPS redirect, security rules, and the admin session
(`/api/auth/me` after login, with the Secure/HttpOnly cookie, through Nginx over HTTPS). Finish by opening
https://craft.jilljill.in in a browser, creating a customer account, placing a test order, and signing in at `/admin/login`.

## Everyday operations

| Task | Command |
|---|---|
| Logs | `craft logs -f craft-web` |
| Status | `craft ps` |
| Update after a `git pull` | `craft build && craft up -d` (the database is kept; re-run step 4 if products changed) |
| Restart | `craft restart craft-web` |
| Stop (data kept) | `craft down` |
| Back up the database | `docker exec craft-db pg_dump -U craftcart craftcart \| gzip > craft-$(date +%F).sql.gz` |
| Restore a backup | `gunzip -c craft-2026-10-03.sql.gz \| docker exec -i craft-db psql -U craftcart craftcart` |
| Open a database shell | `docker exec -it craft-db psql -U craftcart craftcart` |

**Never** run `craft down -v` unless you want to delete the database volume.

## Adding the 15 new products and the ₹1 offer (update)

After `git pull`, `craft build` and the schema upgrade (`docker exec -i craft-db psql ... < db/schema.sql`, the same safe single-transaction command as before) and `craft up -d --no-deps craft-web`:

```bash
craft run --rm craft-web node scripts/add-catalog.cjs
```

It only **inserts** missing products (existing products, prices, stock and photos are never changed), adds the "Home" category, and, only if no offer has ever been configured, makes the Strawberry Crochet Keychain the ₹1 first-order product. Products whose photo is missing are added inactive. Photos and prices can then be changed in the Super Admin panel (Products), and the ₹1 product under "₹1 Offer". Photo credits: `public/products/CREDITS.md`.

## Turning on Razorpay (online payments)

Until the keys are set, "Pay online" shows a friendly message and Cash on Delivery keeps working.

1. In the Razorpay Dashboard switch to **Test Mode**, open **Account & Settings → API Keys → Generate Test Key**, and copy the Key Id (`rzp_test_…`) and Key Secret.
2. Add to `.env.production`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a long random `RAZORPAY_WEBHOOK_SECRET` (`openssl rand -hex 24`). Then `craft up -d`.
3. **Account & Settings → Webhooks → Add New Webhook**: URL `https://craft.jilljill.in/api/webhooks/razorpay`, Secret = your `RAZORPAY_WEBHOOK_SECRET`, events **payment.captured**, **payment.failed**, **order.paid**.
4. Test with Razorpay's test cards/UPI (for example UPI id `success@razorpay`; test card 4111 1111 1111 1111, any future expiry, any CVV, OTP 1234 when asked). In the Dashboard open **Transactions** to see the payment, and in `/admin/payments` to see it recorded.
5. When ready for real money, complete Razorpay KYC, switch to **Live Mode**, generate live keys, replace the three values, create the webhook again in Live Mode, and `craft up -d`.

The Key Secret only ever exists inside the `craft-web` container; it is never sent to browsers.

## Forgot-password emails (optional)

Add an SMTP mailbox to `.env.production` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`; for a Hostinger mailbox: `smtp.hostinger.com`, `465`). Without it, "Forgot password" shows its normal message but no email can be sent.
## Security design

- `craft-db` has no `ports:` entry: PostgreSQL is reachable only from `craft-web` over `craft_net`.
- `craft-web` publishes only `127.0.0.1:3215`, so the internet reaches it solely through Nginx over HTTPS.
- The app runs as a non-root user with all Linux capabilities dropped and `no-new-privileges`; memory is capped (web 768 MB, db 512 MB) so it cannot starve your other apps; logs rotate at 10 MB × 3.
- Login cookies are `HttpOnly; Secure; SameSite=Lax` and are only ever used by browsers on HTTPS.
- There are no fake or demo payments anywhere: an order is only marked paid after the server verifies Razorpay's signature (or a signed webhook / Razorpay's own status API).
- Customers can only read their own orders; the Super Admin area checks the role on the server for every page and API call.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `craft up` says a variable is required | Fill `CRAFT_DB_PASSWORD` and `JWT_SECRET` in `.env.production` (no blank duplicates). |
| `craft-web` is "unhealthy" | `craft logs craft-web` (usually a wrong/changed `CRAFT_DB_PASSWORD`; the database keeps the password it was first created with). |
| Port 3215 already in use | Pick another free port and change it in `docker-compose.production.yml` **and** the Nginx file. |
| 502 Bad Gateway from Nginx | `craft ps` (is `craft-web` healthy?) and `curl http://127.0.0.1:3215/api/health`. |
| Admin login works but the next page says not signed in | Open the site over **https** (the cookie is Secure); check that Nginx has `proxy_set_header Host $host`. |
| Images missing | `craft logs craft-web`; the image optimiser needs write access to `.next/cache` (set up in the image). |
