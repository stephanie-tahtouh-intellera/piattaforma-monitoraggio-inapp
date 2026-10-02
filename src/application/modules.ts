import { writeAudit } from "@/infrastructure/audit";
import type { Db } from "@/infrastructure/db/connection";

/**
 * Modulo 2 (esecuzione e rendicontazione: SAL, liquidazioni, pagamenti) visibile o nascosto (DEC-108).
 * Nascosto per il portafoglio reale, che la demo presenta fino alla stipula; visibile per il dataset di collaudo.
 */
export function executionModuleEnabled(db: Db): boolean {
  const r = db.prepare("SELECT value_json FROM config WHERE key = 'modules.execution'").get() as { value_json: string } | undefined;
  if (r) return JSON.parse(r.value_json) === true;
  const ds = db.prepare("SELECT value FROM system_meta WHERE key = 'dataset'").get() as { value: string } | undefined;
  return ds?.value === "scenarios";
}

export function setExecutionModule(db: Db, enabled: boolean, actor: string, at: string): void {
  const before = executionModuleEnabled(db);
  db.prepare("INSERT OR REPLACE INTO config (key, value_json, updated_at, updated_by) VALUES ('modules.execution', ?, ?, ?)").run(JSON.stringify(enabled), at, actor);
  writeAudit(db, { actor, action: "CONFIG_MODULES", entityType: "CONFIG", entityId: "modules.execution", before: { execution: before }, after: { execution: enabled }, at });
}
