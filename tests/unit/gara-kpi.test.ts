import { describe, expect, test } from "vitest";
import { derivedBase, garaKpi, garaTotals, hundredthsToString, ribassoHundredths } from "@/domain/gara-kpi";
import { Money } from "@/domain/money";

const m = (s: string) => Money.parse(s);

describe("[DEC-111] KPI per gara", () => {
  test("ribasso in centesimi di punto, ROUND_HALF_UP", () => {
    // base 100.000 € aggiudicata a 87.500 € → 12,50 %
    expect(ribassoHundredths(m("100000.00"), m("87500.00"))).toBe(1250n);
    // 1/3: (3 − 2) / 3 = 33,333… % → 33,33 %
    expect(ribassoHundredths(m("3.00"), m("2.00"))).toBe(3333n);
    // 2/3 di ribasso: 66,666… % → 66,67 %
    expect(ribassoHundredths(m("3.00"), m("1.00"))).toBe(6667n);
    // aggiudicato sopra la base: ribasso negativo
    expect(ribassoHundredths(m("100.00"), m("105.00"))).toBe(-500n);
    expect(ribassoHundredths(null, m("1.00"))).toBeNull();
    expect(ribassoHundredths(m("100.00"), null)).toBeNull();
    expect(ribassoHundredths(m("0.00"), m("0.00"))).toBeNull();
  });

  test("conversione in stringa decimale", () => {
    expect(hundredthsToString(1250n)).toBe("12.50");
    expect(hundredthsToString(5n)).toBe("0.05");
    expect(hundredthsToString(-500n)).toBe("-5.00");
    expect(hundredthsToString(-50n)).toBe("-0.50");
    expect(hundredthsToString(0n)).toBe("0.00");
  });

  test("base ricavata dal programmato: (programmato − tassa − incentivi) / (1 + IVA)", () => {
    // 124.250 = 122.000 contratto + 250 tassa + 2.000 incentivi → base 100.000
    expect(derivedBase(m("124250.00"), m("250.00"), m("2000.00"), 2200n).toString()).toBe("100000.00");
    // senza tassa né incentivi: 85.400 / 1,22 = 70.000
    expect(derivedBase(m("85400.00"), m("0.00"), m("0.00"), 2200n).toString()).toBe("70000.00");
  });

  test("la base inserita prevale su quella ricavata", () => {
    const k = garaKpi({ programmed: m("124250.00"), base: m("100000.00"), anacFee: m("250.00"), incentive: m("2000.00"), vatPctHundredths: 2200n, awardedNet: m("90000.00"), awardedGross: m("109800.00") });
    expect(k.baseDerived).toBe(false);
    expect(k.base?.toString()).toBe("100000.00");
    expect(k.ribassoHundredths).toBe(1000n);
    const d = garaKpi({ programmed: m("85400.00"), base: null, anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: null, awardedGross: null });
    expect(d.baseDerived).toBe(true);
    expect(d.base?.toString()).toBe("70000.00");
    expect(d.ribassoHundredths).toBeNull();
  });

  test("i totali ponderano il ribasso sulle sole gare aggiudicate", () => {
    const a = garaKpi({ programmed: m("122000.00"), base: m("100000.00"), anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: m("90000.00"), awardedGross: m("109800.00") });
    const b = garaKpi({ programmed: m("61000.00"), base: m("50000.00"), anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: m("45000.00"), awardedGross: m("54900.00") });
    const open = garaKpi({ programmed: m("30000.00"), base: m("24000.00"), anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: null, awardedGross: null });
    const t = garaTotals([a, b, open]);
    expect(t.count).toBe(3);
    expect(t.awardedCount).toBe(2);
    expect(t.programmed.toString()).toBe("213000.00");
    expect(t.base.toString()).toBe("174000.00");
    expect(t.awardedNet.toString()).toBe("135000.00");
    // (150.000 − 135.000) / 150.000 = 10,00 %
    expect(t.ribassoHundredths).toBe(1000n);
    expect(garaTotals([open]).ribassoHundredths).toBeNull();
  });
});
