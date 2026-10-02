import {
  BUDGET_OVERFLOW_LEVEL,
  DEFAULT_POLICIES,
  RESCHEDULE_REQUIRED_LEVEL,
  SEVERITY_RANK,
  deadlineAlerts,
  type AlertCandidate,
  type AlertPolicy,
} from "./alerts";
import { yearOf, type IsoDate } from "./dates";
import {
  annualNeed,
  availableByYear,
  effectiveLineAmount,
  overflows,
  residualToPay,
  totalLiquidated,
  totalPaid,
  type Overflow,
  type YearMap,
} from "./finance";
import { Money } from "./money";
import {
  activeDeadlines,
  deriveStatus,
  evaluateMilestones,
  type Deadline,
  type MilestoneEvaluation,
} from "./milestones";
import type { EngineSettings, Health, ProcedureAggregate, ProcedureStatus, Severity } from "./model";

export interface AnomalyCandidate {
  rule: string;
  target: string;
  severity: Severity;
  message: string;
}

export interface HealthDriver {
  rule: string;
  target: string;
  message: string;
}

export interface ProcedureEvaluation {
  code: string;
  status: ProcedureStatus;
  health: Health;
  healthDrivers: HealthDriver[];
  milestones: MilestoneEvaluation[];
  deadlines: Deadline[];
  nextDeadline: Deadline | null;
  rescheduleRequired: boolean;
  late: boolean;
  alerts: AlertCandidate[];
  anomalies: AnomalyCandidate[];
  annualNeed: YearMap;
  available: YearMap;
  overflows: Overflow[];
  paid: Money;
  liquidated: Money;
  residual: Money;
  contracted: Money | null;
  programmed: Money;
  atRisk: { uncovered: Money; slipping: Money; total: Money };
}

const DOC_LABEL: Record<string, string> = {
  MEMORIA: "memoria",
  DOCUMENTO_TECNICO: "documento tecnico",
  DETERMINA_INDIZIONE: "determina di indizione",
  DETERMINA_AGGIUDICAZIONE: "determina di aggiudicazione",
  GARANZIA_DEFINITIVA: "garanzia definitiva",
  CONTRATTO: "contratto",
};

export function evaluateAnomalies(
  agg: ProcedureAggregate,
  ms: MilestoneEvaluation[],
  ref: IsoDate,
  settings: EngineSettings,
): AnomalyCandidate[] {
  if (agg.cancelled || agg.closed || agg.draft) {
    const out: AnomalyCandidate[] = [];
    if (agg.cancelled && agg.movements.some((m) => m.type === "COMMITMENT")) {
      out.push({ rule: "COMMITTED_ON_CANCELLED", target: agg.code, severity: "HIGH", message: "Procedura annullata con impegni registrati" });
    }
    return out;
  }
  const out: AnomalyCandidate[] = [];
  const docTypes = new Set(agg.documents.map((d) => d.type));
  const byCode = new Map(agg.milestones.map((m) => [m.code, m]));

  // Documenti attesi (§8.7): BEFORE sulla milestone attiva vicina o scaduta; WITH sull'ultima completata.
  let lastCompleted: MilestoneEvaluation | null = null;
  for (const m of ms) if (m.state === "COMPLETED") lastCompleted = m;
  for (const m of agg.documentsTracked ? ms : []) {
    for (const e of m.def.expectedDocuments) {
      if (docTypes.has(e.type)) continue;
      const before =
        e.timing === "BEFORE" && m.active && m.daysUntil !== null && m.daysUntil <= settings.attentionWindowDays;
      const withDoc = e.timing === "WITH" && lastCompleted?.code === m.code;
      if (before || withDoc) {
        out.push({
          rule: "EXPECTED_DOCUMENT_MISSING",
          target: `${m.code}:${e.type}`,
          severity: e.severity,
          message: `Documento atteso mancante: ${DOC_LABEL[e.type] ?? e.type} (${m.def.label})`,
        });
      }
    }
  }

  // Sequenza delle date effettive.
  let maxPrev: IsoDate | null = null;
  let maxPrevCode = "";
  for (const def of agg.template.milestones) {
    const a = byCode.get(def.code)?.actualDate ?? null;
    if (!a) continue;
    if (a > ref) {
      out.push({ rule: "DATE_IMPOSSIBLE", target: def.code, severity: "HIGH", message: `Data effettiva futura (${a}) per ${def.label}` });
    }
    if (maxPrev && a < maxPrev) {
      out.push({
        rule: "DATE_SEQUENCE_INCONSISTENT",
        target: def.code,
        severity: "HIGH",
        message: `${def.label} (${a}) precede ${maxPrevCode} (${maxPrev})`,
      });
    }
    if (!maxPrev || a > maxPrev) {
      maxPrev = a;
      maxPrevCode = def.label;
    }
  }

  if (agg.sals.length > 0) {
    const sum = agg.sals.reduce((t, s) => t + s.pctHundredths, 0n);
    if (sum !== 10000n) {
      out.push({ rule: "SAL_PLAN_NOT_100", target: agg.code, severity: "HIGH", message: `Le percentuali SAL sommano ${Number(sum) / 100}%` });
    }
  }
  if (agg.contract && !agg.contract.net.add(agg.contract.vat).eq(agg.contract.gross)) {
    out.push({ rule: "AMOUNTS_NOT_RECONCILED", target: "CONTRACT", severity: "HIGH", message: "Netto + IVA diverso dal lordo del contratto" });
  }
  const planned = Money.sum(agg.forecastLines.map((l) => effectiveLineAmount(agg, l))).add(totalPaid(agg));
  const base = agg.contract?.signed ? agg.contract.gross.add(agg.costComponents) : agg.programmed;
  if (agg.forecastLines.length + agg.payments.length > 0 && !planned.eq(base)) {
    out.push({
      rule: "AMOUNTS_NOT_RECONCILED",
      target: "FORECAST",
      severity: "HIGH",
      message: `Previsione + pagato (${planned.toString()}) diverso da ${agg.contract?.signed ? "contratto" : "programmato"} (${base.toString()})`,
    });
  }
  if (agg.contract && totalPaid(agg).gt(agg.contract.gross)) {
    out.push({ rule: "PAYMENT_OVER_CONTRACT", target: "CONTRACT", severity: "CRITICAL", message: "Pagato superiore al lordo contrattuale" });
  }
  return out;
}

export function evaluateProcedure(
  agg: ProcedureAggregate,
  ref: IsoDate,
  settings: EngineSettings,
  policies: Record<string, AlertPolicy> = DEFAULT_POLICIES,
): ProcedureEvaluation {
  const ms = evaluateMilestones(agg, ref, settings);
  const status = deriveStatus(agg, ms);
  const deadlines = agg.draft ? [] : activeDeadlines(agg, ms, ref, settings);
  const anomalies = evaluateAnomalies(agg, ms, ref, settings);
  const need = annualNeed(agg);
  const available = availableByYear(agg);
  const ov = agg.cancelled ? [] : overflows(need, available);

  const rescheduleRequired = deadlines.some((d) => d.kind === "MILESTONE" && d.blocking && d.daysUntil <= -1);
  const late = deadlines.some((d) => (d.kind === "MILESTONE" || d.kind === "SAL") && d.daysUntil < 0);

  // Alert
  const alerts = deadlineAlerts(deadlines, ref, policies);
  if (rescheduleRequired) {
    const src = deadlines.find((d) => d.kind === "MILESTONE" && d.blocking && d.daysUntil <= -1);
    alerts.push({
      rule: "RESCHEDULE_REQUIRED",
      targetType: "PROCEDURE",
      target: src?.target ?? agg.code,
      dueDate: src?.due ?? null,
      level: RESCHEDULE_REQUIRED_LEVEL,
      owner: "PROCUREMENT",
      title: "Riprogrammazione richiesta",
      blocking: true,
    });
  }
  for (const o of ov) {
    alerts.push({
      rule: "BUDGET_OVERFLOW",
      targetType: "PROCEDURE",
      target: `Y${o.year}`,
      dueDate: null,
      level: BUDGET_OVERFLOW_LEVEL,
      owner: "FINANCE",
      title: `Disponibilità ${o.year} superata di ${o.amount.toString()}`,
      blocking: true,
    });
  }

  // Health (§8.4)
  const drivers: { sev: "RED" | "AMBER"; d: HealthDriver }[] = [];
  let health: Health;
  if (agg.cancelled || status === "DRAFT") health = "NEUTRAL";
  else if (agg.closed) health = "GREEN";
  else {
    for (const d of deadlines) {
      if (d.kind === "MILESTONE" && d.daysUntil < 0) {
        drivers.push({
          sev: d.blocking ? "RED" : "AMBER",
          d: { rule: d.blocking ? "BLOCKING_MILESTONE_OVERDUE" : "MILESTONE_OVERDUE", target: d.target, message: `${d.label} scaduta da ${-d.daysUntil} gg` },
        });
      } else if (d.kind !== "MILESTONE" && d.daysUntil < 0) {
        drivers.push({ sev: "RED", d: { rule: d.kind === "SAL" ? "SAL_OVERDUE" : "PAYMENT_OVERDUE", target: d.target, message: `${d.label} scaduto da ${-d.daysUntil} gg` } });
      } else if (d.daysUntil <= settings.attentionWindowDays) {
        drivers.push({ sev: "AMBER", d: { rule: "DEADLINE_IN_ATTENTION_WINDOW", target: d.target, message: `${d.label} fra ${d.daysUntil} gg` } });
      }
    }
    for (const o of ov) drivers.push({ sev: "RED", d: { rule: "BUDGET_OVERFLOW", target: `Y${o.year}`, message: `Disponibilità ${o.year} superata` } });
    for (const a of anomalies) {
      if (a.severity === "CRITICAL") drivers.push({ sev: "RED", d: { rule: a.rule, target: a.target, message: a.message } });
      else if (SEVERITY_RANK[a.severity] >= SEVERITY_RANK.MEDIUM) drivers.push({ sev: "AMBER", d: { rule: a.rule, target: a.target, message: a.message } });
    }
    health = drivers.some((x) => x.sev === "RED") ? "RED" : drivers.length ? "AMBER" : "GREEN";
  }
  const healthDrivers = drivers
    .sort((a, b) => (a.sev === b.sev ? 0 : a.sev === "RED" ? -1 : 1))
    .map((x) => x.d);

  // Importo a rischio (DEC-051)
  const uncovered = Money.sum(ov.map((o) => o.amount));
  const refYear = yearOf(ref);
  const slipping = rescheduleRequired
    ? Money.sum(agg.forecastLines.filter((l) => yearOf(l.date) === refYear).map((l) => effectiveLineAmount(agg, l)))
    : Money.ZERO;

  return {
    code: agg.code,
    status,
    health,
    healthDrivers,
    milestones: ms,
    deadlines,
    nextDeadline: deadlines[0] ?? null,
    rescheduleRequired,
    late: !agg.cancelled && !agg.closed && late,
    alerts: agg.cancelled || agg.closed ? [] : alerts,
    anomalies,
    annualNeed: need,
    available,
    overflows: ov,
    paid: totalPaid(agg),
    liquidated: totalLiquidated(agg),
    residual: residualToPay(agg),
    contracted: agg.contract?.signed ? agg.contract.gross : null,
    programmed: agg.programmed,
    atRisk: { uncovered, slipping, total: uncovered.add(slipping) },
  };
}
