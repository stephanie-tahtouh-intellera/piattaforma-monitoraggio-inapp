import { describe, expect, test } from "vitest";
import { buildMemoryOutline, MEMORY_ASSISTANT_NOTICE } from "@/domain/memory-draft";

const base = {
  title: "Servizio di help desk applicativo",
  structure: "Sistemi informativi",
  project: "Operazione 1 – Attività 5",
  type: "DIRECT_AWARD_MEPA",
  awardCriterion: "LOWEST_PRICE",
  incentivesDecision: "TO_VERIFY" as const,
};

describe("[DEC-119] assistente alla memoria: schema di testo", () => {
  test("usa solo i testi della bozza e lascia segnaposto da completare", () => {
    const t = buildMemoryOutline(base);
    expect(t).toContain("OGGETTO: Servizio di help desk applicativo");
    expect(t).toContain("Struttura richiedente: Sistemi informativi");
    expect(t).toContain("Progetto: Operazione 1 – Attività 5");
    expect(t).toContain("affidamento diretto o trattativa diretta su MePA (criterio del minor prezzo)");
    expect(t).toContain("incentivi per funzioni tecniche: Da verificare");
    expect(t).toMatch(/\[Descrivere/);
    expect(t).toContain("7. Allegati");
  });

  test("non contiene mai importi né date", () => {
    for (const incentivesDecision of ["YES", "NO", "TO_VERIFY"] as const) {
      const t = buildMemoryOutline({ ...base, incentivesDecision });
      expect(t.replace(/\d\.\s/g, "").replace(/^\d\. /gm, "").replace(/Operazione 1 – Attività 5/g, "")).not.toMatch(/\d/);
      expect(t).not.toMatch(/€|euro/i);
    }
  });

  test("riporta la scelta della Struttura senza automatizzare decisioni", () => {
    expect(buildMemoryOutline({ ...base, incentivesDecision: "YES" })).toContain("incentivi per funzioni tecniche: Sì");
    expect(buildMemoryOutline({ ...base, incentivesDecision: "NO" })).toContain("incentivi per funzioni tecniche: No");
    expect(buildMemoryOutline({ ...base, project: null })).toContain("Progetto: [da indicare]");
  });

  test("è deterministico e l'avviso dichiara che non genera importi, date né stati", () => {
    expect(buildMemoryOutline(base)).toBe(buildMemoryOutline({ ...base }));
    expect(MEMORY_ASSISTANT_NOTICE).toMatch(/importi, date né stati/);
  });
});
