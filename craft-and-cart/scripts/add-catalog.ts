// Adds the 15 new products (insert-only: nothing existing is changed or deleted).
//   npm run catalog:add        (Docker:  craft run --rm craft-web node scripts/add-catalog.cjs)
import { Pool } from "pg";
import { addCatalog } from "./catalog";

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://craftcart:craftcart_local@localhost:54329/craftcart";
  const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const added = await addCatalog(pool);
  const { rows } = await pool.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE active)::int AS active FROM products");
  console.log(`Added ${added} new product(s). Catalogue now has ${rows[0].total} products (${rows[0].active} active).`);
  await pool.end();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
