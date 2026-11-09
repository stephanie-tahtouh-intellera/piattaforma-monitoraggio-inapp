import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { extractFields } from "@/application/documents";
import { BusinessCalendar, isoDate } from "@/domain/dates";
import { buildAggregateFromSeed } from "@/application/build-aggregate";
import { SeedDataset } from "@/contracts/seed";
import { evaluateAnomalies } from "@/domain/evaluate";
import { DEFAULT_SETTINGS } from "@/domain/model";
import { Money } from "@/domain/money";
import type { ProcedureAggregate, TechnicalIncentives } from "@/domain/model";
import { loadTemplates } from "@/infrastructure/config/templates";
import { REF, scenarioAggregates } from "../helpers/scenarios";

const source = [...scenarioAggregates().values()].find((agg) => !agg.draft && !agg.cancelled && !agg.closed)!;
const fixture = SeedDataset.parse(JSON.parse(readFileSync(path.resolve("seed", "inapp", "casi-demo.json"), "utf8")));

function withIncentives(incentives: TechnicalIncentives, movements = source.movements): ProcedureAggregate {
  return {
    ...source,
    milestones: [
      ...source.milestones,
      { ...source.milestones[0]!, code: "INDICTION", actualDate: isoDate("2026-09-25") },
    ],
    technicalIncentives: incentives,
    movements,
  };
}

function anomalies(agg: ProcedureAggregate) {
  return evaluateAnomalies(agg, [], REF, DEFAULT_SETTINGS);
}

const incentive = (
  decision: TechnicalIncentives["decision"],
  determinationCalculation: TechnicalIncentives["determinationCalculation"] = null,
): TechnicalIncentives => ({
  decision,
  pctHundredths: decision === "YES" ? 150n : null,
  amount: decision === "YES" ? Money.parse("1473.00") : Money.ZERO,
  reduceAvailable: false,
  determinationCalculation,
});

describe("controlli incentivi alla determina di indizione", () => {
  test("Sì senza calcolo segnala il documento incompleto", () => {
    expect(anomalies(withIncentives(incentive("YES"))).map((a) => a.rule)).toContain("INCENTIVE_CALCULATION_MISSING");
  });

  test("Sì confronta importo in determina e prenotazione/impegno", () => {
    const determination = { amount: Money.parse("1473.00"), documentName: "determina.pdf", page: "pag. 2" };
    const movement = { type: "RESERVATION" as const, amount: Money.parse("1474.00"), year: 2026, date: isoDate("2026-09-25"), reference: "prenotazione" };
    const result = anomalies(withIncentives(incentive("YES", determination), [movement]));
    const mismatch = result.find((a) => a.rule === "INCENTIVE_AMOUNT_MISMATCH");
    expect(mismatch?.message).toContain("1473.00");
    expect(mismatch?.message).toContain("1474.00");
    expect(mismatch?.message).toContain("determina.pdf, pag. 2");
  });

  test("No non genera alert incentivi", () => {
    const result = anomalies(withIncentives(incentive("NO")));
    expect(result.some((a) => a.rule.startsWith("INCENTIVE"))).toBe(false);
  });

  test("Da verificare genera una segnalazione non bloccante", () => {
    const result = anomalies(withIncentives(incentive("TO_VERIFY")));
    expect(result).toContainEqual(
      expect.objectContaining({ rule: "INCENTIVES_TO_VERIFY", severity: "LOW" }),
    );
  });

  test("i casi sintetici includono S18 con fonte del calcolo e il caso senza calcolo", () => {
    const templates = loadTemplates();
    const calendar = new BusinessCalendar();
    const s18 = buildAggregateFromSeed(fixture.procedures.find((p) => p.code === "S18-DEMO")!, templates, calendar, DEFAULT_SETTINGS, "m1");
    const missing = buildAggregateFromSeed(fixture.procedures.find((p) => p.code === "INCENTIVI-SENZA-CALCOLO")!, templates, calendar, DEFAULT_SETTINGS, "m1");

    expect(s18.technicalIncentives.determinationCalculation).toMatchObject({
      amount: Money.parse("1473.00"),
      page: "pag. 1",
    });
    expect(s18.programmed.toString()).toBe("121277.00");
    expect(missing.technicalIncentives.determinationCalculation).toBeNull();
    expect(anomalies(s18).map((a) => a.rule)).not.toContain("INCENTIVE_CALCULATION_MISSING");
    expect(anomalies(missing).map((a) => a.rule)).toContain("INCENTIVE_CALCULATION_MISSING");
  });
});

describe("estrazione deterministica del calcolo incentivi", () => {
  test("proposta importo con numero di pagina e documento", () => {
    const fields = extractFields([
      {
        page: 2,
        method: "TEXT_LAYER",
        confidence: "1.00",
        text: "Calcolo incentivi per funzioni tecniche: € 1.473,00 (importo fittizio).",
      },
    ]);
    expect(fields).toContainEqual(expect.objectContaining({ field: "incentive.calculation", value: "1473.00", page: 2 }));
  });
});
