// Creates the first Super Admin, or promotes an existing account, or resets a Super Admin's password.
//   ADMIN_EMAIL='you@example.com' ADMIN_PASSWORD='a-long-password' npm run admin:create
// In Docker:  craft run --rm -e ADMIN_EMAIL -e ADMIN_PASSWORD craft-web node scripts/create-admin.cjs
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const name = process.env.ADMIN_NAME?.trim() || "Super Admin";

async function main() {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Set ADMIN_EMAIL to a valid email address.");
  if (password.length < 10) throw new Error("Set ADMIN_PASSWORD to at least 10 characters.");

  const url = process.env.DATABASE_URL ?? "postgres://craftcart:craftcart_local@localhost:54329/craftcart";
  const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const hash = await bcrypt.hash(password, 10);
  // Works whether the email is new, an existing customer (promoted) or an existing admin (password reset).
  const { rows } = await pool.query(
    `INSERT INTO users(email,name,password_hash,role) VALUES($1,$2,$3,'SUPER_ADMIN')
     ON CONFLICT (email) DO UPDATE SET role='SUPER_ADMIN', password_hash=EXCLUDED.password_hash
     RETURNING id, (xmax = 0) AS created`,
    [email, name, hash],
  );
  console.log(`${rows[0].created ? "Created" : "Updated"} Super Admin: ${email}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
