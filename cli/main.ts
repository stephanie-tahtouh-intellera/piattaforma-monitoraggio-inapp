/* CLI: bootstrap | seed --if-empty | reset --yes [--dataset X] | run-checks [--date D] | audit-verify | backup */
import path from "node:path";
import { bootstrap, resetDemo, type DatasetName } from "@/application/bootstrap";
import { runChecks } from "@/application/run-checks";
import { verifyAuditChain } from "@/infrastructure/audit";
import { dbClock, fixedClock, systemNowIso } from "@/infrastructure/clock";
import { databasePath, getDb, missingTriggers } from "@/infrastructure/db/connection";

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const db = getDb();
  const clock = dbClock(db);
  const dataset = opt("dataset") as DatasetName | undefined;
  switch (cmd) {
    case "bootstrap":
    case "seed": {
      const r = await bootstrap(db, clock, { ...(dataset ? { dataset } : {}) });
      console.log(r.seeded ? `Seed caricato: ${JSON.stringify(r.reports.map((x) => ({ dataset: x.dataset, inserite: x.inserted, errori: x.errors.length })))}` : "DB già inizializzato (seed if-empty).");
      break;
    }
    case "reset": {
      if (!args.includes("--yes")) throw new Error("Conferma richiesta: reset --yes");
      const r = await resetDemo(db, clock, "cli", dataset);
      console.log(`Reset completato: ${JSON.stringify(r.reports.map((x) => ({ dataset: x.dataset, inserite: x.inserted })))}`);
      break;
    }
    case "run-checks": {
      const d = opt("date");
      const r = runChecks(db, d ? fixedClock(d, systemNowIso()) : clock);
      console.log(JSON.stringify(r));
      break;
    }
    case "audit-verify":
      console.log(JSON.stringify({ ...verifyAuditChain(db), missingTriggers: missingTriggers(db) }));
      break;
    case "backup": {
      const out = opt("out") ?? path.join(path.dirname(databasePath()), `backup-${systemNowIso().replace(/[:.]/g, "-")}.db`);
      db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
      console.log(`Backup: ${out}`);
      break;
    }
    default:
      console.log("Uso: cli bootstrap | reset --yes [--dataset inapp|scenarios] | run-checks [--date YYYY-MM-DD] | audit-verify | backup [--out file]");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
