CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id    SERIAL PRIMARY KEY,
  slug  TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  tagline     TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price_paise INTEGER NOT NULL CHECK (price_paise >= 0),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  colors      TEXT[] NOT NULL DEFAULT '{}',
  hue_a       TEXT NOT NULL DEFAULT '#ff6ec7',
  hue_b       TEXT NOT NULL DEFAULT '#7c5cff',
  emoji       TEXT NOT NULL DEFAULT '🧶',
  image_url   TEXT,
  featured    BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);

CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  email               TEXT NOT NULL,
  name                TEXT NOT NULL,
  phone               TEXT NOT NULL,
  address             JSONB NOT NULL,
  subtotal_paise      INTEGER NOT NULL,
  shipping_paise      INTEGER NOT NULL DEFAULT 0,
  total_paise         INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  payment_method      TEXT NOT NULL DEFAULT 'online' CHECK (payment_method IN ('online','cod')),
  payment_ref         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  color       TEXT,
  qty         INTEGER NOT NULL CHECK (qty > 0),
  price_paise INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_requests (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  idea       TEXT NOT NULL,
  budget     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter (
  email      TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Migrations (safe to re-run). Older databases are upgraded in place; nothing is dropped except
-- obsolete constraints and the unused razorpay_* columns from the very first version.
-- ---------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'online';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_ref TEXT;
ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_order_id;
ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_payment_id;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE INDEX IF NOT EXISTS orders_idem_idx ON orders(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Users: phone number and the roles CUSTOMER / SUPER_ADMIN.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role='SUPER_ADMIN' WHERE role='admin';
UPDATE users SET role='CUSTOMER' WHERE role='customer';
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'CUSTOMER';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('CUSTOMER','SUPER_ADMIN'));

-- Saved delivery addresses.
CREATE TABLE IF NOT EXISTS addresses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT NOT NULL DEFAULT 'Home',
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  line1      TEXT NOT NULL,
  city       TEXT NOT NULL,
  state      TEXT NOT NULL,
  pincode    TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS addresses_user_idx ON addresses(user_id);

-- One payment record per order (Razorpay or cash on delivery). Payment state lives here, not in orders.status.
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  provider            TEXT NOT NULL CHECK (provider IN ('razorpay','cod')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
  amount_paise        INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id   TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  failure_reason      TEXT,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id);

-- Orders created before the payments table: give each one a payment record based on its old status.
INSERT INTO payments(order_id, user_id, provider, status, amount_paise, paid_at, created_at)
SELECT o.id, o.user_id,
       CASE WHEN o.payment_method='cod' THEN 'cod' ELSE 'razorpay' END,
       CASE WHEN o.status='paid' THEN 'paid'
            WHEN o.status='failed' THEN 'failed'
            WHEN o.status='cancelled' THEN 'cancelled'
            WHEN o.status='delivered' THEN 'paid'
            WHEN o.payment_method='online' AND o.status='shipped' THEN 'paid'
            ELSE 'pending' END,
       o.total_paise,
       CASE WHEN o.status IN ('paid','delivered') OR (o.payment_method='online' AND o.status='shipped') THEN o.created_at END,
       o.created_at
FROM orders o WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id=o.id);

-- Order status is now only the fulfilment stage.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
UPDATE orders SET status='confirmed' WHERE status='paid';
UPDATE orders SET status='cancelled' WHERE status='failed';
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled'));

-- Forgot-password links (only a hash of the token is stored).
CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Product management + "First order Rs 1 product" offer (additive; nothing is deleted or rewritten).
-- ---------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_data BYTEA;          -- photo uploaded by the Super Admin (resized, webp)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_type TEXT;
UPDATE products SET sku = 'CC-' || lpad(id::text, 4, '0') WHERE sku IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_key ON products(sku);

-- The promotional first-order products: slot 1 = the Rs 1 product, slot 2 = the Rs 2 product (at most one active per slot).
CREATE TABLE IF NOT EXISTS first_order_offer (
  id                SERIAL PRIMARY KEY,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  offer_price_paise INTEGER NOT NULL DEFAULT 100 CHECK (offer_price_paise >= 100),
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per customer who has taken part in the offer.
--   held     = an online order with the offer price exists and is waiting for payment
--   used     = that order was paid (verified by the server)
--   failed   = Razorpay reported a genuine failed payment attempt (offer is spent)
--   restored = the order was cancelled, so the customer can use the offer again
CREATE TABLE IF NOT EXISTS offer_claims (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('held','used','failed','restored')),
  order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  phone_key  TEXT,                                   -- last 10 digits of the delivery phone: one active claim per phone
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS offer_claims_phone_active ON offer_claims (phone_key)
  WHERE phone_key IS NOT NULL AND status IN ('held','used','failed');

-- Audit trail (shown to the Super Admin; also proves an offer was restored only once).
CREATE TABLE IF NOT EXISTS offer_events (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  event      TEXT NOT NULL,
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offer_events_order_idx ON offer_events(order_id);

-- What the offer did to an order: orders.subtotal_paise stays the normal-price subtotal,
-- total_paise = subtotal - discount + shipping.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_status TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS promo BOOLEAN NOT NULL DEFAULT false;

INSERT INTO categories(slug, name, blurb) VALUES ('home', 'Home', 'Cosy crochet for your home.') ON CONFLICT (slug) DO NOTHING;

-- Two promotional products. Existing single-offer rows become slot 1. Each slot has at most one active product, and a product
-- can hold only one active slot.
ALTER TABLE first_order_offer ADD COLUMN IF NOT EXISTS slot INTEGER;
UPDATE first_order_offer SET slot = CASE WHEN offer_price_paise >= 200 THEN 2 ELSE 1 END WHERE slot IS NULL;
ALTER TABLE first_order_offer ALTER COLUMN slot SET NOT NULL;
ALTER TABLE first_order_offer DROP CONSTRAINT IF EXISTS first_order_offer_slot_check;
ALTER TABLE first_order_offer ADD CONSTRAINT first_order_offer_slot_check CHECK (slot IN (1,2));
DROP INDEX IF EXISTS first_order_offer_one_active;
CREATE UNIQUE INDEX IF NOT EXISTS first_order_offer_slot_active ON first_order_offer (slot) WHERE active;
CREATE UNIQUE INDEX IF NOT EXISTS first_order_offer_product_active ON first_order_offer (product_id) WHERE active;
-- the normal price of every ordered unit, so an order always shows "normal price -> offer price"
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS normal_price_paise INTEGER;

-- Free-shipping rule: whether each ordered unit line was free-shipping eligible when it was ordered.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN;
