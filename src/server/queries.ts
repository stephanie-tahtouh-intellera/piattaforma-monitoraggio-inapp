import { centsToString } from "@/contracts/format";
import { BusinessCalendar, daysBetween, type IsoDate } from "@/domain/dates";
import { evaluateProcedure } from "@/domain/evaluate";
import { mapToRecord } from "@/domain/finance";
import { alternatives, fastestCandidate } from "@/domain/reschedule";
import { calendarFromDb, engineSettings } from "@/application/run-checks";
import { configuredReferenceDate } from "@/infrastructure/clock";
import type { Db } from "@/infrastructure/db/connection";
import { loadAggregate } from "@/infrastructure/repo/procedures";
import type { Actor } from "./auth";
import { can, canCompleteStep, requireProcedure, scopeSql } from "./authz";
import { executionModuleEnabled } from "@/application/modules";
import { STATUS_STAGE } from "@/domain/model";

const money = (c: number | bigint | null | undefined) => centsToString(c ?? null);

export interface PortfolioFilters {
  q?: string;
  health?: string;
  status?: string;
  structure?: string;
  type?: string;
  year?: string;
  reschedule?: string;
  alerts?: string;
  dataset?: string;
  sort?: string;
  dir?: string;
  page?: number;
  size?: number;
}

const SORTS: Record<string, string> = {
  code: "p.code",
  title: "p.title",
  deadline: "s.next_deadline_date",
  programmed: "s.programmed_cents",
  risk: "s.at_risk_cents",
  health: "CASE s.health WHEN 'RED' THEN 0 WHEN 'AMBER' THEN 1 WHEN 'GREEN' THEN 2 ELSE 3 END",
  status: "s.status",
};

/** Portafoglio con filtri e paginazione lato server (US-011, NFR-002). */
export function listProcedures(db: Db, actor: Actor, f: PortfolioFilters) {
  const scope = scopeSql(actor);
  const where: string[] = [scope.sql];
  const params: unknown[] = [...scope.params];
  if (f.q) {
    const terms = f.q.replace(/["*]/g, " ").split(/\s+/).filter(Boolean).map((t) => `"${t}"*`).join(" ");
    if (terms) {
      where.push("p.code IN (SELECT code FROM procedure_search WHERE procedure_search MATCH ?)");
      params.push(terms);
    }
  }
  for (const [key, col] of [["health", "s.health"], ["status", "s.status"], ["structure", "p.structure_code"], ["type", "p.procedure_type"], ["dataset", "p.dataset"]] as const) {
    const v = f[key];
    if (v) {
      const vals = v.split(",").filter(Boolean);
      where.push(`${col} IN (${vals.map(() => "?").join(",")})`);
      params.push(...vals);
    }
  }
  if (f.year) {
    where.push("p.id IN (SELECT procedure_id FROM procedure_snapshot_year WHERE year = ? AND need_cents > 0)");
    params.push(Number(f.year));
  }
  if (f.reschedule === "1") where.push("s.reschedule_required = 1");
  if (f.alerts === "critical") where.push("s.critical_alerts > 0");
  if (f.alerts === "open") where.push("s.open_alerts > 0");
  const whereSql = where.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM procedures p JOIN procedure_snapshot s ON s.procedure_id = p.id WHERE ${whereSql}`).get(...params) as { n: number }).n;
  const sort = SORTS[f.sort ?? "health"] ?? SORTS.health;
  const dir = f.dir === "desc" ? "DESC" : "ASC";
  const size = Math.min(Math.max(f.size ?? 25, 1), 100);
  const page = Math.max(f.page ?? 1, 1);
  const rows = db
    .prepare(
      `SELECT p.code, p.title, p.structure_code, st.name AS structure_name, p.procedure_type, p.operation, p.dataset, s.*
       FROM procedures p JOIN procedure_snapshot s ON s.procedure_id = p.id LEFT JOIN structures st ON st.code = p.structure_code
       WHERE ${whereSql} ORDER BY ${sort} ${dir} NULLS LAST, s.next_deadline_date ASC NULLS LAST, p.code ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, size, (page - 1) * size) as Record<string, any>[];
  return {
    total,
    page,
    size,
    items: rows.map((r) => ({
      code: r.code,
      title: r.title,
      structure: r.structure_name ?? r.structure_code,
      operation: r.operation,
      type: r.procedure_type,
      status: r.status,
      health: r.health,
      healthDrivers: JSON.parse(r.health_drivers_json),
      nextDeadline: r.next_deadline_date ? { date: r.next_deadline_date, label: r.next_deadline_label, target: r.next_deadline_target, days: r.days_until } : null,
      rescheduleRequired: r.reschedule_required === 1,
      programmed: money(r.programmed_cents),
      contracted: money(r.contracted_cents),
      paid: money(r.paid_cents),
      residual: money(r.residual_cents),
      atRisk: money(r.at_risk_cents),
      openAlerts: r.open_alerts,
      criticalAlerts: r.critical_alerts,
      openAnomalies: r.open_anomalies,
      owner: r.owner,
    })),
  };
}

/** KPI direzionali (US-070, guida §8.6). */
export function dashboard(db: Db, actor: Actor, f: { structure?: string; year?: string } = {}) {
  const scope = scopeSql(actor);
  const where = [scope.sql];
  const params: unknown[] = [...scope.params];
  if (f.structure) {
    where.push("p.structure_code = ?");
    params.push(f.structure);
  }
  const w = where.join(" AND ");
  const k = db
    .prepare(
      `SELECT COUNT(*) AS total,
         SUM(CASE WHEN s.late = 1 THEN 1 ELSE 0 END) AS late,
         SUM(s.reschedule_required) AS to_reschedule,
         SUM(s.critical_alerts) AS critical_alerts,
         SUM(CASE WHEN s.status <> 'CANCELLED' THEN s.programmed_cents ELSE 0 END) AS programmed,
         SUM(COALESCE(s.contracted_cents, 0)) AS contracted,
         SUM(s.paid_cents) AS paid,
         SUM(s.at_risk_cents) AS at_risk, SUM(s.uncovered_cents) AS uncovered, SUM(s.slipping_cents) AS slipping,
         SUM(CASE WHEN s.health='GREEN' THEN 1 ELSE 0 END) AS green, SUM(CASE WHEN s.health='AMBER' THEN 1 ELSE 0 END) AS amber,
         SUM(CASE WHEN s.health='RED' THEN 1 ELSE 0 END) AS red, SUM(CASE WHEN s.health='NEUTRAL' THEN 1 ELSE 0 END) AS neutral,
         SUM(s.open_anomalies) AS anomalies, MAX(s.updated_at) AS updated_at, MAX(s.reference_date) AS reference_date
       FROM procedures p JOIN procedure_snapshot s ON s.procedure_id = p.id WHERE ${w}`,
    )
    .get(...params) as Record<string, any>;
  const years = db
    .prepare(
      `SELECT y.year, SUM(y.need_cents) AS need, SUM(y.available_cents) AS available
       FROM procedure_snapshot_year y JOIN procedures p ON p.id = y.procedure_id JOIN procedure_snapshot s ON s.procedure_id = p.id
       WHERE ${w} AND s.status <> 'CANCELLED' GROUP BY y.year ORDER BY y.year`,
    )
    .all(...params) as { year: number; need: number; available: number }[];
  const baselineYears = db
    .prepare(
      `SELECT CAST(substr(fl.date,1,4) AS INTEGER) AS year, SUM(fl.amount_cents) AS amount
       FROM forecast_lines fl JOIN procedure_versions v ON v.id = fl.version_id AND v.is_baseline = 1 JOIN procedures p ON p.id = v.procedure_id
       JOIN procedure_snapshot s ON s.procedure_id = p.id WHERE ${w} AND s.status <> 'CANCELLED' GROUP BY year ORDER BY year`,
    )
    .all(...params) as { year: number; amount: number }[];
  const attention = listProcedures(db, actor, { ...(f.structure ? { structure: f.structure } : {}), health: "RED,AMBER", sort: "health", size: 10 });
  const byStatus = db
    .prepare(`SELECT s.status, COUNT(*) AS n FROM procedures p JOIN procedure_snapshot s ON s.procedure_id = p.id WHERE ${w} GROUP BY s.status`)
    .all(...params) as { status: string; n: number }[];
  return {
    referenceDate: k.reference_date ?? configuredReferenceDate(db),
    updatedAt: k.updated_at,
    kpi: {
      proceduresTotal: k.total ?? 0,
      proceduresLate: k.late ?? 0,
      toReschedule: k.to_reschedule ?? 0,
      criticalAlerts: k.critical_alerts ?? 0,
      openAnomalies: k.anomalies ?? 0,
      programmed: money(k.programmed ?? 0),
      contracted: money(k.contracted ?? 0),
      paid: money(k.paid ?? 0),
      atRisk: { total: money(k.at_risk ?? 0), uncovered: money(k.uncovered ?? 0), slipping: money(k.slipping ?? 0) },
      health: { GREEN: k.green ?? 0, AMBER: k.amber ?? 0, RED: k.red ?? 0, NEUTRAL: k.neutral ?? 0 },
    },
    annual: years.map((y) => ({
      year: y.year,
      need: money(y.need),
      available: money(y.available),
      baseline: money(baselineYears.find((b) => b.year === y.year)?.amount ?? 0),
    })),
    byStatus,
    attention: attention.items,
  };
}

const label = (db: Db) => (code: string | null) => (code ? ((db.prepare("SELECT name FROM structures WHERE code = ?").get(code) as { name: string } | undefined)?.name ?? code) : null);

/** Scheda procedura completa (US-072): ricalcolo live dell'aggregato per la timeline. */
export function procedureDetail(db: Db, actor: Actor, code: string) {
  const p0 = requireProcedure(db, actor, code);
  const p = db.prepare("SELECT * FROM procedures WHERE id = ?").get(p0.id) as Record<string, any>;
  const ref = configuredReferenceDate(db);
  const settings = engineSettings(db);
  const agg = loadAggregate(db, p0.id);
  const ev = evaluateProcedure(agg, ref, settings);
  const versions = db.prepare("SELECT * FROM procedure_versions WHERE procedure_id = ? ORDER BY version_no").all(p0.id) as Record<string, any>[];
  const ms = db.prepare("SELECT * FROM milestones WHERE procedure_id = ?").all(p0.id) as Record<string, any>[];
  const msMap = new Map(ms.map((m) => [m.code, m]));
  const evidences = db.prepare("SELECT e.*, d.file_name FROM evidences e LEFT JOIN documents d ON d.id = e.document_id WHERE e.procedure_id = ? ORDER BY e.id").all(p0.id) as Record<string, any>[];
  const supplierView = actor.role === "SUPPLIER";
  const timeline = ev.milestones.map((m) => {
    const inst = agg.milestones.find((x) => x.code === m.code)!;
    const row = msMap.get(m.code);
    return {
      code: m.code,
      label: m.def.label,
      phase: m.def.phase,
      owner: m.def.owner,
      blocking: m.def.blocking,
      baseline: inst.baselineDate,
      forecast: inst.forecastDate,
      actual: inst.actualDate,
      state: m.state,
      active: m.active,
      blocked: m.blocked,
      blockerReason: m.blockerReason,
      daysUntil: m.daysUntil,
      deviationDays: inst.baselineDate && (inst.actualDate ?? inst.forecastDate) ? daysBetween(inst.baselineDate, (inst.actualDate ?? inst.forecastDate)!) : null,
      completedBy: row?.completed_by ?? null,
      note: row?.note ?? null,
      evidence: evidences.find((e) => e.field === `milestone.${m.code}.actual`) ?? null,
      expectedDocuments: m.def.expectedDocuments,
      key: m.def.key ?? false,
      stage: m.def.stage ?? STATUS_STAGE[m.def.phase] ?? null,
      action: m.def.action ?? null,
      canComplete: m.active && !agg.cancelled && !agg.closed && can(actor, "milestone.update") && canCompleteStep(actor, m.def.owner, p.operator_code ?? null),
    };
  });
  const module2 = executionModuleEnabled(db);
  const activeStep = timeline.find((t) => t.active) ?? null;
  const operator = p.operator_code ? (db.prepare("SELECT code, name FROM suppliers WHERE code = ?").get(p.operator_code) as { code: string; name: string }) : null;
  const byYear = (type: string) => {
    const m = new Map<number, bigint>();
    for (const x of db.prepare("SELECT year, amount_cents FROM financial_movements WHERE procedure_id = ? AND type = ?").all(p0.id, type) as { year: number; amount_cents: number }[]) m.set(x.year, (m.get(x.year) ?? 0n) + BigInt(x.amount_cents));
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([year, c]) => ({ year, amount: centsToString(c) }));
  };
  const process = {
    family: agg.template.family ?? "v1",
    variant: agg.template.variant ?? null,
    stage: ev.status === "CANCELLED" ? null : (activeStep?.stage ?? STATUS_STAGE[ev.status] ?? null),
    module2,
    activeStep: activeStep ? { code: activeStep.code, label: activeStep.label, owner: activeStep.owner, due: activeStep.forecast, canComplete: activeStep.canComplete } : null,
    operator,
    suppliers: actor.role === "PROCUREMENT_OFFICER" || actor.role === "ADMIN" ? (db.prepare("SELECT code, name FROM suppliers ORDER BY name").all() as { code: string; name: string }[]) : [],
    reservations: byYear("RESERVATION"),
    commitments: byYear("COMMITMENT"),
  };
  const contract = db.prepare("SELECT c.*, s.name AS supplier_name FROM contracts c LEFT JOIN suppliers s ON s.code = c.supplier_code WHERE c.procedure_id = ?").get(p0.id) as Record<string, any> | undefined;
  const sals = (db.prepare("SELECT * FROM sals WHERE procedure_id = ? ORDER BY seq").all(p0.id) as Record<string, any>[]).map((s) => {
    const inst = agg.sals.find((x) => x.seq === s.seq)!;
    return {
      seq: s.seq,
      pct: (s.pct_hundredths / 100).toFixed(2),
      amount: money(s.amount_cents),
      state: s.state,
      dueDate: s.due_date,
      submittedDate: s.submitted_date,
      reviewDueDate: s.review_due_date,
      invoiceDate: s.invoice_date,
      paymentDueDate: s.payment_due_date,
      accepted: money(s.accepted_cents),
      liquidated: money(s.liquidated_cents),
      paid: inst.paid.toString(),
      payable: inst.liquidated.sub(inst.paid).toString(),
      overdue: ev.deadlines.some((d) => d.target === `SAL${s.seq}` && d.kind === "SAL" && d.daysUntil < 0),
      version: s.version,
    };
  });
  const payments = (db.prepare("SELECT * FROM payments WHERE procedure_id = ? ORDER BY date, id").all(p0.id) as Record<string, any>[]).map((x) => ({
    id: x.id,
    sal: x.sal_seq,
    amount: money(x.amount_cents),
    date: x.date,
    reference: x.reference,
    state: x.state,
  }));
  const movements = (db.prepare("SELECT * FROM financial_movements WHERE procedure_id = ? ORDER BY date, id").all(p0.id) as Record<string, any>[]).map((m) => ({
    id: m.id,
    type: m.type,
    amount: money(m.amount_cents),
    year: m.year,
    date: m.date,
    reference: m.reference,
    createdBy: m.created_by,
  }));
  const alerts = db
    .prepare("SELECT * FROM alerts WHERE procedure_id = ? ORDER BY CASE status WHEN 'OPEN' THEN 0 WHEN 'ACKNOWLEDGED' THEN 1 WHEN 'SUSPENDED' THEN 2 ELSE 3 END, CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, id")
    .all(p0.id) as Record<string, any>[];
  const sims = (db.prepare("SELECT * FROM simulations WHERE procedure_id = ? ORDER BY id DESC").all(p0.id) as Record<string, any>[]).map((s) => ({
    ...s,
    result: JSON.parse(s.result_json),
    result_json: undefined,
  }));
  const documents = db.prepare("SELECT id, file_name, file_path, doc_type, subtype, title, pages, processing_state, association_method, association_confidence, uploaded_at, size_bytes FROM documents WHERE procedure_id = ? ORDER BY id").all(p0.id);
  const validations = db.prepare("SELECT * FROM validation_items WHERE procedure_id = ? ORDER BY status = 'OPEN' DESC, id").all(p0.id);
  const audit = can(actor, "audit.read") ? db.prepare("SELECT * FROM audit_events WHERE procedure_code = ? ORDER BY id DESC LIMIT 200").all(code) : [];
  const years = [...new Set([...ev.annualNeed.keys(), ...ev.available.keys()])].sort();
  const baselineLines = db.prepare("SELECT date, amount_cents FROM forecast_lines WHERE version_id = (SELECT id FROM procedure_versions WHERE procedure_id = ? AND is_baseline = 1)").all(p0.id) as { date: string; amount_cents: number }[];
  const baseByYear = new Map<number, bigint>();
  for (const l of baselineLines) baseByYear.set(Number(l.date.slice(0, 4)), (baseByYear.get(Number(l.date.slice(0, 4))) ?? 0n) + BigInt(l.amount_cents));
  const cal = calendarFromDb(db);
  const rescheduleSource = ev.deadlines.find((d) => d.kind === "MILESTONE" && d.blocking && d.daysUntil < 0)?.target ?? ev.milestones.find((m) => m.active)?.code ?? null;
  return {
    referenceDate: ref,
    supplierView,
    procedure: {
      code: p.code,
      title: p.title,
      dataset: p.dataset,
      structure: label(db)(p.structure_code),
      structureCode: p.structure_code,
      type: p.procedure_type,
      awardCriterion: p.award_criterion,
      instrument: p.instrument,
      template: agg.template.code,
      templateLabel: agg.template.label,
      cig: p.cig,
      cup: p.cup,
      operation: p.operation,
      sourceKey: p.source_key,
      sourceStatus: p.source_status,
      iterText: p.iter_text,
      sourceRow: p.source_row,
      activityStart: p.activity_start,
      activityEnd: p.activity_end,
      cancelledAt: p.cancelled_at,
      cancelReason: p.cancel_reason,
      closedAt: p.closed_at,
      version: p.version,
      anacFee: money(p.anac_fee_cents),
    },
    evaluation: {
      status: ev.status,
      health: ev.health,
      healthDrivers: ev.healthDrivers,
      nextDeadline: ev.nextDeadline,
      rescheduleRequired: ev.rescheduleRequired,
      late: ev.late,
      programmed: ev.programmed.toString(),
      contracted: ev.contracted?.toString() ?? null,
      paid: ev.paid.toString(),
      liquidated: ev.liquidated.toString(),
      residual: ev.residual.toString(),
      atRisk: { total: ev.atRisk.total.toString(), uncovered: ev.atRisk.uncovered.toString(), slipping: ev.atRisk.slipping.toString() },
      annualNeed: mapToRecord(ev.annualNeed),
      available: mapToRecord(ev.available),
      overflows: ev.overflows.map((o) => ({ year: o.year, amount: o.amount.toString() })),
      years: years.map((y) => ({
        year: y,
        need: (ev.annualNeed.get(y)?.toString()) ?? "0.00",
        available: supplierView ? null : (ev.available.get(y)?.toString() ?? "0.00"),
        baseline: centsToString(baseByYear.get(y) ?? 0n),
      })),
    },
    process,
    rescheduleSource,
    fastestCandidate: rescheduleSource && !agg.milestones.find((m) => m.code === rescheduleSource)?.actualDate ? fastestCandidate(agg, rescheduleSource, ref, cal) : null,
    timeline,
    versions,
    contract: contract
      ? {
          signed: contract.signed === 1,
          supplier: contract.supplier_name,
          net: money(contract.net_cents),
          vat: money(contract.vat_cents),
          gross: money(contract.gross_cents),
          signedDate: contract.signed_date,
          startDate: contract.start_date,
          endDate: contract.end_date,
        }
      : null,
    sals,
    payments,
    movements: supplierView ? [] : movements,
    forecastLines: supplierView ? [] : agg.forecastLines.map((l) => ({ id: l.id, date: l.date, amount: l.amount.toString(), anchor: l.anchorRef, source: l.source })),
    alerts: supplierView ? [] : alerts,
    simulations: supplierView ? [] : sims,
    documents,
    validations: supplierView ? [] : validations,
    evidences: supplierView ? [] : evidences,
    audit,
  };
}

export function previewAlternatives(db: Db, actor: Actor, code: string, source: string, manual: IsoDate | null) {
  const p = requireProcedure(db, actor, code);
  const ref = configuredReferenceDate(db);
  const agg = loadAggregate(db, p.id);
  return alternatives(agg, source, ref, calendarFromDb(db), manual);
}

export function alertsList(db: Db, actor: Actor, f: { view?: string; kind?: string; severity?: string; status?: string; procedure?: string; rule?: string }) {
  const scope = scopeSql(actor);
  const where = [scope.sql];
  const params: unknown[] = [...scope.params];
  const status = f.status ?? "OPEN,ACKNOWLEDGED,SUSPENDED";
  where.push(`a.status IN (${status.split(",").map(() => "?").join(",")})`);
  params.push(...status.split(","));
  if (f.kind) {
    where.push("a.kind = ?");
    params.push(f.kind);
  }
  if (f.severity) {
    where.push(`a.severity IN (${f.severity.split(",").map(() => "?").join(",")})`);
    params.push(...f.severity.split(","));
  }
  if (f.procedure) {
    where.push("p.code = ?");
    params.push(f.procedure);
  }
  if (f.rule) {
    where.push("a.rule = ?");
    params.push(f.rule);
  }
  if (f.view === "critical") where.push("a.severity = 'CRITICAL'");
  if (f.view === "reschedule") where.push("a.rule = 'RESCHEDULE_REQUIRED'");
  if (f.view === "finance") where.push("a.rule IN ('BUDGET_OVERFLOW','PAYMENT_DEADLINE','AMOUNTS_NOT_RECONCILED','PAYMENT_OVER_CONTRACT','SAL_DEADLINE')");
  if (f.view === "mine") {
    where.push("a.id IN (SELECT alert_id FROM alert_notifications WHERE user_id = ?)");
    params.push(actor.userId);
  }
  const rows = db
    .prepare(
      `SELECT a.*, p.code AS procedure_code, p.title AS procedure_title, p.structure_code
       FROM alerts a JOIN procedures p ON p.id = a.procedure_id
       WHERE ${where.join(" AND ")}
       ORDER BY CASE a.severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, a.due_date ASC NULLS LAST, a.id LIMIT 500`,
    )
    .all(...params);
  return { items: rows };
}

export function notificationsFor(db: Db, actor: Actor) {
  return db
    .prepare(
      `SELECT n.id, n.level, n.created_at, a.title, a.severity, a.rule, p.code AS procedure_code,
         (SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.user_id = ?) AS read
       FROM alert_notifications n JOIN alerts a ON a.id = n.alert_id JOIN procedures p ON p.id = a.procedure_id
       WHERE n.user_id = ? AND n.channel = 'IN_APP' ORDER BY n.id DESC LIMIT 50`,
    )
    .all(actor.userId, actor.userId);
}

export function auditList(db: Db, f: { procedure?: string; actor?: string; action?: string; limit?: number }) {
  const where = ["1=1"];
  const params: unknown[] = [];
  if (f.procedure) {
    where.push("procedure_code = ?");
    params.push(f.procedure);
  }
  if (f.actor) {
    where.push("actor = ?");
    params.push(f.actor);
  }
  if (f.action) {
    where.push("action = ?");
    params.push(f.action);
  }
  return db.prepare(`SELECT * FROM audit_events WHERE ${where.join(" AND ")} ORDER BY id DESC LIMIT ?`).all(...params, Math.min(f.limit ?? 200, 1000));
}

export function systemStatus(db: Db) {
  const hb = db.prepare("SELECT * FROM worker_heartbeat ORDER BY beat_at DESC LIMIT 1").get() as { beat_at: string } | undefined;
  const meta = Object.fromEntries((db.prepare("SELECT key, value FROM system_meta").all() as { key: string; value: string }[]).map((r) => [r.key, r.value]));
  const outbox = db.prepare("SELECT status, COUNT(*) AS n FROM outbox GROUP BY status").all();
  const jobs = db.prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT 20").all();
  const imports = db.prepare("SELECT id, dataset, source_file, created_at, summary_json FROM import_reports ORDER BY id DESC LIMIT 5").all();
  const llm = db.prepare("SELECT value_json FROM config WHERE key = 'llm.provider'").get() as { value_json: string } | undefined;
  return {
    referenceDate: configuredReferenceDate(db),
    dataset: meta.dataset ?? null,
    seededAt: meta.seeded_at ?? null,
    worker: hb ? { lastBeat: hb.beat_at } : null,
    outbox,
    jobs,
    imports,
    llmProvider: llm ? JSON.parse(llm.value_json) : "disabled",
  };
}
