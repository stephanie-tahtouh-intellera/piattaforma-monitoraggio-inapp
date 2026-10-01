import { bootstrap } from "@/application/bootstrap";
import { fixedClock } from "@/infrastructure/clock";
import { openDb, setDbForTests, type Db } from "@/infrastructure/db/connection";

process.env.APP_ROOT ??= require("node:path").resolve(__dirname, "../..");
process.env.DEMO_PASSWORD ??= "Demo2026!";

export const clock = fixedClock("2026-10-01");

/** DB SQLite in memoria con il dataset scenarios caricato e run_checks eseguito. */
export async function scenarioDb(): Promise<Db> {
  const db = openDb(":memory:");
  await bootstrap(db, clock, { dataset: "scenarios" });
  setDbForTests(db);
  return db;
}
