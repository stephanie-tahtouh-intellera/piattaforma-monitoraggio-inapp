import { describe, expect, test } from "vitest";
import { averageAwardDurationDays, awardDurationDays, derivedBase, garaKpi, garaTotals, hundredthsToString, ribassoHundredths } from "@/domain/gara-kpi";
import { isoDate } from "@/domain/dates";
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
    const k = garaKpi({ procedureType: "OPEN", programmed: m("124250.00"), base: m("100000.00"), anacFee: m("250.00"), incentive: m("2000.00"), vatPctHundredths: 2200n, awardedNet: m("90000.00"), awardedGross: m("109800.00") });
    expect(k.baseDerived).toBe(false);
    expect(k.base?.toString()).toBe("100000.00");
    expect(k.ribassoHundredths).toBe(1000n);
    const d = garaKpi({ procedureType: "OPEN", programmed: m("85400.00"), base: null, anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: null, awardedGross: null });
    expect(d.baseDerived).toBe(true);
    expect(d.base?.toString()).toBe("70000.00");
    expect(d.ribassoHundredths).toBeNull();
  });

  test("[DEC-120] il ribasso non è significativo nella variante A (gara non competitiva): sempre nullo anche con base e aggiudicato", () => {
    const k = garaKpi({ procedureType: "DIRECT_AWARD_MEPA", programmed: m("12200.00"), base: m("10000.00"), anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: m("9000.00"), awardedGross: m("10980.00") });
    expect(k.competitive).toBe(false);
    expect(k.ribassoHundredths).toBeNull();
    const open = garaKpi({ procedureType: "NEGOTIATED", programmed: m("12200.00"), base: m("10000.00"), anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: m("9000.00"), awardedGross: m("10980.00") });
    expect(open.competitive).toBe(true);
    expect(open.ribassoHundredths).not.toBeNull();
  });

  test("i totali ponderano il ribasso sulle sole gare competitive e aggiudicate (DEC-120)", () => {
    const a = garaKpi({ procedureType: "OPEN", programmed: m("122000.00"), base: m("100000.00"), anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: m("90000.00"), awardedGross: m("109800.00") });
    const b = garaKpi({ procedureType: "NEGOTIATED", programmed: m("61000.00"), base: m("50000.00"), anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: m("45000.00"), awardedGross: m("54900.00") });
    const open = garaKpi({ procedureType: "FRAMEWORK_AGREEMENT", programmed: m("30000.00"), base: m("24000.00"), anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: null, awardedGross: null });
    // affidamento diretto aggiudicato: conta nei totali di volume ma non nel ribasso ponderato
    const direct = garaKpi({ procedureType: "DIRECT_AWARD", programmed: m("6100.00"), base: m("5000.00"), anacFee: m("0.00"), incentive: m("0.00"), vatPctHundredths: 2200n, awardedNet: m("5000.00"), awardedGross: m("6100.00") });
    const t = garaTotals([a, b, open, direct]);
    expect(t.count).toBe(4);
    expect(t.awardedCount).toBe(3);
    expect(t.competitiveAwardedCount).toBe(2);
    expect(t.programmed.toString()).toBe("219100.00");
    expect(t.base.toString()).toBe("179000.00");
    expect(t.awardedNet.toString()).toBe("140000.00");
    // (150.000 − 135.000) / 150.000 = 10,00 %, solo su OPEN e NEGOTIATED
    expect(t.ribassoHundredths).toBe(1000n);
    expect(garaTotals([open]).ribassoHundredths).toBeNull();
    expect(garaTotals([direct]).ribassoHundredths).toBeNull();
    // quota del programmato sulle gare competitive (a, b, open): (122.000+61.000+30.000) / 219.100 = 96,8 % circa
    expect(t.programmedCompetitive.toString()).toBe("213000.00");
    expect(t.competitiveProgrammedShareHundredths).toBe(9722n);
  });

  test("[DEC-120] giorni fra indizione e aggiudicazione, nulli finché una data manca", () => {
    const indiction = isoDate("2026-03-01");
    const award = isoDate("2026-05-30");
    expect(awardDurationDays(indiction, award)).toBe(90);
    expect(awardDurationDays(null, award)).toBeNull();
    expect(awardDurationDays(indiction, null)).toBeNull();
  });

  test("[DEC-120] la media dei giorni di aggiudicazione ignora le procedure senza entrambe le date", () => {
    expect(averageAwardDurationDays([90, 110, null, 70])).toBe(90);
    expect(averageAwardDurationDays([null, null])).toBeNull();
    expect(averageAwardDurationDays([])).toBeNull();
  });
});
