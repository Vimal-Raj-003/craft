# Craft & Cart — the website

This folder is the Next.js store itself. The full documentation (features, tech stack, payments, deployment, security,
troubleshooting) is in the **[main README](../README.md)**.

## Quick start

```bash
npm install
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
npm run db:start                  # terminal 1: built-in PostgreSQL (keep it running)
npm run db:seed                   # terminal 2: tables, products, admin account
npm run dev                       # http://localhost:3000
```

Local admin login: `admin@craftandcart.local` with the demo password `admin12345` (or your `ADMIN_PASSWORD`).
Use a strong, private password on any public site.

## Folders

- `src/app` pages and API routes · `src/components` UI · `src/lib` database, auth, cart and payment helpers
- `db/schema.sql` tables · `scripts/` local database and seed · `public/` images · `docs/screenshots/` README images

## More

- Settings reference: [`.env.example`](.env.example)
- Deploy with Docker on a VPS: [DOCKER.md](DOCKER.md) (compose file, Nginx config, smoke test)
- Other hosts - Render: [`../render.yaml`](../render.yaml) (steps in the main README)
- Deploy to Railway: [`DEPLOY.md`](DEPLOY.md)