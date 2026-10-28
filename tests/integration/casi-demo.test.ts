import { beforeAll, describe, expect, test } from "vitest";
import { bootstrap } from "@/application/bootstrap";
import { executionModuleEnabled } from "@/application/modules";
import { migrate, openDb, setDbForTests, type Db } from "@/infrastructure/db/connection";
import { login } from "@/server/auth";
import { completeMilestone } from "@/server/commands";
import { submitMemory } from "@/server/admin-commands";
import { listProcedures, procedureDetail } from "@/server/queries";
import { clock, truncateAll } from "../helpers/db";

let db: Db;
const actor = async (l: string) => (await login(db, l, "Demo2026!")).actor;
const active = async (code: string, who = "admin") => (await procedureDetail(db, await actor(who), code)).process.activeStep;

beforeAll(async () => {
  db = await openDb();
  await migrate(db);
  await truncateAll(db);
  await bootstrap(db, clock, { dataset: "inapp" });
  setDbForTests(db);
}, 120000);

describe("[DEC-105][DEC-107] casi dimostrativi del Modulo 1: ogni corsia ha un passo da svolgere", () => {
  test("casi caricati accanto al portafoglio reale, con i modelli del Modulo 1 e il Modulo 2 nascosto", async () => {
    const rows = (await db.prepare("SELECT code, template_code FROM procedures WHERE dataset = 'casi-demo' ORDER BY code").all()) as { code: string; template_code: string }[];
    expect(rows.map((r) => r.code)).toEqual(["BZ-001", "CD-01", "CD-02", "CD-03", "CD-04", "CD-05", "CD-06", "CD-07", "CD-08"]);
    expect(rows.every((r) => r.template_code.startsWith("M1-"))).toBe(true);
    const real = (await db.prepare("SELECT COUNT(*) n, SUM(CASE WHEN template_code LIKE 'M1-%' THEN 1 ELSE 0 END) m1 FROM procedures WHERE dataset = 'inapp'").get()) as { n: number; m1: number };
    expect(real).toEqual({ n: 82, m1: 82 });
    expect(await executionModuleEnabled(db)).toBe(false);
  });

  test("passo in corso e corsia di ciascun caso", async () => {
    const expected: Record<string, [string, string]> = {
      "CD-01": ["MEMORY_SUBMISSION", "STRUCTURE"],
      "CD-02": ["TAKEN_IN_CHARGE", "PROCUREMENT"],
      "CD-03": ["FUNDING_CHECK", "FINANCE"],
      "CD-04": ["OPERATOR_DOCUMENTS", "SUPPLIER"],
      "CD-05": ["AWARD", "PROCUREMENT"],
      "CD-06": ["AWARD", "PROCUREMENT"],
      "CD-07": ["CONTRACT_SIGNED", "SUPPLIER"],
      "CD-08": ["COMMITMENTS", "FINANCE"],
    };
    for (const [code, [step, owner]] of Object.entries(expected)) {
      const a = await active(code);
      expect([a?.code, a?.owner], code).toEqual([step, owner]);
    }
    expect((await procedureDetail(db, await actor("admin"), "BZ-001")).evaluation.status).toBe("DRAFT");
  });

  test("Struttura: vede solo la propria struttura", async () => {
    const r = await listProcedures(db, await actor("struttura.si"), {});
    expect(r.items.map((p) => p.code).sort()).toEqual(["BZ-001", "CD-01", "CD-02", "CD-07"]);
    expect((await active("CD-01", "struttura.si"))?.canComplete).toBe(true);
    expect((await active("CD-02", "struttura.si"))?.canComplete).toBe(false);
  });

  test("Fornitore: vede le pratiche in cui è operatore, anche prima del contratto, e solo i propri passi", async () => {
    const f = await actor("fornitore.alfa");
    expect((await listProcedures(db, f, {})).items.map((p) => p.code).sort()).toEqual(["CD-04", "CD-07"]);
    expect((await active("CD-04", "fornitore.alfa"))?.canComplete).toBe(true);
    await expect(procedureDetail(db, f, "CD-05")).rejects.toThrow(/fuori dal tuo ambito/);
    await expect(completeMilestone(db, await actor("gare"), "CD-04", "OPERATOR_DOCUMENTS", "2026-10-01", null)).rejects.toThrow(/operatore economico/);
  });

  test("Amministrazione: prenotazioni per annualità entro il programmato", async () => {
    const a = await actor("amministrazione");
    await expect(completeMilestone(db, a, "CD-03", "FUNDING_CHECK", "2026-10-01", null, { lines: [{ year: 2027, amount: "300000.00" }] })).rejects.toThrow(/supera l'importo programmato/);
    await completeMilestone(db, a, "CD-03", "FUNDING_CHECK", "2026-10-01", "PN GDL", { lines: [{ year: 2027, amount: "244000.00" }] });
    const d = await procedureDetail(db, a, "CD-03");
    expect(d.process.reservations).toEqual([{ year: 2027, amount: "244000.00" }]);
    expect(d.process.activeStep?.code).toBe("PRELIMINARY_INQUIRY");
  });

  test("Ufficio Gare: simulazioni in attesa di decisione; valore OCR in conflitto consultabile", async () => {
    const s5 = ((await procedureDetail(db, await actor("dirigente"), "CD-05")).simulations as any[]).find((x) => x.created_by === "amministrazione");
    expect([s5.status, s5.blocking]).toEqual(["SUBMITTED", 1]);
    expect(s5.result.criticalities.some((c: any) => c.code === "BUDGET_OVERFLOW")).toBe(true);
    const s6 = ((await procedureDetail(db, await actor("gare"), "CD-06")).simulations as any[]).find((x) => x.created_by === "amministrazione");
    expect([s6.status, s6.blocking]).toEqual(["SUBMITTED", 0]);
    const items = (await procedureDetail(db, await actor("dirigente"), "CD-07")).validations as any[];
    expect(items.some((v) => v.kind === "CONFLICT")).toBe(true);
  });

  // Timeout esteso (DEC-115): 13 passi sequenziali di attori diversi, ognuno un vero stato applicativo
  // (non batchabile: ogni passo è un handoff fra attori reali) contro Postgres remoto condiviso.
  test("percorso completo della procedura guida BZ-001: dal piano alla stipula, ogni corsia nel suo turno", async () => {
    const d = "2026-10-01";
    await submitMemory(db, await actor("struttura.si"), "BZ-001", d, "Prot. INAPP-DEMO 412/2026");
    const steps: [string, string, Parameters<typeof completeMilestone>[6]?][] = [
      ["gare", "TAKEN_IN_CHARGE"],
      ["amministrazione", "FUNDING_CHECK", { lines: [{ year: 2026, amount: "25620.00" }, { year: 2027, amount: "59780.00" }] }],
      ["gare", "PRELIMINARY_INQUIRY", { operator: "SUP-ALFA" }],
      ["fornitore.alfa", "OPERATOR_DOCUMENTS"],
      ["gare", "REQUIREMENTS_CHECK"],
      ["gare", "INDICTION"],
      ["amministrazione", "COMMITMENTS", { lines: [{ year: 2026, amount: "25620.00" }, { year: 2027, amount: "59780.00" }] }],
      ["gare", "PROCEDURE_SETUP"],
      ["gare", "AWARD_PROPOSAL"],
      ["gare", "AWARD", { gross: "84180.00" }],
      ["gare", "CONTRACT_PREPARATION"],
      ["gare", "GUARANTEE"],
      ["fornitore.alfa", "CONTRACT_SIGNED"],
    ];
    for (const [who, step, extras] of steps) {
      expect((await active("BZ-001"))?.code).toBe(step);
      await completeMilestone(db, await actor(who), "BZ-001", step, d, null, extras ?? {});
    }
    const end = await procedureDetail(db, await actor("dirigente"), "BZ-001");
    expect(end.evaluation.status).toBe("EXECUTION");
    expect(end.contract).toMatchObject({ signed: true, gross: "84180.00", net: "69000.00", vat: "15180.00", supplier: "Fornitore Demo Alfa S.r.l." });
    expect(end.process.commitments).toEqual([{ year: 2026, amount: "25620.00" }, { year: 2027, amount: "59780.00" }]);
    expect(end.process.activeStep).toBeNull();
  }, 60000);
});

describe("[DEC-105] assistente sul dataset reale", () => {
  test("gli esempi citano procedure esistenti e ottengono risposta", async () => {
    const { ask, examplesFor } = await import("@/server/assistant");
    const a = await actor("dirigente");
    for (const q of await examplesFor(db)) expect((await ask(db, a, q)).intent, q).not.toBe("UNSUPPORTED");
  });
});
