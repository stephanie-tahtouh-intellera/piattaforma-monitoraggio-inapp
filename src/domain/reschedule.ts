import { addDays, daysBetween, maxDate, yearOf, type BusinessCalendar, type IsoDate } from "./dates";
import { annualNeed, availableByYear, committedByYear, mapToRecord, overflows, type YearMap } from "./finance";
import { Money } from "./money";
import type { ForecastLine, ProcedureAggregate } from "./model";

export type AlternativeKind = "FASTEST" | "MIN_ANNUAL_IMPACT" | "MANUAL";

export interface Criticality {
  code: "BUDGET_OVERFLOW" | "FUNDING_END_EXCEEDED" | "MILESTONE_BEYOND_LIMIT" | "COMMITMENT_MISMATCH";
  severity: "BLOCKING" | "WARNING";
  year?: number;
  amount?: Money;
  message: string;
}

export interface DateChange {
  code: string;
  before: IsoDate;
  after: IsoDate;
  deltaDays: number;
}

export interface LineChange {
  id: string;
  before: IsoDate;
  after: IsoDate;
  amount: Money;
  yearChanged: boolean;
}

export interface SimulationResult {
  sourceMilestone: string;
  candidateDate: IsoDate;
  dateChanges: DateChange[];
  lineChanges: LineChange[];
  amountShifted: Money;
  needBefore: YearMap;
  needAfter: YearMap;
  annualImpact: Record<string, string>;
  criticalities: Criticality[];
  newMilestoneDates: Record<string, IsoDate>;
  newLines: ForecastLine[];
}

export class RescheduleError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RescheduleError";
  }
}

export interface SimulationOptions {
  fundingEndDate?: IsoDate | null;
  milestoneLimits?: Record<string, IsoDate>;
}

/** Simulazione deterministica: nessun dato corrente viene modificato. */
export function simulate(
  agg: ProcedureAggregate,
  sourceCode: string,
  candidate: IsoDate,
  ref: IsoDate,
  cal: BusinessCalendar,
  opts: SimulationOptions = {},
): SimulationResult {
  const defs = agg.template.milestones;
  const byCode = new Map(agg.milestones.map((m) => [m.code, m]));
  const srcIdx = defs.findIndex((d) => d.code === sourceCode);
  if (srcIdx < 0) throw new RescheduleError("UNKNOWN_MILESTONE", `Milestone sconosciuta: ${sourceCode}`);
  const src = byCode.get(sourceCode);
  if (!src || src.actualDate) throw new RescheduleError("MILESTONE_COMPLETED", "La milestone sorgente è già completata");
  if (candidate < ref) throw new RescheduleError("CANDIDATE_IN_PAST", "La data candidata precede la data di riferimento");
  const srcForecast = src.forecastDate;
  if (!srcForecast) throw new RescheduleError("NO_FORECAST", "La milestone sorgente non ha una data prevista");

  // vincolo con il predecessore effettivo
  const prevDef = defs[srcIdx - 1];
  const srcDef = defs[srcIdx]!;
  const prevActual = prevDef ? byCode.get(prevDef.code)?.actualDate ?? null : null;
  if (prevActual && candidate < addDays(prevActual, srcDef.minDurationDays)) {
    throw new RescheduleError("DEPENDENCY_VIOLATION", "La data candidata non rispetta la durata minima dal predecessore");
  }

  const newDates: Record<string, IsoDate> = {};
  const changes: DateChange[] = [];
  const first = cal.roll(candidate);
  const delta = daysBetween(srcForecast, first);
  let prevNew: IsoDate = first;
  newDates[sourceCode] = first;
  if (first !== srcForecast) changes.push({ code: sourceCode, before: srcForecast, after: first, deltaDays: delta });

  for (let i = srcIdx + 1; i < defs.length; i++) {
    const def = defs[i]!;
    const inst = byCode.get(def.code);
    if (!inst || inst.actualDate || inst.manualState === "NOT_APPLICABLE" || inst.manualState === "CANCELLED") {
      if (inst?.actualDate) prevNew = inst.actualDate;
      continue;
    }
    const f = inst.forecastDate ?? prevNew;
    const nd = cal.roll(maxDate(addDays(f, delta), addDays(prevNew, def.minDurationDays)));
    newDates[def.code] = nd;
    if (nd !== f) changes.push({ code: def.code, before: f, after: nd, deltaDays: daysBetween(f, nd) });
    prevNew = nd;
  }

  // Righe di pagamento ancorate a milestone spostate
  const lineChanges: LineChange[] = [];
  const newLines: ForecastLine[] = agg.forecastLines.map((l) => {
    if (l.anchorType !== "MILESTONE") return l;
    const after = newDates[l.anchorRef];
    const before = byCode.get(l.anchorRef)?.forecastDate;
    if (!after || !before || after === before) return l;
    const nd = cal.roll(addDays(l.date, daysBetween(before, after)));
    if (nd === l.date) return l;
    lineChanges.push({ id: l.id, before: l.date, after: nd, amount: l.amount, yearChanged: yearOf(nd) !== yearOf(l.date) });
    return { ...l, date: nd };
  });

  const needBefore = annualNeed(agg);
  const needAfter = annualNeed(agg, newLines);
  const amountShifted = Money.sum(lineChanges.filter((c) => c.yearChanged).map((c) => c.amount));
  const years = new Set([...needBefore.keys(), ...needAfter.keys()]);
  const impact: Record<string, string> = {};
  for (const y of [...years].sort()) {
    const d = (needAfter.get(y) ?? Money.ZERO).sub(needBefore.get(y) ?? Money.ZERO);
    if (!d.isZero()) impact[String(y)] = d.toString();
  }

  const crit: Criticality[] = [];
  for (const o of overflows(needAfter, availableByYear(agg))) {
    crit.push({
      code: "BUDGET_OVERFLOW",
      severity: "BLOCKING",
      year: o.year,
      amount: o.amount,
      message: `Fabbisogno ${o.year} ${o.need.toString()} oltre la disponibilità ${o.available.toString()}`,
    });
  }
  if (opts.fundingEndDate) {
    const beyond = newLines.filter((l) => l.date > opts.fundingEndDate!);
    if (beyond.length) {
      crit.push({
        code: "FUNDING_END_EXCEEDED",
        severity: "BLOCKING",
        amount: Money.sum(beyond.map((l) => l.amount)),
        message: `Pagamenti oltre la fine del finanziamento (${opts.fundingEndDate})`,
      });
    }
  }
  for (const [code, limit] of Object.entries(opts.milestoneLimits ?? {})) {
    const nd = newDates[code];
    if (nd && nd > limit) crit.push({ code: "MILESTONE_BEYOND_LIMIT", severity: "WARNING", message: `${code} oltre il limite ${limit}` });
  }
  for (const [y, c] of committedByYear(agg)) {
    const n = needAfter.get(y) ?? Money.ZERO;
    if (n.lt(c)) {
      crit.push({ code: "COMMITMENT_MISMATCH", severity: "WARNING", year: y, amount: c.sub(n), message: `Fabbisogno ${y} inferiore all'impegnato` });
    }
  }

  return {
    sourceMilestone: sourceCode,
    candidateDate: first,
    dateChanges: changes,
    lineChanges,
    amountShifted,
    needBefore,
    needAfter,
    annualImpact: impact,
    criticalities: crit,
    newMilestoneDates: newDates,
    newLines,
  };
}

/** Data più rapida ammissibile (DEC-040). */
export function fastestCandidate(agg: ProcedureAggregate, sourceCode: string, ref: IsoDate, cal: BusinessCalendar): IsoDate {
  const defs = agg.template.milestones;
  const idx = defs.findIndex((d) => d.code === sourceCode);
  const def = defs[idx];
  if (!def) throw new RescheduleError("UNKNOWN_MILESTONE", sourceCode);
  let d = addDays(ref, def.minLeadDays);
  const prev = defs[idx - 1];
  const prevActual = prev ? agg.milestones.find((m) => m.code === prev.code)?.actualDate ?? null : null;
  if (prevActual) d = maxDate(d, addDays(prevActual, def.minDurationDays));
  return cal.roll(d);
}

export interface Alternative {
  kind: AlternativeKind;
  result: SimulationResult;
  sameAs: AlternativeKind | null;
  explanation: string;
}

function blockingTotal(r: SimulationResult): bigint {
  return r.criticalities.filter((c) => c.severity === "BLOCKING").reduce((t, c) => t + (c.amount?.cents ?? 0n), 0n);
}

export function alternatives(
  agg: ProcedureAggregate,
  sourceCode: string,
  ref: IsoDate,
  cal: BusinessCalendar,
  manual: IsoDate | null,
  opts: SimulationOptions = {},
): Alternative[] {
  const fastDate = fastestCandidate(agg, sourceCode, ref, cal);
  const fast = simulate(agg, sourceCode, fastDate, ref, cal, opts);
  const out: Alternative[] = [
    { kind: "FASTEST", result: fast, sameAs: null, explanation: `Prima data ammissibile: riferimento + preavviso minimo, giorno lavorativo (${fastDate}).` },
  ];
  let best = fast;
  let bestKey: readonly [bigint, bigint, bigint] = [blockingTotal(fast), fast.amountShifted.cents, 0n];
  for (let d = fastDate, i = 0; i <= 120; i++, d = addDays(d, 1)) {
    if (!cal.isBusinessDay(d)) continue;
    const r = simulate(agg, sourceCode, d, ref, cal, opts);
    const key = [blockingTotal(r), r.amountShifted.cents, BigInt(daysBetween(fastDate, d))] as const;
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) {
      best = r;
      bestKey = key;
    }
  }
  out.push({
    kind: "MIN_ANNUAL_IMPACT",
    result: best,
    sameAs: best.candidateDate === fast.candidateDate ? "FASTEST" : null,
    explanation: "Data che minimizza, nell'ordine, overflow bloccante, importo spostato tra annualità e ritardo.",
  });
  if (manual) {
    const r = simulate(agg, sourceCode, manual, ref, cal, opts);
    out.push({
      kind: "MANUAL",
      result: r,
      sameAs: r.candidateDate === fast.candidateDate ? "FASTEST" : r.candidateDate === best.candidateDate ? "MIN_ANNUAL_IMPACT" : null,
      explanation: "Data proposta dall'utente.",
    });
  }
  return out;
}

export function serializeSimulation(r: SimulationResult) {
  return {
    source_milestone: r.sourceMilestone,
    candidate_date: r.candidateDate,
    date_changes: r.dateChanges.length,
    changes: r.dateChanges,
    line_changes: r.lineChanges.map((c) => ({ ...c, amount: c.amount.toString() })),
    amount_shifted: r.amountShifted.toString(),
    need_before: mapToRecord(r.needBefore),
    need_after: mapToRecord(r.needAfter),
    annual_impact: r.annualImpact,
    criticalities: r.criticalities.map((c) => ({ ...c, amount: c.amount?.toString() })),
  };
}
