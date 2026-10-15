import { describe, expect, test } from "vitest";
import { computeEconomicFrame, frameToJson, parsePct } from "@/domain/economic-frame";
import { Money } from "@/domain/money";

const m = (s: string) => Money.parse(s);

describe("[DEC-111] quadro economico", () => {
  test("base 100.000 con DEC: IVA 22%, tassa 250, incentivi 2% (80% personale, 20% fondo)", () => {
    const f = computeEconomicFrame({ base: m("100000.00"), anacFee: m("250.00"), hasDec: true });
    expect(frameToJson(f)).toEqual({
      base: "100000.00", vat_pct: "22.00", vat: "22000.00", gross: "122000.00", anac_fee: "250.00", has_dec: true,
      incentive_pct: "2.00", incentive: "2000.00", incentive_personnel: "1600.00", incentive_fund: "400.00", total: "124250.00",
    });
  });

  test("senza DEC non maturano incentivi e il totale è contratto + tassa", () => {
    const f = computeEconomicFrame({ base: m("100000.00"), anacFee: m("250.00"), hasDec: false });
    expect(f.incentive.toString()).toBe("0.00");
    expect(f.total.toString()).toBe("122250.00");
  });

  test("arrotondamento al centesimo e quota personale + fondo = incentivi", () => {
    const f = computeEconomicFrame({ base: m("262050.00"), anacFee: m("250.00"), hasDec: true });
    expect(f.vat.toString()).toBe("57651.00");
    expect(f.incentive.toString()).toBe("5241.00");
    expect(f.incentivePersonnel.add(f.incentiveFund).eq(f.incentive)).toBe(true);
    const g = computeEconomicFrame({ base: m("33.33"), anacFee: Money.ZERO, hasDec: true, incentivePct: 150n });
    expect(g.incentivePersonnel.add(g.incentiveFund).eq(g.incentive)).toBe(true);
  });

  test("aliquote configurabili e valori negativi rifiutati", () => {
    const f = computeEconomicFrame({ base: m("1000.00"), anacFee: Money.ZERO, hasDec: true, vatPct: 1000n, incentivePct: 100n });
    expect(f.vat.toString()).toBe("100.00");
    expect(f.incentive.toString()).toBe("10.00");
    expect(() => computeEconomicFrame({ base: m("-1.00"), anacFee: Money.ZERO, hasDec: false })).toThrow(/negativ/);
  });

  test("parsePct accetta punto e virgola", () => {
    expect(parsePct("2")).toBe(200n);
    expect(parsePct("22,5")).toBe(2250n);
    expect(parsePct("1.25")).toBe(125n);
    expect(() => parsePct("2,555")).toThrow();
  });
});
