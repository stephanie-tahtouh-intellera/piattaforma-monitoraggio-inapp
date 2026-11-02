import { writeAudit } from "@/infrastructure/audit";
import type { Db } from "@/infrastructure/db/connection";

/**
 * Assistente alla memoria (DEC-111, incremento 6): opzionale e spento di default.
 * - `disabled`: nessun suggerimento.
 * - `template`: schema di testo locale e deterministico (src/domain/memory-draft.ts), senza servizi esterni.
 * Un provider LLM reale non è previsto finché non è deciso D-07 (provider, residenza dei dati, DPIA): si aggiungerebbe qui
 * come nuovo valore, dietro lo stesso confine (solo testo proposto, mai importi, date, stati o simulazioni).
 */
export type MemoryAssistantProvider = "disabled" | "template";
export const MEMORY_ASSISTANT_PROVIDERS: MemoryAssistantProvider[] = ["disabled", "template"];

export async function memoryAssistantProvider(db: Db): Promise<MemoryAssistantProvider> {
  const r = (await db.prepare("SELECT value_json FROM config WHERE key = 'llm.provider'").get()) as { value_json: string } | undefined;
  const v = r ? (JSON.parse(r.value_json) as string) : "disabled";
  return v === "template" ? "template" : "disabled";
}

export async function setMemoryAssistantProvider(db: Db, provider: MemoryAssistantProvider, actor: string, at: string): Promise<void> {
  const before = await memoryAssistantProvider(db);
  await db
    .prepare(
      "INSERT INTO config (key, value_json, updated_at, updated_by) VALUES ('llm.provider', ?, ?, ?) ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, version = config.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by",
    )
    .run(JSON.stringify(provider), at, actor);
  await writeAudit(db, { actor, action: "CONFIG_ASSISTANT", entityType: "CONFIG", entityId: "llm.provider", before: { provider: before }, after: { provider }, at });
}
