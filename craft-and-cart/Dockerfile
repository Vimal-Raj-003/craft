# Craft & Cart: production image for the Next.js website.
# Build from the craft-and-cart folder:  docker compose -p craft -f docker-compose.production.yml --env-file .env.production build
#
# Three stages keep the final image small (no build tools, no dev packages, runs as a non-root user).

ARG NODE_VERSION=22

# ---------- 1. install dependencies (cached until package*.json changes) ----------
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: nothing here needs install scripts (native binaries ship as optional packages)
RUN npm ci --ignore-scripts

# ---------- 2. build the site ----------
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public address baked into the build (used in password-reset email links). Overridable with --build-arg.
ARG NEXT_PUBLIC_SITE_URL=https://craft.jilljill.in
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_TELEMETRY_DISABLED=1
# The build needs no database and no secrets.
RUN npm run build
# One self-contained file for creating/updating the tables and products (so the runtime image needs no dev tools).
# bcryptjs is bundled in (the compact server image does not contain it); pg is already present in the image.
RUN npx esbuild scripts/seed.ts --bundle --platform=node --target=node22 --format=cjs \
      --external:pg --outfile=dist/db-setup.cjs
RUN npx esbuild scripts/create-admin.ts --bundle --platform=node --target=node22 --format=cjs \
      --external:pg --outfile=dist/create-admin.cjs
RUN npx esbuild scripts/add-catalog.ts --bundle --platform=node --target=node22 --format=cjs \
      --external:pg --outfile=dist/add-catalog.cjs
RUN npx esbuild scripts/razorpay-check.ts --bundle --platform=node --target=node22 --format=cjs \
      --outfile=dist/razorpay-check.cjs

# ---------- 3. run it ----------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# the compact server Next.js produced, its static files and the public images (photos, kolam border)
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# database setup tool + schema (run on demand:  node scripts/db-setup.cjs)
COPY --from=builder --chown=node:node /app/db ./db
COPY --from=builder --chown=node:node /app/dist/db-setup.cjs ./scripts/db-setup.cjs
COPY --from=builder --chown=node:node /app/dist/create-admin.cjs ./scripts/create-admin.cjs
COPY --from=builder --chown=node:node /app/dist/add-catalog.cjs ./scripts/add-catalog.cjs
COPY --from=builder --chown=node:node /app/dist/razorpay-check.cjs ./scripts/razorpay-check.cjs
# Next.js writes optimised images here at runtime
RUN mkdir -p .next/cache && chown -R node:node .next

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
