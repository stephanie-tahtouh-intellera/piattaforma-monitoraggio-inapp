import path from "node:path";
import { describe, expect, test } from "vitest";
import { DEFAULT_POLICIES, highestLevel } from "@/domain/alerts";
import { isoDate } from "@/domain/dates";

describe("[DEC-111] alert alla Struttura sulla memoria per tipo di procedura", () => {
  const due = isoDate("2026-12-10");
  const lvl = (code: string, ref: string) => highestLevel(DEFAULT_POLICIES[code]!, due, isoDate(ref))?.level ?? null;

  test("le procedure lunghe hanno un promemoria in più a 2 mesi, quelle brevi non hanno quello a 1 mese", () => {
    expect(DEFAULT_POLICIES.MEMORY_LONG!.levels.map((l) => l.level)).toEqual(["T-2M", "T-1M", "T-10", "T-5", "T-2", "T0", "T+1"]);
    expect(DEFAULT_POLICIES.MEMORY!.levels.map((l) => l.level)).toEqual(["T-1M", "T-10", "T-5", "T-2", "T0", "T+1"]);
    expect(DEFAULT_POLICIES.MEMORY_SHORT!.levels.map((l) => l.level)).toEqual(["T-10", "T-5", "T-2", "T0", "T+1"]);
  });

  test("a due mesi dalla scadenza avvisa solo la procedura lunga", () => {
    expect(lvl("MEMORY_LONG", "2026-10-10")).toBe("T-2M");
    expect(lvl("MEMORY", "2026-10-10")).toBeNull();
    expect(lvl("MEMORY_SHORT", "2026-10-10")).toBeNull();
  });

  test("a un mese avvisano la procedura lunga e quella standard, non quella breve", () => {
    expect(lvl("MEMORY_LONG", "2026-11-12")).toBe("T-1M");
    expect(lvl("MEMORY", "2026-11-12")).toBe("T-1M");
    expect(lvl("MEMORY_SHORT", "2026-11-12")).toBeNull();
  });

  test("a 5 giorni e dopo la scadenza i livelli sono gli stessi per tutte", () => {
    for (const c of ["MEMORY", "MEMORY_SHORT", "MEMORY_LONG"]) {
      expect(lvl(c, "2026-12-05")).toBe("T-5");
      expect(lvl(c, "2026-12-10")).toBe("T0");
      expect(lvl(c, "2026-12-11")).toBe("T+1");
    }
  });

  test("i modelli del Modulo 1 usano la policy per durata; i modelli di collaudo restano sulla standard", async () => {
    process.env.APP_ROOT ??= path.resolve(__dirname, "../..");
    const { loadTemplates } = await import("@/infrastructure/config/templates");
    const policyOf = (code: string) => loadTemplates().find((t) => t.code === code)?.milestones.find((m) => m.code === "MEMORY_SUBMISSION")?.alertPolicy;
    expect(policyOf("M1-AD-v1")).toBe("MEMORY_SHORT");
    expect(policyOf("M1-FA-ADH-v1")).toBe("MEMORY");
    expect(policyOf("M1-NEG-PB-v1")).toBe("MEMORY");
    for (const c of ["M1-NEG-OEPV-v1", "M1-FA-v1", "M1-OPEN-v1"]) expect(policyOf(c)).toBe("MEMORY_LONG");
    for (const c of ["AD-1M-v1", "FA-9M-v1", "NEG-4M-v1", "OPEN-9M-v1"]) expect(policyOf(c)).toBe("MEMORY");
    for (const t of loadTemplates()) for (const m of t.milestones) expect(DEFAULT_POLICIES[m.alertPolicy], `${t.code}/${m.code}`).toBeDefined();
  });
});
