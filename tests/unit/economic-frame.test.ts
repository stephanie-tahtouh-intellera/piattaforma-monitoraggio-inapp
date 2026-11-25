import { describe, expect, test } from "vitest";
import { annualAllocationMatches } from "@/domain/finance";
import { anacFeeForBase, computeEconomicFrame, frameToJson, MAX_INCENTIVE_PCT, parsePct, scaledIncentive } from "@/domain/economic-frame";
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
      incentive_method: "FLAT_PCT",
      incentive_total: "1500.00",
      incentive_personnel: "1500.00",
      incentive_fund: "0.00",
      irap: "0.00",
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

  test("tassa ANAC: quota della stazione appaltante per fascia di base di gara, esente sotto 40.000 €", () => {
    const fee = (v: string) => anacFeeForBase(m(v)).toString();
    expect(fee("39999.99")).toBe("0.00");
    expect(fee("40000.00")).toBe("35.00");
    expect(fee("149999.99")).toBe("35.00");
    expect(fee("150000.00")).toBe("250.00");
    expect(fee("347781.25")).toBe("250.00");
    expect(fee("499999.99")).toBe("250.00");
    expect(fee("500000.00")).toBe("410.00");
    expect(fee("999999.99")).toBe("410.00");
    expect(fee("1000000.00")).toBe("660.00");
    expect(fee("4999999.99")).toBe("660.00");
    expect(fee("5000000.00")).toBe("880.00");
    expect(fee("25000000.00")).toBe("880.00");
  });

  test("senza importo indicato la tassa ANAC è quella della fascia; un importo esplicito prevale", () => {
    const auto = computeEconomicFrame({ base: m("100000.00"), incentivesDecision: "NO" });
    expect(auto.anacFee.toString()).toBe("35.00");
    expect(auto.total.toString()).toBe("122035.00");
    const manual = computeEconomicFrame({ base: m("100000.00"), anacFee: m("0.00"), incentivesDecision: "NO" });
    expect(manual.total.toString()).toBe("122000.00");
  });

  test("incentivi a scaglioni: l'esempio dell'Ufficio Bilancio torna al centesimo (DEC-147)", () => {
    const d = scaledIncentive(m("347781.25"));
    expect(d.total.toString()).toBe("6286.72");
    expect(d.personnel.toString()).toBe("5029.37");
    expect(d.fund.toString()).toBe("1257.35");
    expect(d.irap.toString()).toBe("427.50");
    const f = computeEconomicFrame({ base: m("347781.25"), anacFee: Money.ZERO, incentivesDecision: "YES", incentiveMethod: "SCALED" });
    expect(f.vat.toString()).toBe("76511.88");
    expect(f.gross.toString()).toBe("424293.13");
    expect(f.incentive.toString()).toBe("5456.87");
    expect(f.total.toString()).toBe("429750.00");
    expect(frameToJson(f)).toMatchObject({ incentive_pct: "1.81", incentive_total: "6286.72", incentive_fund: "1257.35", irap: "427.50", incentive_over_cap: false });
  });

  test("scaglioni: 2% fino alla soglia, poi 1,5%, 1,2% e 1,0%", () => {
    expect(scaledIncentive(m("100000.00")).total.toString()).toBe("2000.00");
    expect(scaledIncentive(m("214000.00")).total.toString()).toBe("4280.00");
    expect(scaledIncentive(m("500000.00")).total.toString()).toBe("8570.00"); // 4.280 + 286.000 × 1,5%
    expect(scaledIncentive(m("800000.00")).total.toString()).toBe("12170.00"); // + 300.000 × 1,2%
    expect(scaledIncentive(m("1000000.00")).total.toString()).toBe("14170.00"); // + 200.000 × 1,0%
    expect(scaledIncentive(Money.ZERO).total.toString()).toBe("0.00");
  });

  test("con SCALED No e Da verificare non calcolano incentivi e la percentuale manuale è ignorata", () => {
    for (const incentivesDecision of ["NO", "TO_VERIFY"] as const) {
      const f = computeEconomicFrame({ base: m("347781.25"), anacFee: Money.ZERO, incentivesDecision, incentiveMethod: "SCALED" });
      expect(f.incentive).toEqual(Money.ZERO);
      expect(f.irap).toEqual(Money.ZERO);
    }
    const f = computeEconomicFrame({ base: m("100000.00"), anacFee: Money.ZERO, incentivesDecision: "YES", incentiveMethod: "SCALED", incentivePct: 999n });
    expect(f.incentiveTotal.toString()).toBe("2000.00");
  });

  test("la soglia comunitaria è un parametro", () => {
    expect(scaledIncentive(m("347781.25"), m("215000.00")).total.toString()).toBe("6291.72");
  });
});
