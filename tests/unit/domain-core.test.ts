import { describe, expect, test } from "vitest";
import { BusinessCalendar, addDays, addMonths, daysBetween, easter, isoDate, weekday } from "@/domain/dates";
import { Money, divRoundHalfUp, parsePercent, splitByPercent } from "@/domain/money";

describe("[DEC-033] Money", () => {
  test("parse e toString a 2 decimali", () => {
    expect(Money.parse("47600").toString()).toBe("47600.00");
    expect(Money.parse("195081.97").toString()).toBe("195081.97");
    expect(Money.parse("-150000.5").toString()).toBe("-150000.50");
    expect(() => Money.parse("1.234")).toThrow();
    expect(() => Money.parse("1,23")).toThrow();
  });
  test("non convertibile in number", () => {
    expect(() => +(Money.parse("1") as unknown as number)).toThrow();
  });
  test("ROUND_HALF_UP intero", () => {
    expect(divRoundHalfUp(5n, 2n)).toBe(3n);
    expect(divRoundHalfUp(-5n, 2n)).toBe(-3n);
    expect(divRoundHalfUp(4n, 3n)).toBe(1n);
  });
  test("[US-062] piano SAL 20/50/30 su 238.000 e ultimo SAL assorbe i centesimi", () => {
    const parts = splitByPercent(Money.parse("238000.00"), ["20.00", "50.00", "30.00"].map(parsePercent));
    expect(parts.map(String)).toEqual(["47600.00", "119000.00", "71400.00"]);
    const odd = splitByPercent(Money.parse("100.00"), ["33.33", "33.33", "33.34"].map(parsePercent));
    expect(Money.sum(odd).toString()).toBe("100.00");
  });
});

describe("[US-101] calendario e date", () => {
  const cal = new BusinessCalendar();
  test("giorni della settimana e Pasquetta", () => {
    expect(weekday(isoDate("2026-10-01"))).toBe(3); // giovedì
    expect(easter(2026)).toBe("2026-04-05");
    expect(cal.isHoliday(isoDate("2026-04-06"))).toBe(true);
    expect(cal.isHoliday(isoDate("2027-03-29"))).toBe(true);
  });
  test("spostamento al giorno lavorativo successivo", () => {
    expect(cal.roll(isoDate("2026-10-11"))).toBe("2026-10-12");
    expect(cal.roll(isoDate("2027-08-14"))).toBe("2027-08-16");
    expect(cal.roll(isoDate("2026-12-25"))).toBe("2026-12-28");
  });
  test("aritmetica e fine anno", () => {
    expect(daysBetween(isoDate("2026-10-01"), isoDate("2026-10-06"))).toBe(5);
    expect(addDays(isoDate("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(isoDate("2028-02-28"), 1)).toBe("2028-02-29");
  });
  test("[DEC-015] EDATE", () => {
    expect(addMonths(isoDate("2026-03-31"), -1)).toBe("2026-02-28");
    expect(addMonths(isoDate("2026-10-06"), -1)).toBe("2026-09-06");
    expect(addMonths(isoDate("2026-01-15"), -4)).toBe("2025-09-15");
  });
});
