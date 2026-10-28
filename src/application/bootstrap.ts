import path from "node:path";
import type { Clock } from "@/infrastructure/clock";
import { projectRoot } from "@/infrastructure/config/templates";
import { migrate, tx, type Db } from "@/infrastructure/db/connection";
import { writeAudit } from "@/infrastructure/audit";
import { runChecks } from "./run-checks";
import { readDataset, seedDataset, seedReference, type SeedReport } from "./seed-loader";

export type DatasetName = "scenarios" | "inapp";

export function datasetName(): DatasetName {
  const v = process.env.DEMO_DATASET ?? "inapp";
  return v === "scenarios" ? "scenarios" : "inapp";
}

export async function isSeeded(db: Db): Promise<boolean> {
  return !!(await db.prepare("SELECT value FROM system_meta WHERE key = 'seeded_at'").get());
}

/** Carica un dataset (idempotente). Per "inapp" usa il file generato dall'import del workbook reale. */
export async function loadDataset(db: Db, clock: Clock, name: DatasetName): Promise<SeedReport[]> {
  const root = projectRoot();
  // Il dataset attivo determina la famiglia di modelli anche per le bozze create durante il caricamento (DEC-107)
  await tx(db, (tdb) => tdb.prepare("INSERT INTO system_meta (key, value) VALUES ('dataset', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(name));
  const reports: SeedReport[] = [];
  if (name === "scenarios") {
    reports.push(await seedDataset(db, readDataset(path.join(root, "seed", "scenarios", "procedures.json")), clock, path.join(root, "seed", "scenarios", "documents")));
  } else {
    const { importInappWorkbook, attachRealDocuments } = await import("./inapp-import");
    const ds = await importInappWorkbook(db, clock);
    reports.push(await seedDataset(db, ds, clock, null));
    await attachRealDocuments(db, clock);
    // Casi dimostrativi inventati (DEC-105): un'attività per ogni attore della guida demo
    reports.push(await seedDataset(db, readDataset(path.join(root, "seed", "inapp", "casi-demo.json")), clock, path.join(root, "seed", "inapp", "casi-demo")));
    const { applyDemoActions } = await import("@/server/demo-cases");
    await applyDemoActions(db);
  }
  return reports;
}

export async function bootstrap(db: Db, clock: Clock, opts: { dataset?: DatasetName; force?: boolean } = {}): Promise<{ seeded: boolean; reports: SeedReport[] }> {
  await migrate(db);
  if ((await isSeeded(db)) && !opts.force) return { seeded: false, reports: [] };
  await seedReference(db, clock);
  const name = opts.dataset ?? datasetName();
  const reports = await loadDataset(db, clock, name);
  await tx(db, async (tdb) => {
    await tdb.prepare("INSERT INTO system_meta (key, value) VALUES ('seeded_at', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(clock.nowIso());
    await tdb.prepare("INSERT INTO system_meta (key, value) VALUES ('dataset', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(name);
    await writeAudit(tdb, { actor: "system", action: "SEED", entityType: "DATASET", entityId: name, after: reports, at: clock.nowIso() });
  });
  await runChecks(db, clock);
  return { seeded: true, reports };
}

const RESET_TABLES = [
  "notification_reads", "alert_notifications", "outbox", "alerts", "simulations", "validation_items", "evidences", "document_pages", "documents",
  "payments", "financial_movements", "sals", "contracts", "budget_allocations", "milestones", "forecast_lines", "milestone_forecasts",
  "procedure_snapshot_year", "procedure_snapshot", "procedure_search", "exports", "import_reports", "jobs", "idempotency_keys", "sessions",
];

/** Reset transazionale della demo (US-112): audit e versioni rimossi solo con il flag di reset. */
export async function resetDemo(db: Db, clock: Clock, actor: string, dataset?: DatasetName): Promise<{ reports: SeedReport[] }> {
  await tx(db, async (tdb) => {
    await tdb.prepare("INSERT INTO system_meta (key, value) VALUES ('reset_in_progress', '1') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
    for (const t of RESET_TABLES) await tdb.prepare(`DELETE FROM ${t}`).run();
    await tdb.prepare("UPDATE procedures SET current_version_id = NULL").run();
    await tdb.prepare("DELETE FROM procedure_versions").run();
    await tdb.prepare("DELETE FROM procedures").run();
    await tdb.prepare("DELETE FROM audit_events").run();
    await tdb.prepare("DELETE FROM system_meta WHERE key IN ('seeded_at','reset_in_progress')").run();
    await tdb.prepare("DELETE FROM config WHERE key = 'modules.execution'").run();
  });
  const name = dataset ?? datasetName();
  const reports = await loadDataset(db, clock, name);
  await tx(db, async (tdb) => {
    await tdb.prepare("INSERT INTO system_meta (key, value) VALUES ('seeded_at', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(clock.nowIso());
    await tdb.prepare("INSERT INTO system_meta (key, value) VALUES ('dataset', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(name);
    await writeAudit(tdb, {
      actor,
      action: "RESET_DEMO",
      entityType: "DATASET",
      entityId: name,
      after: reports.map((r) => ({ inserted: r.inserted })),
      reason: "Reset demo confermato",
      at: clock.nowIso(),
    });
  });
  await runChecks(db, clock);
  return { reports };
}
