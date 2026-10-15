import { describe, expect, test } from "vitest";
import { itToIso } from "@/ui/date-input";

describe("data in formato italiano", () => {
  test("gg/mm/aaaa diventa aaaa-mm-gg", () => {
    expect(itToIso("01/10/2026")).toBe("2026-10-01");
    expect(itToIso("29/02/2028")).toBe("2028-02-29");
  });
  test("formati e giorni non validi sono rifiutati", () => {
    expect(itToIso("10/01/26")).toBe("");
    expect(itToIso("2026-10-01")).toBe("");
    expect(itToIso("31/04/2026")).toBe("");
    expect(itToIso("29/02/2026")).toBe("");
    expect(itToIso("")).toBe("");
  });
});
