// Runs a real local PostgreSQL server (embedded binaries). Keep this running while developing.
// Swap for any standard Postgres by just changing DATABASE_URL in .env.local.
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PGPORT ?? 54329);
const dataDir = path.resolve(".pgdata");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "craftcart",
    password: "craftcart_local",
    port: PORT,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  if (!fs.existsSync(path.join(dataDir, "PG_VERSION"))) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("craftcart");
  } catch {
    /* already exists */
  }
  console.log(`\n✅ PostgreSQL running on port ${PORT} (db: craftcart)`);
  console.log(`   DATABASE_URL=postgres://craftcart:craftcart_local@localhost:${PORT}/craftcart\n`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
