import { hashSync } from "@node-rs/argon2";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { SeedDataset, type SeedProcedure } from "@/contracts/seed";
import { BusinessCalendar } from "@/domain/dates";
import { DEFAULT_SETTINGS, type TemplateFamily } from "@/domain/model";
import { Money } from "@/domain/money";
import type { Clock } from "@/infrastructure/clock";
import { loadTemplates, projectRoot } from "@/infrastructure/config/templates";
import { tx, type Db } from "@/infrastructure/db/connection";
import { buildAggregateFromSeed } from "./build-aggregate";
import { cancelProcedureTx, closeProcedureTx } from "./procedure-events";

export const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

/** Portafoglio reale e casi dimostrativi seguono il processo del Modulo 1; il collaudo resta sui modelli v1 (DEC-107). */
export function familyOfDataset(dataset: string | null | undefined): TemplateFamily {
  return dataset === "inapp" || dataset === "casi-demo" || dataset === "user" ? "m1" : "v1";
}

interface Reference {
  structures: { code: string; name: string }[];
  suppliers: { code: string; name: string }[];
  users: { login: string; name: string; role: string; structureScope: string; supplier?: string }[];
}

export async function seedReference(db: Db, clock: Clock, password = process.env.DEMO_PASSWORD ?? "Demo2026!"): Promise<void> {
  const ref = JSON.parse(readFileSync(path.join(projectRoot(), "seed", "reference.json"), "utf8")) as Reference;
  const hash = hashSync(password, ARGON_OPTS);
  await tx(db, async (db) => {
    const st = db.prepare("INSERT INTO structures (code, name) VALUES (?, ?) ON CONFLICT (code) DO NOTHING");
    for (const s of ref.structures) await st.run(s.code, s.name);
    const su = db.prepare("INSERT INTO suppliers (code, name) VALUES (?, ?) ON CONFLICT (code) DO NOTHING");
    for (const s of ref.suppliers) await su.run(s.code, s.name);
    const us = db.prepare(
      "INSERT INTO users (login, name, email, password_hash, role, structure_scope, supplier_code) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (login) DO NOTHING",
    );
    for (const u of ref.users) await us.run(u.login, u.name, `${u.login}@demo.invalid`, hash, u.role, u.structureScope, u.supplier ?? null);
    const cfg = db.prepare("INSERT INTO config (key, value_json, updated_at, updated_by) VALUES (?, ?, ?, 'seed') ON CONFLICT (key) DO NOTHING");
    await cfg.run("demo.reference_date", JSON.stringify(process.env.APP_REFERENCE_DATE ?? "2026-10-01"), clock.nowIso());
    await cfg.run("engine.settings", JSON.stringify(DEFAULT_SETTINGS), clock.nowIso());
    await cfg.run("llm.provider", JSON.stringify("disabled"), clock.nowIso());
    await cfg.run("ocr.enabled", JSON.stringify(true), clock.nowIso());
  });
}

export function readDataset(file: string): SeedDataset {
  return SeedDataset.parse(JSON.parse(readFileSync(file, "utf8")));
}

export interface SeedReport {
  dataset: string;
  inserted: number;
  skipped: number;
  documents: number;
  errors: { code: string; error: string }[];
}

function sha256File(p: string): { sha: string; size: number } {
  const buf = readFileSync(p);
  return { sha: createHash("sha256").update(buf).digest("hex"), size: statSync(p).size };
}

/** Stesso schema JSON di writeAudit (src/infrastructure/audit.ts): usato qui per costruire in
 *  blocco, in memoria, la catena di hash di molte voci di audit senza una SELECT per riga (DEC-115). */
const auditJson = (v: unknown) => (v === undefined ? null : JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));

/**
 * INSERT multi-riga (DEC-115): un solo round trip di rete per N righe invece di N, essenziale
 * contro un Postgres remoto condiviso (dev/test/prod). Nessun ON CONFLICT: usato solo per le
 * tabelle figlie del seed, mai idempotenti di per sé (la procedura intera è già protetta dal
 * controllo "esiste già" a monte e dalla transazione che la racchiude).
 */
function buildMultiRowInsert(table: string, columns: string[], rows: unknown[][], suffix = ""): { sql: string; values: unknown[] } {
  const placeholders = rows.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
  return { sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}${suffix}`, values: rows.flat() };
}

async function batchInsert(db: Db, table: string, columns: string[], rows: unknown[][]): Promise<void> {
  if (!rows.length) return;
  const { sql, values } = buildMultiRowInsert(table, columns, rows);
  await db.prepare(sql).run(...values);
}

/** Come batchInsert, ma restituisce gli id generati nello stesso ordine delle righe in ingresso
 *  (ordine garantito da Postgres per una singola INSERT ... VALUES ... RETURNING senza ON CONFLICT). */
async function batchInsertReturningIds(db: Db, table: string, columns: string[], rows: unknown[][]): Promise<number[]> {
  if (!rows.length) return [];
  const { sql, values } = buildMultiRowInsert(table, columns, rows, " RETURNING id");
  const result = (await db.prepare(sql).all(...values)) as { id: number }[];
  return result.map((r) => r.id);
}

/** Procedure per blocco (DEC-115): limita la dimensione di ogni INSERT multi-riga, qualunque sia
 *  la taglia del dataset (il limite di Postgres è 65535 parametri per singola query). */
const CHUNK_SIZE = 250;

/** Import idempotente: le procedure già presenti (per codice) non vengono duplicate (BR-016, T-002). */
export async function seedDataset(db: Db, ds: SeedDataset, clock: Clock, documentsRoot: string | null, actor = "seed"): Promise<SeedReport> {
  const templates = loadTemplates();
  const cal = new BusinessCalendar();
  const report: SeedReport = { dataset: ds.dataset, inserted: 0, skipped: 0, documents: 0, errors: [] };
  const codes = ds.procedures.map((p) => p.code);
  const existingRows = codes.length ? ((await db.prepare("SELECT code FROM procedures WHERE code = ANY(?)").all(codes)) as { code: string }[]) : [];
  const existing = new Set(existingRows.map((r) => r.code));
  const toInsert = ds.procedures.filter((p) => !existing.has(p.code));
  report.skipped = ds.procedures.length - toInsert.length;

  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    try {
      await tx(db, (tdb) => insertProcedureBatch(tdb, ds.dataset, chunk, templates, cal, clock, documentsRoot, actor, report));
      report.inserted += chunk.length;
    } catch {
      // Il blocco è fallito (ed è stato annullato per intero): si ripete una procedura alla volta
      // per isolare quale/i hanno un errore, mantenendo il contratto originale (un errore per codice).
      for (const p of chunk) {
        try {
          await tx(db, (tdb) => insertProcedureBatch(tdb, ds.dataset, [p], templates, cal, clock, documentsRoot, actor, report));
          report.inserted++;
        } catch (e2) {
          report.errors.push({ code: p.code, error: e2 instanceof Error ? e2.message : String(e2) });
        }
      }
    }
  }
  return report;
}

/** Inserisce molte procedure in blocco (DEC-115): una sola INSERT multi-riga per tabella invece di
 *  una per procedura. Stessa transazione/stesso atomicità del vecchio insertProcedure per-riga. */
async function insertProcedureBatch(
  db: Db,
  dataset: string,
  procedures: SeedProcedure[],
  templates: ReturnType<typeof loadTemplates>,
  cal: BusinessCalendar,
  clock: Clock,
  documentsRoot: string | null,
  actor: string,
  report: SeedReport,
): Promise<void> {
  const now = clock.nowIso();
  const aggs = new Map(procedures.map((p) => [p.code, buildAggregateFromSeed(p, templates, cal, DEFAULT_SETTINGS, familyOfDataset(dataset))]));

  // --- Procedure
  const procRows = procedures.map((p) => {
    const agg = aggs.get(p.code)!;
    return [
      p.code, dataset, p.title, p.structure, p.type, p.awardCriterion ?? null, p.instrument ?? null, agg.template.code, agg.programmed.cents,
      p.documentsTracked === false ? 0 : 1, agg.costComponents.cents, p.cig ?? `CIG-DEMO-${p.code.replace("-", "")}`, p.cup ?? `CUP-DEMO-${p.code.replace("-", "")}`,
      p.sourceKey ?? null, p.operation ?? null, p.activityStart ?? null, p.activityEnd ?? null, p.sourceStatus ?? null, p.iterText ?? null, p.sourceRow ?? null,
      p.operator ?? null, now,
    ];
  });
  const procIds = await batchInsertReturningIds(
    db,
    "procedures",
    [
      "code", "dataset", "title", "structure_code", "procedure_type", "award_criterion", "instrument", "template_code", "programmed_cents",
      "documents_tracked", "anac_fee_cents", "cig", "cup", "source_key", "operation", "activity_start", "activity_end", "source_status", "iter_text",
      "source_row", "operator_code", "created_at",
    ],
    procRows,
  );
  const idByCode = new Map(procedures.map((p, i) => [p.code, procIds[i]!]));

  // --- Versioni: una riga (V1 baseline) o due (baseline storica + corrente) per procedura, in un'unica INSERT per tutto il blocco.
  const versionRows: unknown[][] = [];
  const versionPlan: { code: string; hasBaseline: boolean }[] = [];
  for (const p of procedures) {
    const pid = idByCode.get(p.code)!;
    const agg = aggs.get(p.code)!;
    if (p.baseline) {
      versionRows.push([pid, 1, 1, p.baseline.label, "Programmazione importata (versione precedente del Piano)", agg.programmed.cents, actor, now, actor, now]);
      versionRows.push([pid, 2, 0, p.currentLabel ?? "V2 – corrente", "Versione corrente del Piano (import)", agg.programmed.cents, actor, now, actor, now]);
      versionPlan.push({ code: p.code, hasBaseline: true });
    } else {
      versionRows.push([pid, 1, 1, "V1 – baseline", "Programmazione importata", agg.programmed.cents, actor, now, actor, now]);
      versionPlan.push({ code: p.code, hasBaseline: false });
    }
  }
  const versionIds = await batchInsertReturningIds(
    db,
    "procedure_versions",
    ["procedure_id", "version_no", "is_baseline", "label", "reason", "programmed_cents", "created_by", "created_at", "approved_by", "approved_at"],
    versionRows,
  );
  const bidByCode = new Map<string, number | null>();
  const vidByCode = new Map<string, number>();
  let vi = 0;
  for (const s of versionPlan) {
    if (s.hasBaseline) {
      bidByCode.set(s.code, versionIds[vi]!);
      vidByCode.set(s.code, versionIds[vi + 1]!);
      vi += 2;
    } else {
      bidByCode.set(s.code, null);
      vidByCode.set(s.code, versionIds[vi]!);
      vi += 1;
    }
  }

  // --- current_version_id in blocco (UPDATE ... FROM VALUES): un round trip per tutto il blocco.
  const cvRows = procedures.map((p) => [idByCode.get(p.code)!, vidByCode.get(p.code)!]);
  if (cvRows.length) {
    const placeholders = cvRows.map(() => "(?::integer, ?::integer)").join(", ");
    await db
      .prepare(`UPDATE procedures AS proc SET current_version_id = v.vid FROM (VALUES ${placeholders}) AS v(id, vid) WHERE proc.id = v.id`)
      .run(...cvRows.flat());
  }

  // --- Previsioni delle milestone e righe di previsione di spesa: baseline (se c'è) + versione corrente, per tutte le procedure del blocco.
  const mfRows: unknown[][] = [];
  const flRows: unknown[][] = [];
  const milestoneRows: unknown[][] = [];
  const budgetRows: unknown[][] = [];
  const contractRows: unknown[][] = [];
  const salRows: unknown[][] = [];
  const paymentRows: unknown[][] = [];
  const movementRows: unknown[][] = [];
  const documentRows: unknown[][] = [];
  const evidenceRows: unknown[][] = [];
  const viRows: unknown[][] = [];

  for (const p of procedures) {
    const pid = idByCode.get(p.code)!;
    const agg = aggs.get(p.code)!;
    const bid = bidByCode.get(p.code)!;
    const vid = vidByCode.get(p.code)!;

    if (bid !== null) for (const [code, date] of Object.entries(p.baseline!.milestones)) mfRows.push([bid, code, date]);
    for (const m of agg.milestones) if (m.forecastDate) mfRows.push([vid, m.code, m.forecastDate]);

    if (bid !== null) for (const l of agg.forecastLines) flRows.push([bid, l.id, l.date, l.amount.cents, l.anchorType, l.anchorRef, l.source]);
    for (const l of agg.forecastLines) flRows.push([vid, l.id, l.date, l.amount.cents, l.anchorType, l.anchorRef, l.source]);

    for (const m of agg.milestones) milestoneRows.push([pid, m.code, m.actualDate, m.manualState, m.manualBlocker, m.actualDate ? actor : null, m.actualDate ? now : null]);

    for (const b of agg.budget) budgetRows.push([pid, b.year, b.source, b.amount.cents]);

    if (p.contract) {
      contractRows.push([
        pid, p.contract.signed ? 1 : 0, p.contract.supplier ?? null, Money.parse(p.contract.net).cents, Money.parse(p.contract.vat).cents,
        Money.parse(p.contract.gross).cents, p.contract.signedDate ?? null, p.contract.startDate ?? null, p.contract.endDate ?? null,
      ]);
    }

    for (const s of agg.sals)
      salRows.push([pid, s.seq, s.pctHundredths, s.amount.cents, s.state, s.dueDate, s.submittedDate, s.reviewDueDate, s.invoiceDate, s.paymentDueDate, s.accepted.cents, s.liquidated.cents]);

    for (const x of p.payments) paymentRows.push([pid, x.sal, Money.parse(x.amount).cents, x.date, x.reference ?? null, actor, now]);

    for (const m of p.movements) movementRows.push([pid, m.type, Money.parse(m.amount).cents, m.year, m.date, "seed", actor, now]);

    for (const d of p.documents) {
      const full = documentsRoot ? path.join(documentsRoot, d.file.replace(/^casi:/, "")) : null;
      const meta = full && existsSync(full) ? sha256File(full) : { sha: createHash("sha256").update(`${p.code}:${d.file}`).digest("hex"), size: 0 };
      report.documents++;
      documentRows.push([pid, d.file, path.basename(d.file), meta.sha, meta.size, d.type, d.subtype ?? null, d.title ?? null, actor, now, "SEED", "1.00"]);
    }

    const locator = p.sourceRow ? `Gare_23-27!R${p.sourceRow}` : `${dataset}/procedures.json#${p.code}`;
    evidenceRows.push([pid, "programmed", agg.programmed.toString(), "SEED_FILE", locator, p.title, "IMPORT", "1.00", actor, now]);
    for (const m of agg.milestones)
      if (m.actualDate) evidenceRows.push([pid, `milestone.${m.code}.actual`, m.actualDate, "SEED_FILE", locator, null, "IMPORT", "1.00", actor, now]);

    for (const x of p.extractionProposals) {
      const current = x.field === "contract.gross" && p.contract ? Money.parse(p.contract.gross).toString() : null;
      const kind = current !== null && current !== x.value ? "CONFLICT" : "EXTRACTED_FIELD";
      viRows.push([pid, kind, x.field, x.value, current, pid, x.document, x.page ? `pag. ${x.page}` : null, x.excerpt, x.confidence, now]);
    }
    if (p.rescheduleProposal) {
      viRows.push([pid, "RESCHEDULE", `${p.rescheduleProposal.source}.date`, p.rescheduleProposal.candidate, null, pid, "", "Workbook: Proposta riprogrammazione", p.rescheduleProposal.note ?? null, "1.00", now]);
    }
  }

  await batchInsert(db, "milestone_forecasts", ["version_id", "milestone_code", "date"], mfRows);
  await batchInsert(db, "forecast_lines", ["version_id", "line_key", "date", "amount_cents", "anchor_type", "anchor_ref", "source"], flRows);
  await batchInsert(db, "milestones", ["procedure_id", "code", "actual_date", "manual_state", "manual_blocker", "completed_by", "completed_at"], milestoneRows);
  await batchInsert(db, "budget_allocations", ["procedure_id", "year", "source", "amount_cents"], budgetRows);
  await batchInsert(db, "contracts", ["procedure_id", "signed", "supplier_code", "net_cents", "vat_cents", "gross_cents", "signed_date", "start_date", "end_date"], contractRows);
  await batchInsert(
    db,
    "sals",
    ["procedure_id", "seq", "pct_hundredths", "amount_cents", "state", "due_date", "submitted_date", "review_due_date", "invoice_date", "payment_due_date", "accepted_cents", "liquidated_cents"],
    salRows,
  );
  await batchInsert(db, "payments", ["procedure_id", "sal_seq", "amount_cents", "date", "reference", "created_by", "created_at"], paymentRows);
  await batchInsert(db, "financial_movements", ["procedure_id", "type", "amount_cents", "year", "date", "reference", "created_by", "created_at"], movementRows);
  await batchInsert(
    db,
    "documents",
    ["procedure_id", "file_path", "file_name", "sha256", "size_bytes", "doc_type", "subtype", "title", "uploaded_by", "uploaded_at", "association_method", "association_confidence"],
    documentRows,
  );
  await batchInsert(db, "evidences", ["procedure_id", "field", "value", "source_type", "locator", "excerpt", "method", "confidence", "author", "created_at"], evidenceRows);

  if (viRows.length) {
    const placeholders = viRows.map(() => "(?, ?, ?, ?, ?, (SELECT id FROM documents WHERE procedure_id = ? AND file_path = ?), ?, ?, 'SEED_EXTRACTION', ?, ?)").join(", ");
    await db
      .prepare(
        `INSERT INTO validation_items (procedure_id, kind, field, proposed_value, current_value, document_id, locator, excerpt, method, confidence, created_at)
         VALUES ${placeholders}
         ON CONFLICT (procedure_id, kind, field, document_id, proposed_value) DO NOTHING`,
      )
      .run(...viRows.flat());
  }

  // --- Audit (catena di hash, DEC-115): calcolata in sequenza in memoria, una sola INSERT multi-riga.
  const prevRow = (await db.prepare("SELECT hash FROM audit_events ORDER BY id DESC LIMIT 1").get()) as { hash: string } | undefined;
  let prevHash: string | null = prevRow?.hash ?? null;
  const auditRows: unknown[][] = [];
  for (const p of procedures) {
    const agg = aggs.get(p.code)!;
    const row = {
      at: now,
      actor,
      impersonated_by: null as string | null,
      action: "IMPORT",
      entity_type: "PROCEDURE",
      entity_id: p.code,
      procedure_code: p.code,
      before_json: auditJson(undefined),
      after_json: auditJson({ dataset, template: agg.template.code }),
      reason: null as string | null,
      correlation_id: randomUUID(),
      prev_hash: prevHash,
    };
    const hash = createHash("sha256").update(JSON.stringify(row)).digest("hex");
    auditRows.push([row.at, row.actor, row.impersonated_by, row.action, row.entity_type, row.entity_id, row.procedure_code, row.before_json, row.after_json, row.reason, row.correlation_id, row.prev_hash, hash]);
    prevHash = hash;
  }
  await batchInsert(
    db,
    "audit_events",
    ["at", "actor", "impersonated_by", "action", "entity_type", "entity_id", "procedure_code", "before_json", "after_json", "reason", "correlation_id", "prev_hash", "hash"],
    auditRows,
  );

  // --- Eventi (CANCEL/CLOSE, rari): restano per procedura, hanno una logica di dominio propria (DEC-115 non li tocca).
  for (const p of procedures) {
    const pid = idByCode.get(p.code)!;
    for (const e of p.events) {
      if (e.type === "CANCEL") await cancelProcedureTx(db, pid, e.reason, actor, e.date, clock);
      if (e.type === "CLOSE") await closeProcedureTx(db, pid, e.reason, actor, e.date, clock);
    }
  }
}
