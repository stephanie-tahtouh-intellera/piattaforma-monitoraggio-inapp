import { describe, expect, test } from "vitest";
import { formatAmountText, formatAmountWithDecimals } from "@/ui/amount-input";

describe("separatori automatici negli importi", () => {
  test("migliaia con il punto mentre si digita", () => {
    expect(formatAmountText("4")).toBe("4");
    expect(formatAmountText("40000")).toBe("40.000");
    expect(formatAmountText("1234567")).toBe("1.234.567");
    expect(formatAmountText("40.0000")).toBe("400.000");
  });
  test("decimali con la virgola, al massimo due", () => {
    expect(formatAmountText("40000,5")).toBe("40.000,5");
    expect(formatAmountText("40.000,567")).toBe("40.000,56");
    expect(formatAmountText("1234,")).toBe("1.234,");
    expect(formatAmountText(",5")).toBe("0,5");
  });
  test("testo incollato con il punto decimale e caratteri estranei", () => {
    expect(formatAmountText("40000.50")).toBe("40.000,50");
    expect(formatAmountText("€ 1.250,00")).toBe("1.250,00");
    expect(formatAmountText("abc")).toBe("");
    expect(formatAmountText("0012")).toBe("12");
  });
});

describe("decimali sempre visibili (default 00)", () => {
  test("completa con ,00 e riempie i decimali mancanti", () => {
    expect(formatAmountWithDecimals("40000")).toBe("40.000,00");
    expect(formatAmountWithDecimals("40000,5")).toBe("40.000,50");
    expect(formatAmountWithDecimals("1234,")).toBe("1.234,00");
    expect(formatAmountWithDecimals(",5")).toBe("0,50");
    expect(formatAmountWithDecimals("40.000,00")).toBe("40.000,00");
    expect(formatAmountWithDecimals("")).toBe("");
    expect(formatAmountWithDecimals("abc")).toBe("");
  });
  test("digitando nella parte intera i decimali restano, digitando dopo la virgola si sovrascrivono", () => {
    expect(formatAmountWithDecimals("40,00" )).toBe("40,00");
    expect(formatAmountWithDecimals("400,00")).toBe("400,00");
    expect(formatAmountWithDecimals("40.000,500")).toBe("40.000,50");
    expect(formatAmountWithDecimals("40.000,,00")).toBe("40.000,00");
  });
});
