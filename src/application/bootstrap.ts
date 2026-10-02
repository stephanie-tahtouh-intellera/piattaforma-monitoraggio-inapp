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

export function isSeeded(db: Db): boolean {
  return !!db.prepare("SELECT value FROM system_meta WHERE key = 'seeded_at'").get();
}

/** Carica un dataset (idempotente). Per "inapp" usa il file generato dall'import del workbook reale. */
export async function loadDataset(db: Db, clock: Clock, name: DatasetName): Promise<SeedReport[]> {
  const root = projectRoot();
  const reports: SeedReport[] = [];
  if (name === "scenarios") {
    reports.push(seedDataset(db, readDataset(path.join(root, "seed", "scenarios", "procedures.json")), clock, path.join(root, "seed", "scenarios", "documents")));
  } else {
    const { importInappWorkbook, attachRealDocuments } = await import("./inapp-import");
    const ds = await importInappWorkbook(db, clock);
    reports.push(seedDataset(db, ds, clock, null));
    await attachRealDocuments(db, clock);
    // Casi dimostrativi inventati (DEC-105): un'attività per ogni attore della guida demo
    reports.push(seedDataset(db, readDataset(path.join(root, "seed", "inapp", "casi-demo.json")), clock, path.join(root, "seed", "inapp", "casi-demo")));
    const { applyDemoActions } = await import("@/server/demo-cases");
    applyDemoActions(db);
  }
  return reports;
}

export async function bootstrap(db: Db, clock: Clock, opts: { dataset?: DatasetName; force?: boolean } = {}): Promise<{ seeded: boolean; reports: SeedReport[] }> {
  migrate(db);
  if (isSeeded(db) && !opts.force) return { seeded: false, reports: [] };
  seedReference(db, clock);
  const name = opts.dataset ?? datasetName();
  const reports = await loadDataset(db, clock, name);
  tx(db, () => {
    db.prepare("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('seeded_at', ?)").run(clock.nowIso());
    db.prepare("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('dataset', ?)").run(name);
    writeAudit(db, { actor: "system", action: "SEED", entityType: "DATASET", entityId: name, after: reports, at: clock.nowIso() });
  });
  runChecks(db, clock);
  return { seeded: true, reports };
}

const RESET_TABLES = [
  "notification_reads", "alert_notifications", "outbox", "alerts", "simulations", "validation_items", "evidences", "document_pages", "documents",
  "payments", "financial_movements", "sals", "contracts", "budget_allocations", "milestones", "forecast_lines", "milestone_forecasts",
  "procedure_snapshot_year", "procedure_snapshot", "procedure_search", "exports", "import_reports", "jobs", "idempotency_keys", "sessions",
];

/** Reset transazionale della demo (US-112): audit e versioni rimossi solo con il flag di reset. */
export async function resetDemo(db: Db, clock: Clock, actor: string, dataset?: DatasetName): Promise<{ reports: SeedReport[] }> {
  tx(db, () => {
    db.prepare("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('reset_in_progress', '1')").run();
    for (const t of RESET_TABLES) db.prepare(`DELETE FROM ${t}`).run();
    db.prepare("UPDATE procedures SET current_version_id = NULL").run();
    db.prepare("DELETE FROM procedure_versions").run();
    db.prepare("DELETE FROM procedures").run();
    db.prepare("DELETE FROM audit_events").run();
    db.prepare("DELETE FROM system_meta WHERE key IN ('seeded_at','reset_in_progress')").run();
  });
  const name = dataset ?? datasetName();
  const reports = await loadDataset(db, clock, name);
  tx(db, () => {
    db.prepare("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('seeded_at', ?)").run(clock.nowIso());
    db.prepare("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('dataset', ?)").run(name);
    writeAudit(db, { actor, action: "RESET_DEMO", entityType: "DATASET", entityId: name, after: reports.map((r) => ({ inserted: r.inserted })), reason: "Reset demo confermato", at: clock.nowIso() });
  });
  runChecks(db, clock);
  return { reports };
}
