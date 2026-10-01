import { describe, expect, test } from "vitest";
import { isoDate } from "@/domain/dates";
import { evaluateProcedure } from "@/domain/evaluate";
import { mapToRecord } from "@/domain/finance";
import { DEFAULT_SETTINGS } from "@/domain/model";
import { alternatives, fastestCandidate, serializeSimulation, simulate } from "@/domain/reschedule";
import { Money } from "@/domain/money";
import { REF, cal, loadOracle, scenarioAggregates } from "../helpers/scenarios";

const oracle = loadOracle();
const aggs = scenarioAggregates();
const evals = new Map([...aggs].map(([k, a]) => [k, evaluateProcedure(a, REF, DEFAULT_SETTINGS)]));

describe("[ORACLE] motore deterministico sulle 12 procedure al 01/10/2026", () => {
  for (const code of Object.keys(oracle.procedures)) {
    const exp = oracle.procedures[code];
    test(`${code}: stato, health, scadenza, importi, alert, anomalie`, () => {
      const ev = evals.get(code)!;
      expect(ev, code).toBeDefined();
      expect(ev.status).toBe(exp.status);
      expect(ev.health).toBe(exp.health);
      expect(ev.rescheduleRequired).toBe(exp.reschedule_required);
      if (exp.next_deadline === null) expect(ev.nextDeadline).toBeNull();
      else {
        expect(ev.nextDeadline?.target).toBe(exp.next_deadline.target);
        expect(ev.nextDeadline?.due).toBe(exp.next_deadline.date);
        expect(ev.nextDeadline?.daysUntil).toBe(exp.next_deadline.days);
      }
      expect(ev.programmed.toString()).toBe(exp.amounts.programmed);
      expect(ev.contracted?.toString() ?? null).toBe(exp.amounts.contracted);
      expect(ev.paid.toString()).toBe(exp.amounts.paid);
      expect(ev.residual.toString()).toBe(exp.amounts.residual);
      expect(ev.atRisk.total.toString()).toBe(exp.amounts.at_risk);
      expect(mapToRecord(ev.annualNeed)).toEqual(exp.annual_need);
      const alerts = ev.alerts.map((a) => ({ rule: a.rule, target: a.target, level: a.level.level, severity: a.level.severity }));
      expect(alerts).toEqual(exp.open_alerts);
      const anomalies = ev.anomalies.map((a) => ({ rule: a.rule, target: a.target, severity: a.severity }));
      expect(anomalies).toEqual(exp.anomalies);
    });
  }

  test("[T-025] KPI di portafoglio", () => {
    const all = [...evals.values()];
    const active = all.filter((e) => e.status !== "CANCELLED");
    const k = oracle.kpi;
    expect(all.length).toBe(k.procedures_total);
    expect(all.filter((e) => e.late).length).toBe(k.procedures_late);
    expect(all.filter((e) => e.rescheduleRequired).length).toBe(k.to_reschedule);
    expect(all.flatMap((e) => e.alerts).filter((a) => a.level.severity === "CRITICAL").length).toBe(k.critical_alerts);
    expect(Money.sum(active.map((e) => e.programmed)).toString()).toBe(k.programmed);
    expect(Money.sum(all.map((e) => e.contracted ?? Money.ZERO)).toString()).toBe(k.contracted);
    expect(Money.sum(all.map((e) => e.paid)).toString()).toBe(k.paid);
    expect(Money.sum(all.map((e) => e.atRisk.total)).toString()).toBe(k.at_risk.total);
    expect(Money.sum(all.map((e) => e.atRisk.uncovered)).toString()).toBe(k.at_risk.uncovered);
    const years: Record<string, Money> = {};
    for (const e of all) for (const [y, v] of e.annualNeed) years[y] = (years[y] ?? Money.ZERO).add(v);
    expect(Object.fromEntries(Object.entries(years).map(([y, v]) => [y, v.toString()]))).toEqual(k.annual_need);
    const health: Record<string, number> = {};
    for (const e of all) health[e.health] = (health[e.health] ?? 0) + 1;
    expect(health).toEqual(k.health);
  });
});

describe("[US-051][US-052][US-053] simulazioni di riprogrammazione", () => {
  for (const [id, s] of Object.entries<any>(oracle.simulations)) {
    test(`${id} su ${s.procedure}`, () => {
      const agg = aggs.get(s.procedure)!;
      const before = JSON.stringify(agg, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
      const r = serializeSimulation(simulate(agg, s.source, isoDate(s.candidate_date), REF, cal));
      expect(r.date_changes).toBe(s.expected.date_changes);
      expect(r.amount_shifted).toBe(s.expected.amount_shifted);
      expect(r.annual_impact).toEqual(s.expected.annual_impact);
      expect(r.criticalities.map((c) => ({ code: c.code, year: c.year, amount: c.amount, severity: c.severity }))).toEqual(
        s.expected.criticalities,
      );
      // BR-006/BR-007: la simulazione non altera l'aggregato
      expect(JSON.stringify(agg, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).toBe(before);
    });
  }

  test("[DEC-040] alternativa più rapida e accorpamento", () => {
    for (const [code, date] of Object.entries<string>(oracle.fastest_candidate)) {
      const agg = aggs.get(code)!;
      const src = code === "P-002" ? "MEMORY_SUBMISSION" : code === "P-005" ? "CONTRACT_SIGNED" : "AWARD";
      expect(fastestCandidate(agg, src, REF, cal)).toBe(date);
    }
    const alts = alternatives(aggs.get("P-002")!, "MEMORY_SUBMISSION", REF, cal, isoDate("2026-11-16"));
    expect(alts.map((a) => a.kind)).toEqual(["FASTEST", "MIN_ANNUAL_IMPACT", "MANUAL"]);
    expect(alts[1]!.sameAs).toBe("FASTEST");
    expect(alts[2]!.result.criticalities[0]?.amount?.toString()).toBe("80000.00");
  });
});
