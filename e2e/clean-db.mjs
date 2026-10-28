// DB E2E pulito a ogni esecuzione (T-001 su ambiente pulito, DEC-115: Postgres condiviso, niente file locale).
import { rmSync } from "node:fs";
import pg from "pg";

rmSync(process.argv[2] ?? ".data/e2e", { recursive: true, force: true });

const url = process.env.POSTGRES_URL;
if (url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'schema_migrations'");
  if (rows.length) await client.query(`TRUNCATE TABLE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await client.end();
}
