import { bootstrap } from "@/application/bootstrap";
import { fixedClock } from "@/infrastructure/clock";
import { migrate, openDb, setDbForTests, type Db } from "@/infrastructure/db/connection";

process.env.APP_ROOT ??= require("node:path").resolve(__dirname, "../..");
process.env.DEMO_PASSWORD ??= "Demo2026!";

export const clock = fixedClock("2026-10-01");

/** Svuota ogni tabella applicativa (DEC-115: un solo Postgres condiviso dev/test/prod, niente :memory:). */
export async function truncateAll(db: Db): Promise<void> {
  const tables = (await db
    .prepare("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'schema_migrations'")
    .all()) as { tablename: string }[];
  if (!tables.length) return;
  await db.exec(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

/** DB Postgres (POSTGRES_URL) svuotato, con il dataset scenarios caricato e run_checks eseguito. */
export async function scenarioDb(): Promise<Db> {
  const db = await openDb();
  await migrate(db);
  await truncateAll(db);
  await bootstrap(db, clock, { dataset: "scenarios" });
  setDbForTests(db);
  return db;
}
