import { addDays, daysBetween, maxDate, type BusinessCalendar, type IsoDate } from "./dates";
import type {
  AwardCriterion,
  EngineSettings,
  Instrument,
  MilestoneDefinition,
  MilestoneInstance,
  MilestoneState,
  ProcedureAggregate,
  ProcedureStatus,
  ProcedureType,
  ProcessTemplate,
  SalInstance,
  TemplateFamily,
} from "./model";

/** Scelta del modello per tipologia + criterio + strumento (DEC-020, guida §9.1). */
export function selectTemplate(
  templates: ProcessTemplate[],
  type: ProcedureType,
  criterion: AwardCriterion | null,
  instrument: Instrument | null,
  family: TemplateFamily = "v1",
): ProcessTemplate {
  const candidates = templates.filter((t) => (t.family ?? "v1") === family && t.selection.procedureTypes.includes(type));
  const exact = candidates.find(
    (t) =>
      (t.selection.awardCriterion === undefined || t.selection.awardCriterion === (criterion ?? "LOWEST_PRICE")) &&
      (t.selection.instrument === undefined || t.selection.instrument === (instrument ?? "OFF_MEPA")),
  );
  const chosen = exact ?? candidates[0];
  if (!chosen) throw new Error(`Nessun modello per la tipologia ${type}`);
  return chosen;
}

/** Genera le date previste a partire dalla data della memoria (o da date esplicite). */
export function generateForecastDates(
  template: ProcessTemplate,
  memoryDue: IsoDate,
  cal: BusinessCalendar,
  explicit: Record<string, IsoDate | undefined> = {},
  actuals: Record<string, IsoDate | undefined> = {},
): Record<string, IsoDate> {
  const out: Record<string, IsoDate> = {};
  let prev: IsoDate | null = null;
  for (const def of template.milestones) {
    const given = explicit[def.code];
    let d: IsoDate;
    if (given) d = given;
    else if (prev === null) d = memoryDue;
    else d = cal.roll(addDays(prev, def.offsetDays));
    out[def.code] = d;
    prev = actuals[def.code] ?? d;
  }
  return out;
}

export interface MilestoneEvaluation {
  code: string;
  def: MilestoneDefinition;
  due: IsoDate | null;
  state: MilestoneState;
  active: boolean;
  blocked: boolean;
  blockerReason: string | null;
  daysUntil: number | null;
}

function isDone(m: MilestoneInstance | undefined): boolean {
  return !!m && (m.actualDate !== null || m.manualState === "NOT_APPLICABLE" || m.manualState === "CANCELLED");
}

export function evaluateMilestones(
  agg: ProcedureAggregate,
  ref: IsoDate,
  settings: EngineSettings,
): MilestoneEvaluation[] {
  const byCode = new Map(agg.milestones.map((m) => [m.code, m]));
  const docTypes = new Set(agg.documents.map((d) => d.type));
  const result: MilestoneEvaluation[] = [];
  let foundActive = false;
  for (const def of agg.template.milestones) {
    const inst = byCode.get(def.code);
    const due = inst?.forecastDate ?? inst?.baselineDate ?? null;
    let state: MilestoneState;
    const du = due ? daysBetween(ref, due) : null;
    if (inst?.actualDate) state = "COMPLETED";
    else if (inst?.manualState) state = inst.manualState;
    else if (due === null || du === null) state = "NOT_STARTED";
    else if (du < 0) state = "OVERDUE";
    else if (du === 0) state = "DUE_TODAY";
    else if (du <= settings.reminderThresholdDays) state = "DUE_SOON";
    else if (du <= settings.attentionWindowDays) state = "UPCOMING";
    else state = "NOT_STARTED";

    const done = isDone(inst);
    const active = !done && !foundActive && !agg.cancelled && !agg.closed;
    if (active) foundActive = true;

    const missingBefore = (agg.documentsTracked ? def.expectedDocuments : []).filter((e) => e.timing === "BEFORE" && !docTypes.has(e.type));
    const blockerReason = inst?.manualBlocker ?? (missingBefore.length ? `Documento mancante: ${missingBefore.map((m) => m.type).join(", ")}` : null);
    result.push({
      code: def.code,
      def,
      due,
      state,
      active,
      blocked: !done && blockerReason !== null,
      blockerReason: done ? null : blockerReason,
      daysUntil: du,
    });
  }
  return result;
}

const SAL_ACCEPTED_OR_LATER = new Set(["ACCEPTED", "INVOICED", "LIQUIDATED", "PARTIALLY_PAID", "PAID"]);

/** Stato della procedura = fase della prima milestone obbligatoria non completata (DEC-023). */
export function deriveStatus(agg: ProcedureAggregate, ms: MilestoneEvaluation[]): ProcedureStatus {
  if (agg.cancelled) return "CANCELLED";
  if (agg.draft) return "DRAFT";
  if (agg.closed) return "CLOSED";
  const byCode = new Map(agg.milestones.map((m) => [m.code, m]));
  for (const e of ms) {
    if (!e.def.mandatory) continue;
    if (!isDone(byCode.get(e.code))) return e.def.phase;
  }
  if (agg.sals.length === 0) return "EXECUTION";
  return agg.sals.some((s) => !SAL_ACCEPTED_OR_LATER.has(s.state)) ? "EXECUTION" : "CLOSING";
}

export type DeadlineKind = "MILESTONE" | "SAL" | "PAYMENT";

export interface Deadline {
  kind: DeadlineKind;
  target: string;
  label: string;
  due: IsoDate;
  daysUntil: number;
  blocking: boolean;
  policy: string;
  owner: string;
}

/** Scadenza corrente di un SAL (guida §8.3, nota 2). */
export function salCurrentDeadline(sal: SalInstance, settings: EngineSettings): { due: IsoDate; kind: "SAL" | "PAYMENT"; what: string } | null {
  switch (sal.state) {
    case "PLANNED":
      return sal.dueDate ? { due: sal.dueDate, kind: "SAL", what: "presentazione" } : null;
    case "SUBMITTED":
    case "UNDER_REVIEW": {
      const due = sal.reviewDueDate ?? (sal.submittedDate ? addDays(sal.submittedDate, settings.salReviewTermDays) : null);
      return due ? { due, kind: "SAL", what: "verifica" } : null;
    }
    case "INVOICED":
    case "LIQUIDATED":
    case "PARTIALLY_PAID": {
      const due = sal.paymentDueDate ?? (sal.invoiceDate ? addDays(sal.invoiceDate, settings.paymentTermDays) : null);
      return due ? { due, kind: "PAYMENT", what: "pagamento" } : null;
    }
    default:
      return null;
  }
}

/** Scadenze attive: milestone attiva, SAL dei contratti firmati, pagamenti dovuti (DEC-094). */
export function activeDeadlines(
  agg: ProcedureAggregate,
  ms: MilestoneEvaluation[],
  ref: IsoDate,
  settings: EngineSettings,
): Deadline[] {
  if (agg.cancelled || agg.closed) return [];
  const out: Deadline[] = [];
  for (const m of ms) {
    if (m.active && m.due && m.state !== "SUSPENDED") {
      out.push({
        kind: "MILESTONE",
        target: m.code,
        label: m.def.label,
        due: m.due,
        daysUntil: daysBetween(ref, m.due),
        blocking: m.def.blocking,
        policy: m.def.alertPolicy,
        owner: m.def.owner,
      });
    }
  }
  if (agg.contract?.signed) {
    for (const s of agg.sals) {
      const d = salCurrentDeadline(s, settings);
      if (!d) continue;
      out.push({
        kind: d.kind,
        target: `SAL${s.seq}`,
        label: `SAL ${s.seq} – ${d.what}`,
        due: d.due,
        daysUntil: daysBetween(ref, d.due),
        blocking: false,
        policy: d.kind,
        owner: d.kind === "PAYMENT" ? "FINANCE" : "STRUCTURE",
      });
    }
  }
  return out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
}

export function maxIso(a: IsoDate | null, b: IsoDate | null): IsoDate | null {
  if (!a) return b;
  if (!b) return a;
  return maxDate(a, b);
}
