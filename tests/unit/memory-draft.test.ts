import { describe, expect, test } from "vitest";
import { buildMemoryOutline, MEMORY_ASSISTANT_NOTICE } from "@/domain/memory-draft";

const base = { title: "Servizio di help desk applicativo", structure: "Sistemi informativi", project: "Operazione 1 – Attività 5", type: "DIRECT_AWARD_MEPA", awardCriterion: "LOWEST_PRICE", hasDec: false };

describe("[DEC-111] assistente alla memoria: schema di testo", () => {
  test("usa solo i testi della bozza e lascia segnaposto da completare", () => {
    const t = buildMemoryOutline(base);
    expect(t).toContain("OGGETTO: Servizio di help desk applicativo");
    expect(t).toContain("Struttura richiedente: Sistemi informativi");
    expect(t).toContain("Progetto: Operazione 1 – Attività 5");
    expect(t).toContain("affidamento diretto o trattativa diretta su MePA (criterio del minor prezzo)");
    expect(t).toMatch(/\[Descrivere/);
    expect(t).toContain("7. Allegati");
  });

  test("non contiene mai importi né date", () => {
    for (const hasDec of [false, true]) {
      const t = buildMemoryOutline({ ...base, hasDec });
      // l'oggetto dell'esempio non ha cifre: qualunque numero nel testo sarebbe stato generato dall'assistente
      expect(t.replace(/\d\.\s/g, "").replace(/^\d\. /gm, "").replace(/Operazione 1 – Attività 5/g, "")).not.toMatch(/\d/);
      expect(t).not.toMatch(/€|euro/i);
    }
  });

  test("gli incentivi compaiono solo se è previsto il DEC; senza progetto resta un segnaposto", () => {
    expect(buildMemoryOutline(base)).not.toContain("incentivi");
    expect(buildMemoryOutline({ ...base, hasDec: true })).toContain("incentivi per funzioni tecniche");
    expect(buildMemoryOutline({ ...base, project: null })).toContain("Progetto: [da indicare]");
  });

  test("è deterministico e l'avviso dichiara che non genera importi, date né stati", () => {
    expect(buildMemoryOutline(base)).toBe(buildMemoryOutline({ ...base }));
    expect(MEMORY_ASSISTANT_NOTICE).toMatch(/importi, date né stati/);
  });
});
