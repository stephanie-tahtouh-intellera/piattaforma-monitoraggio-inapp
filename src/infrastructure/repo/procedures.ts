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
  documents_tracked: number;
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

export function getProcedureByCode(db: Db, code: string): ProcedureRow | undefined {
  return db.prepare("SELECT * FROM procedures WHERE code = ?").get(code) as ProcedureRow | undefined;
}

export function getProcedureById(db: Db, id: number): ProcedureRow | undefined {
  return db.prepare("SELECT * FROM procedures WHERE id = ?").get(id) as ProcedureRow | undefined;
}

export function baselineVersionId(db: Db, procedureId: number): number | null {
  const r = db.prepare("SELECT id FROM procedure_versions WHERE procedure_id = ? AND is_baseline = 1").get(procedureId) as { id: number } | undefined;
  return r?.id ?? null;
}

/** Carica l'aggregato di dominio dalla versione corrente (forecast) e dalla baseline. */
export function loadAggregate(db: Db, procedureId: number): ProcedureAggregate {
  const p = getProcedureById(db, procedureId);
  if (!p) throw new Error(`Procedura ${procedureId} non trovata`);
  const template = templateByCode(p.template_code);
  const versionId = p.current_version_id;
  const baseId = baselineVersionId(db, procedureId);
  const fc = new Map(
    (db.prepare("SELECT milestone_code, date FROM milestone_forecasts WHERE version_id = ?").all(versionId) as { milestone_code: string; date: string }[]).map((r) => [r.milestone_code, r.date]),
  );
  const bl = new Map(
    (db.prepare("SELECT milestone_code, date FROM milestone_forecasts WHERE version_id = ?").all(baseId) as { milestone_code: string; date: string }[]).map((r) => [r.milestone_code, r.date]),
  );
  const ms = new Map(
    (db.prepare("SELECT * FROM milestones WHERE procedure_id = ?").all(procedureId) as {
      code: string;
      actual_date: string | null;
      manual_state: MilestoneInstance["manualState"];
      manual_blocker: string | null;
    }[]).map((r) => [r.code, r]),
  );
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

  const payments = (db.prepare("SELECT * FROM payments WHERE procedure_id = ? ORDER BY date, id").all(procedureId) as {
    sal_seq: number | null;
    amount_cents: number;
    date: string;
    state: string;
  }[]).map((r) => ({ salSeq: r.sal_seq, amount: cents(r.amount_cents), date: isoDate(r.date), valid: r.state === "EXECUTED" }));

  const sals: SalInstance[] = (db.prepare("SELECT * FROM sals WHERE procedure_id = ? ORDER BY seq").all(procedureId) as {
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
  }[]).map((r) => ({
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

  const lines: ForecastLine[] = (db.prepare("SELECT * FROM forecast_lines WHERE version_id = ? ORDER BY date, id").all(versionId) as {
    line_key: string;
    date: string;
    amount_cents: number;
    anchor_type: "MILESTONE" | "SAL";
    anchor_ref: string;
    source: string | null;
  }[]).map((r) => ({ id: r.line_key, date: isoDate(r.date), amount: cents(r.amount_cents), anchorType: r.anchor_type, anchorRef: r.anchor_ref, source: r.source }));

  const c = db.prepare("SELECT c.*, s.name AS supplier_name FROM contracts c LEFT JOIN suppliers s ON s.code = c.supplier_code WHERE procedure_id = ?").get(procedureId) as
    | { signed: number; net_cents: number; vat_cents: number; gross_cents: number; supplier_name: string | null; signed_date: string | null; start_date: string | null; end_date: string | null }
    | undefined;

  return {
    code: p.code,
    title: p.title,
    structureCode: p.structure_code,
    procedureType: p.procedure_type,
    awardCriterion: p.award_criterion,
    instrument: p.instrument,
    cancelled: p.cancelled_at !== null,
    closed: p.closed_at !== null,
    programmed: cents(p.programmed_cents),
    costComponents: cents(p.anac_fee_cents),
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
    budget: (db.prepare("SELECT year, source, amount_cents FROM budget_allocations WHERE procedure_id = ?").all(procedureId) as { year: number; source: string; amount_cents: number }[]).map((r) => ({
      year: r.year,
      source: r.source,
      amount: cents(r.amount_cents),
    })),
    movements: (db.prepare("SELECT type, amount_cents, year, date FROM financial_movements WHERE procedure_id = ? ORDER BY id").all(procedureId) as {
      type: ProcedureAggregate["movements"][number]["type"];
      amount_cents: number;
      year: number;
      date: string;
    }[]).map((r) => ({ type: r.type, amount: cents(r.amount_cents), year: r.year, date: isoDate(r.date) })),
    documentsTracked: p.documents_tracked === 1,
    documents: (db.prepare("SELECT doc_type, subtype FROM documents WHERE procedure_id = ? AND doc_type IS NOT NULL").all(procedureId) as { doc_type: string; subtype: string | null }[]).map((r) => ({
      type: r.doc_type,
      subtype: r.subtype,
    })),
  };
}

export function listProcedureIds(db: Db): number[] {
  return (db.prepare("SELECT id FROM procedures ORDER BY code").all() as { id: number }[]).map((r) => r.id);
}
