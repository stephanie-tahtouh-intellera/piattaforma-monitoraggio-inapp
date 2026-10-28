import { isoDate, type IsoDate } from "@/domain/dates";
import type {
  AwardCriterion,
  ForecastLine,
  Instrument,
  MilestoneInstance,
  ProcedureAggregate,
  ProcedureType,
  SalInstance,
  SalState,
} from "@/domain/model";
import { Money } from "@/domain/money";
import { templateByCode } from "../config/templates";
import type { Db } from "../db/connection";

export const cents = (v: number | bigint | null | undefined): Money => Money.ofCents(BigInt(v ?? 0));
const dt = (v: string | null | undefined): IsoDate | null => (v ? isoDate(v) : null);

export interface ProcedureRow {
  id: number;
  code: string;
  dataset: string;
  title: string;
  structure_code: string;
  procedure_type: ProcedureType;
  award_criterion: AwardCriterion | null;
  instrument: Instrument | null;
  template_code: string;
  programmed_cents: number;
  anac_fee_cents: number;
  base_cents: number | null;
  vat_pct_hundredths: number;
  has_dec: number;
  incentive_pct_hundredths: number;
  incentive_cents: number;
  documents_tracked: number;
  is_draft: number;
  cig: string | null;
  cup: string | null;
  source_key: string | null;
  operation: string | null;
  activity_start: string | null;
  activity_end: string | null;
  source_status: string | null;
  iter_text: string | null;
  source_row: number | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  closed_at: string | null;
  current_version_id: number | null;
  version: number;
}

export async function getProcedureByCode(db: Db, code: string): Promise<ProcedureRow | undefined> {
  return (await db.prepare("SELECT * FROM procedures WHERE code = ?").get(code)) as ProcedureRow | undefined;
}

export async function getProcedureById(db: Db, id: number): Promise<ProcedureRow | undefined> {
  return (await db.prepare("SELECT * FROM procedures WHERE id = ?").get(id)) as ProcedureRow | undefined;
}

export async function baselineVersionId(db: Db, procedureId: number): Promise<number | null> {
  const r = (await db.prepare("SELECT id FROM procedure_versions WHERE procedure_id = ? AND is_baseline = 1").get(procedureId)) as
    | { id: number }
    | undefined;
  return r?.id ?? null;
}

/** Carica l'aggregato di dominio dalla versione corrente (forecast) e dalla baseline. */
export async function loadAggregate(db: Db, procedureId: number): Promise<ProcedureAggregate> {
  const p = await getProcedureById(db, procedureId);
  if (!p) throw new Error(`Procedura ${procedureId} non trovata`);
  const template = templateByCode(p.template_code);
  const versionId = p.current_version_id;
  const baseId = await baselineVersionId(db, procedureId);

  const fcRows = (await db.prepare("SELECT milestone_code, date FROM milestone_forecasts WHERE version_id = ?").all(versionId)) as {
    milestone_code: string;
    date: string;
  }[];
  const fc = new Map(fcRows.map((r) => [r.milestone_code, r.date]));
  const blRows = (await db.prepare("SELECT milestone_code, date FROM milestone_forecasts WHERE version_id = ?").all(baseId)) as {
    milestone_code: string;
    date: string;
  }[];
  const bl = new Map(blRows.map((r) => [r.milestone_code, r.date]));
  const msRows = (await db.prepare("SELECT * FROM milestones WHERE procedure_id = ?").all(procedureId)) as {
    code: string;
    actual_date: string | null;
    manual_state: MilestoneInstance["manualState"];
    manual_blocker: string | null;
  }[];
  const ms = new Map(msRows.map((r) => [r.code, r]));
  const milestones: MilestoneInstance[] = template.milestones.map((def) => {
    const r = ms.get(def.code);
    return {
      code: def.code,
      baselineDate: dt(bl.get(def.code)),
      forecastDate: dt(fc.get(def.code)),
      actualDate: dt(r?.actual_date),
      manualState: r?.manual_state ?? null,
      manualBlocker: r?.manual_blocker ?? null,
    };
  });

  const paymentRows = (await db.prepare("SELECT * FROM payments WHERE procedure_id = ? ORDER BY date, id").all(procedureId)) as {
    sal_seq: number | null;
    amount_cents: number;
    date: string;
    state: string;
  }[];
  const payments = paymentRows.map((r) => ({
    salSeq: r.sal_seq,
    amount: cents(r.amount_cents),
    date: isoDate(r.date),
    valid: r.state === "EXECUTED",
  }));

  const salRows = (await db.prepare("SELECT * FROM sals WHERE procedure_id = ? ORDER BY seq").all(procedureId)) as {
    seq: number;
    pct_hundredths: number;
    amount_cents: number;
    state: SalState;
    due_date: string | null;
    submitted_date: string | null;
    review_due_date: string | null;
    invoice_date: string | null;
    payment_due_date: string | null;
    accepted_cents: number;
    liquidated_cents: number;
  }[];
  const sals: SalInstance[] = salRows.map((r) => ({
    seq: r.seq,
    pctHundredths: BigInt(r.pct_hundredths),
    amount: cents(r.amount_cents),
    state: r.state,
    dueDate: dt(r.due_date),
    submittedDate: dt(r.submitted_date),
    reviewDueDate: dt(r.review_due_date),
    invoiceDate: dt(r.invoice_date),
    paymentDueDate: dt(r.payment_due_date),
    accepted: cents(r.accepted_cents),
    liquidated: cents(r.liquidated_cents),
    paid: Money.sum(payments.filter((x) => x.valid && x.salSeq === r.seq).map((x) => x.amount)),
  }));

  const lineRows = (await db.prepare("SELECT * FROM forecast_lines WHERE version_id = ? ORDER BY date, id").all(versionId)) as {
    line_key: string;
    date: string;
    amount_cents: number;
    anchor_type: "MILESTONE" | "SAL";
    anchor_ref: string;
    source: string | null;
  }[];
  const lines: ForecastLine[] = lineRows.map((r) => ({
    id: r.line_key,
    date: isoDate(r.date),
    amount: cents(r.amount_cents),
    anchorType: r.anchor_type,
    anchorRef: r.anchor_ref,
    source: r.source,
  }));

  const c = (await db
    .prepare("SELECT c.*, s.name AS supplier_name FROM contracts c LEFT JOIN suppliers s ON s.code = c.supplier_code WHERE procedure_id = ?")
    .get(procedureId)) as
    | { signed: number; net_cents: number; vat_cents: number; gross_cents: number; supplier_name: string | null; signed_date: string | null; start_date: string | null; end_date: string | null }
    | undefined;

  const budgetRows = (await db.prepare("SELECT year, source, amount_cents FROM budget_allocations WHERE procedure_id = ?").all(procedureId)) as {
    year: number;
    source: string;
    amount_cents: number;
  }[];

  const movementRows = (await db
    .prepare("SELECT type, amount_cents, year, date FROM financial_movements WHERE procedure_id = ? ORDER BY id")
    .all(procedureId)) as {
    type: ProcedureAggregate["movements"][number]["type"];
    amount_cents: number;
    year: number;
    date: string;
  }[];

  const documentRows = (await db
    .prepare("SELECT doc_type, subtype FROM documents WHERE procedure_id = ? AND doc_type IS NOT NULL")
    .all(procedureId)) as { doc_type: string; subtype: string | null }[];

  return {
    code: p.code,
    title: p.title,
    structureCode: p.structure_code,
    procedureType: p.procedure_type,
    awardCriterion: p.award_criterion,
    instrument: p.instrument,
    draft: p.is_draft === 1,
    cancelled: p.cancelled_at !== null,
    closed: p.closed_at !== null,
    programmed: cents(p.programmed_cents),
    // Tassa gara e incentivi sono costi fuori contratto inclusi nel programmato (DEC-035, DEC-111)
    costComponents: cents(p.anac_fee_cents + p.incentive_cents),
    template,
    milestones,
    contract: c
      ? {
          signed: c.signed === 1,
          net: cents(c.net_cents),
          vat: cents(c.vat_cents),
          gross: cents(c.gross_cents),
          supplierName: c.supplier_name,
          signedDate: dt(c.signed_date),
          startDate: dt(c.start_date),
          endDate: dt(c.end_date),
        }
      : null,
    sals,
    payments,
    forecastLines: lines,
    budget: budgetRows.map((r) => ({ year: r.year, source: r.source, amount: cents(r.amount_cents) })),
    movements: movementRows.map((r) => ({ type: r.type, amount: cents(r.amount_cents), year: r.year, date: isoDate(r.date) })),
    documentsTracked: p.documents_tracked === 1,
    documents: documentRows.map((r) => ({ type: r.doc_type, subtype: r.subtype })),
  };
}

export async function listProcedureIds(db: Db): Promise<number[]> {
  return ((await db.prepare("SELECT id FROM procedures ORDER BY code").all()) as { id: number }[]).map((r) => r.id);
}

function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return m;
}

/**
 * Come loadAggregate, ma per molte procedure in blocco (DEC-115): 11 query totali invece di
 * ~12 per procedura. Usato solo da runChecks (il ciclo che gira su tutte le procedure); gli altri
 * punti di lettura restano su loadAggregate, invariato, perché caricano una sola procedura alla
 * volta e non hanno bisogno di questa ottimizzazione.
 */
export async function loadAggregatesBulk(db: Db, procedureIds: number[]): Promise<Map<number, ProcedureAggregate>> {
  const out = new Map<number, ProcedureAggregate>();
  if (!procedureIds.length) return out;

  const procedures = (await db.prepare("SELECT * FROM procedures WHERE id = ANY(?)").all(procedureIds)) as unknown as ProcedureRow[];
  const byId = new Map(procedures.map((p) => [p.id, p]));

  const baselineRows = (await db.prepare("SELECT id, procedure_id FROM procedure_versions WHERE procedure_id = ANY(?) AND is_baseline = 1").all(procedureIds)) as {
    id: number;
    procedure_id: number;
  }[];
  const baselineByProcedure = new Map(baselineRows.map((r) => [r.procedure_id, r.id]));

  const versionIds = [
    ...new Set(
      procedures.flatMap((p) => [p.current_version_id, baselineByProcedure.get(p.id) ?? null]).filter((v): v is number => v !== null),
    ),
  ];

  const fcRows = versionIds.length
    ? ((await db.prepare("SELECT version_id, milestone_code, date FROM milestone_forecasts WHERE version_id = ANY(?)").all(versionIds)) as {
        version_id: number;
        milestone_code: string;
        date: string;
      }[])
    : [];
  const forecastsByVersion = new Map<number, Map<string, string>>();
  for (const r of fcRows) {
    if (!forecastsByVersion.has(r.version_id)) forecastsByVersion.set(r.version_id, new Map());
    forecastsByVersion.get(r.version_id)!.set(r.milestone_code, r.date);
  }

  const msRows = (await db.prepare("SELECT * FROM milestones WHERE procedure_id = ANY(?)").all(procedureIds)) as {
    procedure_id: number;
    code: string;
    actual_date: string | null;
    manual_state: MilestoneInstance["manualState"];
    manual_blocker: string | null;
  }[];
  const milestonesByProcedure = new Map<number, Map<string, (typeof msRows)[number]>>();
  for (const r of msRows) {
    if (!milestonesByProcedure.has(r.procedure_id)) milestonesByProcedure.set(r.procedure_id, new Map());
    milestonesByProcedure.get(r.procedure_id)!.set(r.code, r);
  }

  const paymentRows = (await db.prepare("SELECT procedure_id, sal_seq, amount_cents, date, state FROM payments WHERE procedure_id = ANY(?) ORDER BY date, id").all(procedureIds)) as {
    procedure_id: number;
    sal_seq: number | null;
    amount_cents: number;
    date: string;
    state: string;
  }[];
  const paymentsByProcedure = groupBy(paymentRows, (r) => r.procedure_id);

  const salRows = (await db.prepare("SELECT * FROM sals WHERE procedure_id = ANY(?) ORDER BY seq").all(procedureIds)) as {
    procedure_id: number;
    seq: number;
    pct_hundredths: number;
    amount_cents: number;
    state: SalState;
    due_date: string | null;
    submitted_date: string | null;
    review_due_date: string | null;
    invoice_date: string | null;
    payment_due_date: string | null;
    accepted_cents: number;
    liquidated_cents: number;
  }[];
  const salsByProcedure = groupBy(salRows, (r) => r.procedure_id);

  const lineRows = versionIds.length
    ? ((await db.prepare("SELECT version_id, line_key, date, amount_cents, anchor_type, anchor_ref, source FROM forecast_lines WHERE version_id = ANY(?) ORDER BY date, id").all(versionIds)) as {
        version_id: number;
        line_key: string;
        date: string;
        amount_cents: number;
        anchor_type: "MILESTONE" | "SAL";
        anchor_ref: string;
        source: string | null;
      }[])
    : [];
  const linesByVersion = groupBy(lineRows, (r) => r.version_id);

  const contractRows = (await db
    .prepare("SELECT c.procedure_id, c.signed, c.net_cents, c.vat_cents, c.gross_cents, c.signed_date, c.start_date, c.end_date, s.name AS supplier_name FROM contracts c LEFT JOIN suppliers s ON s.code = c.supplier_code WHERE c.procedure_id = ANY(?)")
    .all(procedureIds)) as {
    procedure_id: number;
    signed: number;
    net_cents: number;
    vat_cents: number;
    gross_cents: number;
    supplier_name: string | null;
    signed_date: string | null;
    start_date: string | null;
    end_date: string | null;
  }[];
  const contractsByProcedure = new Map(contractRows.map((r) => [r.procedure_id, r]));

  const budgetRows = (await db.prepare("SELECT procedure_id, year, source, amount_cents FROM budget_allocations WHERE procedure_id = ANY(?)").all(procedureIds)) as {
    procedure_id: number;
    year: number;
    source: string;
    amount_cents: number;
  }[];
  const budgetByProcedure = groupBy(budgetRows, (r) => r.procedure_id);

  const movementRows = (await db
    .prepare("SELECT procedure_id, type, amount_cents, year, date FROM financial_movements WHERE procedure_id = ANY(?) ORDER BY id")
    .all(procedureIds)) as {
    procedure_id: number;
    type: ProcedureAggregate["movements"][number]["type"];
    amount_cents: number;
    year: number;
    date: string;
  }[];
  const movementsByProcedure = groupBy(movementRows, (r) => r.procedure_id);

  const documentRows = (await db
    .prepare("SELECT procedure_id, doc_type, subtype FROM documents WHERE procedure_id = ANY(?) AND doc_type IS NOT NULL")
    .all(procedureIds)) as { procedure_id: number; doc_type: string; subtype: string | null }[];
  const documentsByProcedure = groupBy(documentRows, (r) => r.procedure_id);

  for (const pid of procedureIds) {
    const p = byId.get(pid);
    if (!p) continue;
    const template = templateByCode(p.template_code);
    const versionId = p.current_version_id;
    const baseId = baselineByProcedure.get(pid) ?? null;
    const fc = versionId !== null ? (forecastsByVersion.get(versionId) ?? new Map()) : new Map();
    const bl = baseId !== null ? (forecastsByVersion.get(baseId) ?? new Map()) : new Map();
    const ms = milestonesByProcedure.get(pid) ?? new Map();
    const milestones: MilestoneInstance[] = template.milestones.map((def) => {
      const r = ms.get(def.code);
      return {
        code: def.code,
        baselineDate: dt(bl.get(def.code)),
        forecastDate: dt(fc.get(def.code)),
        actualDate: dt(r?.actual_date),
        manualState: r?.manual_state ?? null,
        manualBlocker: r?.manual_blocker ?? null,
      };
    });

    const payments = (paymentsByProcedure.get(pid) ?? []).map((r) => ({
      salSeq: r.sal_seq,
      amount: cents(r.amount_cents),
      date: isoDate(r.date),
      valid: r.state === "EXECUTED",
    }));

    const sals: SalInstance[] = (salsByProcedure.get(pid) ?? []).map((r) => ({
      seq: r.seq,
      pctHundredths: BigInt(r.pct_hundredths),
      amount: cents(r.amount_cents),
      state: r.state,
      dueDate: dt(r.due_date),
      submittedDate: dt(r.submitted_date),
      reviewDueDate: dt(r.review_due_date),
      invoiceDate: dt(r.invoice_date),
      paymentDueDate: dt(r.payment_due_date),
      accepted: cents(r.accepted_cents),
      liquidated: cents(r.liquidated_cents),
      paid: Money.sum(payments.filter((x) => x.valid && x.salSeq === r.seq).map((x) => x.amount)),
    }));

    const lines: ForecastLine[] = (versionId !== null ? (linesByVersion.get(versionId) ?? []) : []).map((r) => ({
      id: r.line_key,
      date: isoDate(r.date),
      amount: cents(r.amount_cents),
      anchorType: r.anchor_type,
      anchorRef: r.anchor_ref,
      source: r.source,
    }));

    const c = contractsByProcedure.get(pid);

    out.set(pid, {
      code: p.code,
      title: p.title,
      structureCode: p.structure_code,
      procedureType: p.procedure_type,
      awardCriterion: p.award_criterion,
      instrument: p.instrument,
      draft: p.is_draft === 1,
      cancelled: p.cancelled_at !== null,
      closed: p.closed_at !== null,
      programmed: cents(p.programmed_cents),
      costComponents: cents(p.anac_fee_cents + p.incentive_cents),
      template,
      milestones,
      contract: c
        ? {
            signed: c.signed === 1,
            net: cents(c.net_cents),
            vat: cents(c.vat_cents),
            gross: cents(c.gross_cents),
            supplierName: c.supplier_name,
            signedDate: dt(c.signed_date),
            startDate: dt(c.start_date),
            endDate: dt(c.end_date),
          }
        : null,
      sals,
      payments,
      forecastLines: lines,
      budget: (budgetByProcedure.get(pid) ?? []).map((r) => ({ year: r.year, source: r.source, amount: cents(r.amount_cents) })),
      movements: (movementsByProcedure.get(pid) ?? []).map((r) => ({ type: r.type, amount: cents(r.amount_cents), year: r.year, date: isoDate(r.date) })),
      documentsTracked: p.documents_tracked === 1,
      documents: (documentsByProcedure.get(pid) ?? []).map((r) => ({ type: r.doc_type, subtype: r.subtype })),
    });
  }
  return out;
}
