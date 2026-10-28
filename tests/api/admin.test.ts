import { beforeAll, describe, expect, test } from "vitest";
import type { Db } from "@/infrastructure/db/connection";
import { login, type Actor } from "@/server/auth";
import { createDraft, submitMemory, updateEngineSettings, upsertUser } from "@/server/admin-commands";
import { listProcedures, procedureDetail } from "@/server/queries";
import { scenarioDb } from "../helpers/db";

let db: Db;
const as = async (l: string): Promise<Actor> => (await login(db, l, "Demo2026!")).actor;
beforeAll(async () => {
  db = await scenarioDb();
});

describe("[US-013][US-033] bozza e consegna memoria", () => {
  test("la bozza non genera date effettive né alert; la consegna congela la baseline e passa a Gare", async () => {
    const s = await as("struttura.si");
    await expect(createDraft(db, s, { title: "Nuovo servizio demo", type: "DIRECT_AWARD_MEPA", programmed: "50000.00", annual: { "2026": "10000.00", "2027": "30000.00" }, memoryDue: "2026-11-02" })).rejects.toThrow(/riparto/);
    const { code } = await createDraft(db, s, { title: "Nuovo servizio demo", type: "DIRECT_AWARD_MEPA", programmed: "50000.00", annual: { "2026": "10000.00", "2027": "40000.00" }, memoryDue: "2026-11-02" });
    let d = await procedureDetail(db, s, code);
    expect(d.evaluation.status).toBe("DRAFT");
    expect(d.evaluation.health).toBe("NEUTRAL");
    expect(d.timeline.every((m) => m.actual === null)).toBe(true);
    expect(d.versions.some((v: any) => v.is_baseline)).toBe(false);
    expect((await listProcedures(db, s, { status: "DRAFT" })).items.map((i) => i.code)).toEqual([code]);
    await expect(createDraft(db, await as("gare"), { title: "x".repeat(6), type: "OPEN", programmed: "1.00", annual: { "2026": "1.00" }, memoryDue: "2026-11-02" })).rejects.toThrow(/Struttura/);
    await submitMemory(db, s, code, "2026-10-01", "Prot. DEMO 123");
    d = await procedureDetail(db, s, code);
    expect(d.evaluation.status).toBe("PRELIMINARY_REVIEW");
    expect(d.versions.filter((v: any) => v.is_baseline).length).toBe(1);
    expect(d.timeline.find((m) => m.active)?.owner).toBe("PROCUREMENT");
    await expect(submitMemory(db, s, code, "2026-10-01", null)).rejects.toThrow(/non è in bozza/);
  });
});

describe("[DEC-111] quadro economico della bozza", () => {
  test("il programmato è calcolato: contratto + tassa gara + incentivi; il riparto deve coincidere", async () => {
    const s = await as("struttura.si");
    const frame = { base: "100000.00", anacFee: "250.00", hasDec: true };
    // totale = 122.000 + 250 + 2.000 = 124.250
    await expect(createDraft(db, s, { title: "Servizio con quadro economico", type: "DIRECT_AWARD_MEPA", frame, annual: { "2026": "100000.00" }, memoryDue: "2026-11-02" })).rejects.toThrow(/124250.00/);
    const { code } = await createDraft(db, s, { title: "Servizio con quadro economico", type: "DIRECT_AWARD_MEPA", frame, annual: { "2026": "24250.00", "2027": "100000.00" }, memoryDue: "2026-11-02" });
    const d = await procedureDetail(db, s, code);
    expect(d.evaluation.programmed).toBe("124250.00");
    expect(d.procedure.economicFrame).toMatchObject({ base: "100000.00", gross: "122000.00", anac_fee: "250.00", incentive: "2000.00", total: "124250.00", has_dec: true });
    // tassa e incentivi sono costi fuori contratto inclusi nel programmato (DEC-035)
    const row = (await db.prepare("SELECT anac_fee_cents, incentive_cents, base_cents FROM procedures WHERE code = ?").get(code)) as { anac_fee_cents: number; incentive_cents: number; base_cents: number };
    expect(row).toEqual({ anac_fee_cents: 25000, incentive_cents: 200000, base_cents: 10000000 });
  });

  test("senza DEC niente incentivi; il percorso con importo programmato resta valido", async () => {
    const s = await as("struttura.si");
    const { code } = await createDraft(db, s, { title: "Servizio senza DEC", type: "DIRECT_AWARD_MEPA", frame: { base: "10000.00", hasDec: false }, annual: { "2026": "12200.00" }, memoryDue: "2026-11-02" });
    expect((await procedureDetail(db, s, code)).procedure.economicFrame).toMatchObject({ incentive: "0.00", total: "12200.00", has_dec: false });
    const legacy = await createDraft(db, s, { title: "Bozza senza quadro", type: "DIRECT_AWARD_MEPA", programmed: "5000.00", annual: { "2026": "5000.00" }, memoryDue: "2026-11-02" });
    expect((await procedureDetail(db, s, legacy.code)).procedure.economicFrame).toBeNull();
    await expect(createDraft(db, s, { title: "Bozza vuota", type: "OPEN", annual: { "2026": "1.00" }, memoryDue: "2026-11-02" })).rejects.toThrow(/base di gara/);
  });
});

describe("[US-101] soglie configurabili", () => {
  test("finestra di attenzione a 15 giorni rende ambra P-012 (scadenza fra 11 giorni)", async () => {
    await expect(updateEngineSettings(db, await as("gare"), { attentionWindowDays: 15 }, undefined)).rejects.toThrow(/non consentita/);
    await updateEngineSettings(db, await as("admin"), { attentionWindowDays: 15 }, ["2026-06-29"]);
    expect((await procedureDetail(db, await as("dirigente"), "P-012")).evaluation.health).toBe("AMBER");
    await updateEngineSettings(db, await as("admin"), { attentionWindowDays: 10 }, []);
    expect((await procedureDetail(db, await as("dirigente"), "P-012")).evaluation.health).toBe("GREEN");
    expect(((await db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='CONFIG_UPDATE'").get()) as any).n).toBe(2);
  });
});

describe("[US-102] utenti, ruoli e ambiti", () => {
  test("nuovo utente di struttura, disattivazione senza cancellazione, audit dei permessi", async () => {
    await upsertUser(db, await as("admin"), { login: "struttura.form", name: "Struttura Formazione", role: "STRUCTURE_USER", structureScope: "FORMAZIONE", active: true });
    const u = await as("struttura.form");
    expect((await listProcedures(db, u, {})).items.map((i) => i.code)).toEqual(["P-007"]);
    await upsertUser(db, await as("admin"), { login: "struttura.form", name: "Struttura Formazione", role: "STRUCTURE_USER", structureScope: "FORMAZIONE", active: false });
    await expect(as("struttura.form")).rejects.toThrow(/Credenziali/);
    expect(((await db.prepare("SELECT COUNT(*) n FROM users WHERE login='struttura.form'").get()) as any).n).toBe(1);
    expect(((await db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='PERMISSION_CHANGE'").get()) as any).n).toBe(2);
  });
});
