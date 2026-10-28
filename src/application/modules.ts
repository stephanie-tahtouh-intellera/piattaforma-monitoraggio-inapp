import { writeAudit } from "@/infrastructure/audit";
import type { Db } from "@/infrastructure/db/connection";

/**
 * Modulo 2 (esecuzione e rendicontazione: SAL, liquidazioni, pagamenti) visibile o nascosto (DEC-108).
 * Nascosto per il portafoglio reale, che la demo presenta fino alla stipula; visibile per il dataset di collaudo.
 */
export async function executionModuleEnabled(db: Db): Promise<boolean> {
  const r = (await db.prepare("SELECT value_json FROM config WHERE key = 'modules.execution'").get()) as { value_json: string } | undefined;
  if (r) return JSON.parse(r.value_json) === true;
  const ds = (await db.prepare("SELECT value FROM system_meta WHERE key = 'dataset'").get()) as { value: string } | undefined;
  return ds?.value === "scenarios";
}

export async function setExecutionModule(db: Db, enabled: boolean, actor: string, at: string): Promise<void> {
  const before = await executionModuleEnabled(db);
  await db
    .prepare(
      "INSERT INTO config (key, value_json, updated_at, updated_by) VALUES ('modules.execution', ?, ?, ?) ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by",
    )
    .run(JSON.stringify(enabled), at, actor);
  await writeAudit(db, { actor, action: "CONFIG_MODULES", entityType: "CONFIG", entityId: "modules.execution", before: { execution: before }, after: { execution: enabled }, at });
}
