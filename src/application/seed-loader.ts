import { hashSync } from "@node-rs/argon2";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { SeedDataset, type SeedProcedure } from "@/contracts/seed";
import { BusinessCalendar } from "@/domain/dates";
import { DEFAULT_SETTINGS, type TemplateFamily } from "@/domain/model";
import { Money } from "@/domain/money";
import { writeAudit } from "@/infrastructure/audit";
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

export function seedReference(db: Db, clock: Clock, password = process.env.DEMO_PASSWORD ?? "Demo2026!"): void {
  const ref = JSON.parse(readFileSync(path.join(projectRoot(), "seed", "reference.json"), "utf8")) as Reference;
  const hash = hashSync(password, ARGON_OPTS);
  tx(db, () => {
    const st = db.prepare("INSERT OR IGNORE INTO structures (code, name) VALUES (?, ?)");
    for (const s of ref.structures) st.run(s.code, s.name);
    const su = db.prepare("INSERT OR IGNORE INTO suppliers (code, name) VALUES (?, ?)");
    for (const s of ref.suppliers) su.run(s.code, s.name);
    const us = db.prepare(
      "INSERT OR IGNORE INTO users (login, name, email, password_hash, role, structure_scope, supplier_code) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const u of ref.users) us.run(u.login, u.name, `${u.login}@demo.invalid`, hash, u.role, u.structureScope, u.supplier ?? null);
    const cfg = db.prepare("INSERT OR IGNORE INTO config (key, value_json, updated_at, updated_by) VALUES (?, ?, ?, 'seed')");
    cfg.run("demo.reference_date", JSON.stringify(process.env.APP_REFERENCE_DATE ?? "2026-10-01"), clock.nowIso());
    cfg.run("engine.settings", JSON.stringify(DEFAULT_SETTINGS), clock.nowIso());
    cfg.run("llm.provider", JSON.stringify("disabled"), clock.nowIso());
    cfg.run("ocr.enabled", JSON.stringify(true), clock.nowIso());
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

/** Import idempotente: le procedure già presenti (per codice) non vengono duplicate (BR-016, T-002). */
export function seedDataset(db: Db, ds: SeedDataset, clock: Clock, documentsRoot: string | null, actor = "seed"): SeedReport {
  const templates = loadTemplates();
  const cal = new BusinessCalendar();
  const report: SeedReport = { dataset: ds.dataset, inserted: 0, skipped: 0, documents: 0, errors: [] };
  for (const p of ds.procedures) {
    const exists = db.prepare("SELECT id FROM procedures WHERE code = ?").get(p.code);
    if (exists) {
      report.skipped++;
      continue;
    }
    try {
      tx(db, () => insertProcedure(db, ds.dataset, p, templates, cal, clock, documentsRoot, actor, report));
      report.inserted++;
    } catch (e) {
      report.errors.push({ code: p.code, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return report;
}

function insertProcedure(
  db: Db,
  dataset: string,
  p: SeedProcedure,
  templates: ReturnType<typeof loadTemplates>,
  cal: BusinessCalendar,
  clock: Clock,
  documentsRoot: string | null,
  actor: string,
  report: SeedReport,
): void {
  const now = clock.nowIso();
  const agg = buildAggregateFromSeed(p, templates, cal, DEFAULT_SETTINGS, familyOfDataset(dataset));
  const info = db
    .prepare(
      `INSERT INTO procedures (code, dataset, title, structure_code, procedure_type, award_criterion, instrument, template_code, programmed_cents,
         documents_tracked, anac_fee_cents, cig, cup, source_key, operation, activity_start, activity_end, source_status, iter_text, source_row, created_at)
       VALUES (@code, @dataset, @title, @structure, @type, @crit, @instr, @tpl, @prog, @dt, @fee, @cig, @cup, @sk, @op, @as, @ae, @ss, @iter, @row, @now)`,
    )
    .run({
      code: p.code,
      dataset,
      title: p.title,
      structure: p.structure,
      type: p.type,
      crit: p.awardCriterion ?? null,
      instr: p.instrument ?? null,
      tpl: agg.template.code,
      prog: agg.programmed.cents,
      fee: agg.costComponents.cents,
      dt: p.documentsTracked === false ? 0 : 1,
      cig: p.cig ?? `CIG-DEMO-${p.code.replace("-", "")}`,
      cup: p.cup ?? `CUP-DEMO-${p.code.replace("-", "")}`,
      sk: p.sourceKey ?? null,
      op: p.operation ?? null,
      as: p.activityStart ?? null,
      ae: p.activityEnd ?? null,
      ss: p.sourceStatus ?? null,
      iter: p.iterText ?? null,
      row: p.sourceRow ?? null,
      now,
    });
  const pid = Number(info.lastInsertRowid);
  if (p.operator) db.prepare("UPDATE procedures SET operator_code = ? WHERE id = ?").run(p.operator, pid);
  const insVersion = db.prepare(
    `INSERT INTO procedure_versions (procedure_id, version_no, is_baseline, label, reason, programmed_cents, created_by, created_at, approved_by, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const mf = db.prepare("INSERT INTO milestone_forecasts (version_id, milestone_code, date) VALUES (?, ?, ?)");
  const fl = db.prepare("INSERT INTO forecast_lines (version_id, line_key, date, amount_cents, anchor_type, anchor_ref, source) VALUES (?, ?, ?, ?, ?, ?, ?)");
  let vid: number;
  if (p.baseline) {
    // Baseline = versione precedente del Piano (es. V3); corrente = V4 (DEC-024, M-18)
    const b = Number(insVersion.run(pid, 1, 1, p.baseline.label, "Programmazione importata (versione precedente del Piano)", agg.programmed.cents, actor, now, actor, now).lastInsertRowid);
    for (const [code, date] of Object.entries(p.baseline.milestones)) mf.run(b, code, date);
    for (const l of agg.forecastLines) fl.run(b, l.id, l.date, l.amount.cents, l.anchorType, l.anchorRef, l.source);
    vid = Number(insVersion.run(pid, 2, 0, p.currentLabel ?? "V2 – corrente", "Versione corrente del Piano (import)", agg.programmed.cents, actor, now, actor, now).lastInsertRowid);
  } else {
    vid = Number(insVersion.run(pid, 1, 1, "V1 – baseline", "Programmazione importata", agg.programmed.cents, actor, now, actor, now).lastInsertRowid);
  }
  db.prepare("UPDATE procedures SET current_version_id = ? WHERE id = ?").run(vid, pid);

  const mi = db.prepare("INSERT INTO milestones (procedure_id, code, actual_date, manual_state, manual_blocker, completed_by, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const m of agg.milestones) {
    if (m.forecastDate) mf.run(vid, m.code, m.forecastDate);
    mi.run(pid, m.code, m.actualDate, m.manualState, m.manualBlocker, m.actualDate ? actor : null, m.actualDate ? now : null);
  }
  for (const l of agg.forecastLines) fl.run(vid, l.id, l.date, l.amount.cents, l.anchorType, l.anchorRef, l.source);

  const ba = db.prepare("INSERT INTO budget_allocations (procedure_id, year, source, amount_cents) VALUES (?, ?, ?, ?)");
  for (const b of agg.budget) ba.run(pid, b.year, b.source, b.amount.cents);

  if (p.contract) {
    db.prepare(
      `INSERT INTO contracts (procedure_id, signed, supplier_code, net_cents, vat_cents, gross_cents, signed_date, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      pid,
      p.contract.signed ? 1 : 0,
      p.contract.supplier ?? null,
      Money.parse(p.contract.net).cents,
      Money.parse(p.contract.vat).cents,
      Money.parse(p.contract.gross).cents,
      p.contract.signedDate ?? null,
      p.contract.startDate ?? null,
      p.contract.endDate ?? null,
    );
  }
  const si = db.prepare(
    `INSERT INTO sals (procedure_id, seq, pct_hundredths, amount_cents, state, due_date, submitted_date, review_due_date, invoice_date, payment_due_date, accepted_cents, liquidated_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const s of agg.sals) {
    si.run(pid, s.seq, s.pctHundredths, s.amount.cents, s.state, s.dueDate, s.submittedDate, s.reviewDueDate, s.invoiceDate, s.paymentDueDate, s.accepted.cents, s.liquidated.cents);
  }
  const pi = db.prepare("INSERT INTO payments (procedure_id, sal_seq, amount_cents, date, reference, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const x of p.payments) pi.run(pid, x.sal, Money.parse(x.amount).cents, x.date, x.reference ?? null, actor, now);
  const mv = db.prepare("INSERT INTO financial_movements (procedure_id, type, amount_cents, year, date, reference, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  for (const m of p.movements) mv.run(pid, m.type, Money.parse(m.amount).cents, m.year, m.date, "seed", actor, now);

  // Documenti (metadati + hash del file se presente)
  const di = db.prepare(
    `INSERT INTO documents (procedure_id, file_path, file_name, sha256, size_bytes, doc_type, subtype, title, uploaded_by, uploaded_at, association_method, association_confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SEED', '1.00')`,
  );
  for (const d of p.documents) {
    const full = documentsRoot ? path.join(documentsRoot, d.file.replace(/^casi:/, "")) : null;
    const meta = full && existsSync(full) ? sha256File(full) : { sha: createHash("sha256").update(`${p.code}:${d.file}`).digest("hex"), size: 0 };
    di.run(pid, d.file, path.basename(d.file), meta.sha, meta.size, d.type, d.subtype ?? null, d.title ?? null, actor, now);
    report.documents++;
  }

  // Evidenze della fonte (BR-014): il workbook/seed è la sorgente dei valori programmati
  const ev = db.prepare(
    "INSERT INTO evidences (procedure_id, field, value, source_type, locator, excerpt, method, confidence, author, created_at) VALUES (?, ?, ?, 'SEED_FILE', ?, ?, 'IMPORT', '1.00', ?, ?)",
  );
  const locator = p.sourceRow ? `Gare_23-27!R${p.sourceRow}` : `${dataset}/procedures.json#${p.code}`;
  ev.run(pid, "programmed", agg.programmed.toString(), locator, p.title, actor, now);
  for (const m of agg.milestones) if (m.actualDate) ev.run(pid, `milestone.${m.code}.actual`, m.actualDate, locator, null, actor, now);

  // Proposte di estrazione "seed" (I5): conflitto se diverso dal validato
  const vi = db.prepare(
    `INSERT OR IGNORE INTO validation_items (procedure_id, kind, field, proposed_value, current_value, document_id, locator, excerpt, method, confidence, created_at)
     VALUES (?, ?, ?, ?, ?, (SELECT id FROM documents WHERE procedure_id = ? AND file_path = ?), ?, ?, 'SEED_EXTRACTION', ?, ?)`,
  );
  for (const x of p.extractionProposals) {
    const current = x.field === "contract.gross" && p.contract ? Money.parse(p.contract.gross).toString() : null;
    const kind = current !== null && current !== x.value ? "CONFLICT" : "EXTRACTED_FIELD";
    vi.run(pid, kind, x.field, x.value, current, pid, x.document, x.page ? `pag. ${x.page}` : null, x.excerpt, x.confidence, now);
  }
  if (p.rescheduleProposal) {
    vi.run(pid, "RESCHEDULE", `${p.rescheduleProposal.source}.date`, p.rescheduleProposal.candidate, null, pid, "", "Workbook: Proposta riprogrammazione", p.rescheduleProposal.note ?? null, "1.00", now);
  }

  writeAudit(db, { actor, action: "IMPORT", entityType: "PROCEDURE", entityId: p.code, procedureCode: p.code, after: { dataset, template: agg.template.code }, at: now });

  for (const e of p.events) {
    if (e.type === "CANCEL") cancelProcedureTx(db, pid, e.reason, actor, e.date, clock);
    if (e.type === "CLOSE") closeProcedureTx(db, pid, e.reason, actor, e.date, clock);
  }
}
