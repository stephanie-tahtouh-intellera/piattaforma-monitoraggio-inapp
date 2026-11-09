import { describe, expect, test } from "vitest";
import { annualAllocationMatches } from "@/domain/finance";
import { computeEconomicFrame, frameToJson, MAX_INCENTIVE_PCT, parsePct } from "@/domain/economic-frame";
import { Money } from "@/domain/money";

const m = (s: string) => Money.parse(s);

describe("[DEC-119] quadro economico e incentivi", () => {
  test("calcola gli incentivi sulla base IVA esclusa e li include nella disponibilità", () => {
    const f = computeEconomicFrame({
      base: m("100000.00"),
      anacFee: m("250.00"),
      incentivesDecision: "YES",
      incentivePct: 150n,
    });
    expect(frameToJson(f)).toEqual({
      base: "100000.00",
      vat_pct: "22.00",
      vat: "22000.00",
      gross: "122000.00",
      anac_fee: "250.00",
      incentives_decision: "YES",
      incentive_pct: "1.50",
      incentive: "1500.00",
      incentives_reduce_available: false,
      incentive_over_cap: false,
      total: "123750.00",
    });
  });

  test("No e Da verificare non calcolano incentivi; la percentuale non è precompilata", () => {
    for (const incentivesDecision of ["NO", "TO_VERIFY"] as const) {
      const f = computeEconomicFrame({ base: m("100000.00"), anacFee: m("250.00"), incentivesDecision });
      expect(f.incentive).toEqual(Money.ZERO);
      expect(f.incentivePct).toBeNull();
      expect(f.total.toString()).toBe("122250.00");
    }
  });

  test("il tetto del 2% è un avviso non bloccante", () => {
    const atLimit = computeEconomicFrame({ base: m("100000.00"), anacFee: Money.ZERO, incentivesDecision: "YES", incentivePct: MAX_INCENTIVE_PCT });
    const aboveLimit = computeEconomicFrame({ base: m("100000.00"), anacFee: Money.ZERO, incentivesDecision: "YES", incentivePct: 201n });
    expect(frameToJson(atLimit).incentive_over_cap).toBe(false);
    expect(frameToJson(aboveLimit).incentive_over_cap).toBe(true);
    expect(aboveLimit.incentive.toString()).toBe("2010.00");
  });

  test("la configurazione può ridurre la disponibilità e il riparto deve coincidere", () => {
    const f = computeEconomicFrame({
      base: m("100000.00"),
      anacFee: m("250.00"),
      incentivesDecision: "YES",
      incentivePct: 150n,
      incentivesReduceAvailable: true,
    });
    expect(f.total.toString()).toBe("120750.00");
    expect(annualAllocationMatches([m("60000.00"), m("60750.00")], f.total)).toBe(true);
    expect(annualAllocationMatches([m("60000.00"), m("60749.99")], f.total)).toBe(false);
  });

  test("percentuali configurabili e valori importo negativi rifiutati", () => {
    const f = computeEconomicFrame({
      base: m("1000.00"),
      anacFee: Money.ZERO,
      incentivesDecision: "YES",
      vatPct: 1000n,
      incentivePct: 100n,
    });
    expect(f.vat.toString()).toBe("100.00");
    expect(f.incentive.toString()).toBe("10.00");
    expect(() => computeEconomicFrame({ base: m("-1.00"), anacFee: Money.ZERO, incentivesDecision: "NO" })).toThrow(/negativ/);
  });

  test("parsePct accetta punto e virgola", () => {
    expect(parsePct("2")).toBe(200n);
    expect(parsePct("22,5")).toBe(2250n);
    expect(parsePct("1.25")).toBe(125n);
    expect(() => parsePct("2,555")).toThrow();
  });
});
