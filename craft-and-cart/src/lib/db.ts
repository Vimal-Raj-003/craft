import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgres://craftcart:craftcart_local@localhost:54329/craftcart",
    max: 10,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export type Product = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price_paise: number;
  stock: number;
  colors: string[];
  hue_a: string;
  hue_b: string;
  emoji: string;
  image_url: string | null;
  featured: boolean;
  category_slug: string | null;
  category_name: string | null;
  rating: number | null;
  review_count: number;
};

const PRODUCT_SELECT = `
  SELECT p.*, c.slug AS category_slug, c.name AS category_name,
         (SELECT round(avg(rating)::numeric,1)::float FROM reviews r WHERE r.product_id=p.id) AS rating,
         (SELECT count(*)::int FROM reviews r WHERE r.product_id=p.id) AS review_count
  FROM products p LEFT JOIN categories c ON c.id=p.category_id`;

export async function listProducts(opts: { category?: string; featured?: boolean; q?: string; sort?: string } = {}) {
  const where = ["p.active"];
  const params: unknown[] = [];
  if (opts.category) {
    params.push(opts.category);
    where.push(`c.slug=$${params.length}`);
  }
  if (opts.featured) where.push("p.featured");
  if (opts.q) {
    params.push(`%${opts.q}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.tagline ILIKE $${params.length})`);
  }
  const order =
    opts.sort === "price-asc" ? "p.price_paise ASC" : opts.sort === "price-desc" ? "p.price_paise DESC" : "p.created_at DESC, p.id DESC";
  const { rows } = await pool.query<Product>(`${PRODUCT_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order}`, params);
  return rows;
}

export async function getProduct(slug: string) {
  const { rows } = await pool.query<Product>(`${PRODUCT_SELECT} WHERE p.slug=$1 AND p.active`, [slug]);
  return rows[0] ?? null;
}

export async function listCategories() {
  const { rows } = await pool.query<{ slug: string; name: string; blurb: string }>(
    "SELECT slug,name,blurb FROM categories ORDER BY id",
  );
  return rows;
}

export async function listReviews(productId: number) {
  const { rows } = await pool.query<{ author: string; rating: number; body: string }>(
    "SELECT author,rating,body FROM reviews WHERE product_id=$1 ORDER BY created_at DESC LIMIT 10",
    [productId],
  );
  return rows;
}
