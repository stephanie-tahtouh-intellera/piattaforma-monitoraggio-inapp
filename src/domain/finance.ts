import { yearOf } from "./dates";
import { Money } from "./money";
import type { ForecastLine, ProcedureAggregate } from "./model";

export type YearMap = Map<number, Money>;

function addTo(map: YearMap, year: number, m: Money): void {
  map.set(year, (map.get(year) ?? Money.ZERO).add(m));
}

export function paidOnSal(agg: ProcedureAggregate, seq: number): Money {
  return Money.sum(agg.payments.filter((p) => p.valid && p.salSeq === seq).map((p) => p.amount));
}

/** Importo residuo di una riga di previsione: le righe ancorate a un SAL si riducono del pagato. */
export function effectiveLineAmount(agg: ProcedureAggregate, line: ForecastLine): Money {
  if (line.anchorType === "SAL") {
    const seq = Number(line.anchorRef.replace(/^SAL/, ""));
    const rest = line.amount.sub(paidOnSal(agg, seq));
    return rest.isNegative() ? Money.ZERO : rest;
  }
  return line.amount;
}

/** Fabbisogno annuo = pagato nell'anno + righe non pagate dell'anno (guida §8.6). */
export function annualNeed(agg: ProcedureAggregate, lines: ForecastLine[] = agg.forecastLines): YearMap {
  const map: YearMap = new Map();
  if (agg.cancelled) return map;
  for (const p of agg.payments) if (p.valid) addTo(map, yearOf(p.date), p.amount);
  for (const l of lines) {
    const amt = effectiveLineAmount(agg, l);
    if (!amt.isZero()) addTo(map, yearOf(l.date), amt);
  }
  return map;
}

export function availableByYear(agg: ProcedureAggregate): YearMap {
  const map: YearMap = new Map();
  for (const b of agg.budget) addTo(map, b.year, b.amount);
  return map;
}

export function committedByYear(agg: ProcedureAggregate): YearMap {
  const map: YearMap = new Map();
  for (const m of agg.movements) if (m.type === "COMMITMENT") addTo(map, m.year, m.amount);
  return map;
}

export interface Overflow {
  year: number;
  need: Money;
  available: Money;
  amount: Money;
}

export function overflows(need: YearMap, available: YearMap): Overflow[] {
  const out: Overflow[] = [];
  for (const [year, n] of [...need.entries()].sort((a, b) => a[0] - b[0])) {
    const a = available.get(year) ?? Money.ZERO;
    if (n.gt(a)) out.push({ year, need: n, available: a, amount: n.sub(a) });
  }
  return out;
}

export function totalPaid(agg: ProcedureAggregate): Money {
  return Money.sum(agg.payments.filter((p) => p.valid).map((p) => p.amount));
}

export function totalLiquidated(agg: ProcedureAggregate): Money {
  return Money.sum(agg.sals.map((s) => s.liquidated));
}

/** Residuo da pagare (guida §8.6). */
export function residualToPay(agg: ProcedureAggregate): Money {
  if (agg.cancelled) return Money.ZERO;
  const base = agg.contract?.signed ? agg.contract.gross : agg.programmed;
  const r = base.sub(totalPaid(agg));
  return r.isNegative() ? Money.ZERO : r;
}

/** Disponibile per un nuovo pagamento su un SAL: liquidato − pagato (BR-011). */
export function payableOnSal(agg: ProcedureAggregate, seq: number): Money {
  const sal = agg.sals.find((s) => s.seq === seq);
  if (!sal) return Money.ZERO;
  return sal.liquidated.sub(paidOnSal(agg, seq));
}

export function mapToRecord(m: YearMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [y, v] of [...m.entries()].sort((a, b) => a[0] - b[0])) out[String(y)] = v.toString();
  return out;
}
