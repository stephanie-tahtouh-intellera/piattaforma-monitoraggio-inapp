import { createHash, randomUUID } from "node:crypto";
import type { Db } from "./db/connection";

export interface AuditInput {
  actor: string;
  impersonatedBy?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  procedureCode?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  correlationId?: string;
  at: string;
}

const json = (v: unknown) => (v === undefined ? null : JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));

/** Audit append-only con hash chain (CR-42). Da chiamare dentro la transazione della mutazione. */
export async function writeAudit(db: Db, e: AuditInput): Promise<void> {
  const prev = (await db.prepare("SELECT hash FROM audit_events ORDER BY id DESC LIMIT 1").get()) as
    | { hash: string }
    | undefined;
  const row = {
    at: e.at,
    actor: e.actor,
    impersonated_by: e.impersonatedBy ?? null,
    action: e.action,
    entity_type: e.entityType,
    entity_id: e.entityId,
    procedure_code: e.procedureCode ?? null,
    before_json: json(e.before),
    after_json: json(e.after),
    reason: e.reason ?? null,
    correlation_id: e.correlationId ?? randomUUID(),
    prev_hash: prev?.hash ?? null,
  };
  const hash = createHash("sha256").update(JSON.stringify(row)).digest("hex");
  await db
    .prepare(
      `INSERT INTO audit_events (at, actor, impersonated_by, action, entity_type, entity_id, procedure_code, before_json, after_json, reason, correlation_id, prev_hash, hash)
     VALUES (@at, @actor, @impersonated_by, @action, @entity_type, @entity_id, @procedure_code, @before_json, @after_json, @reason, @correlation_id, @prev_hash, @hash)`,
    )
    .run({ ...row, hash });
}

/** Verifica della catena (cli audit verify). */
export async function verifyAuditChain(db: Db): Promise<{ ok: boolean; brokenAt: number | null; count: number }> {
  const rows = (await db.prepare("SELECT * FROM audit_events ORDER BY id").all()) as Record<string, unknown>[];
  let prev: string | null = null;
  for (const r of rows) {
    const { id, hash, ...rest } = r;
    if (rest.prev_hash !== prev) return { ok: false, brokenAt: Number(id), count: rows.length };
    const calc = createHash("sha256")
      .update(JSON.stringify({ at: rest.at, actor: rest.actor, impersonated_by: rest.impersonated_by, action: rest.action, entity_type: rest.entity_type, entity_id: rest.entity_id, procedure_code: rest.procedure_code, before_json: rest.before_json, after_json: rest.after_json, reason: rest.reason, correlation_id: rest.correlation_id, prev_hash: rest.prev_hash }))
      .digest("hex");
    if (calc !== hash) return { ok: false, brokenAt: Number(id), count: rows.length };
    prev = hash as string;
  }
  return { ok: true, brokenAt: null, count: rows.length };
}
