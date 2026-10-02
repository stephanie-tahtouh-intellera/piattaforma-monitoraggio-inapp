import { beforeAll, describe, expect, test } from "vitest";
import type { Db } from "@/infrastructure/db/connection";
import { login, type Actor } from "@/server/auth";
import { createDraft, submitMemory, updateEngineSettings, upsertUser } from "@/server/admin-commands";
import { listProcedures, procedureDetail } from "@/server/queries";
import { scenarioDb } from "../helpers/db";

let db: Db;
const as = (l: string): Actor => login(db, l, "Demo2026!").actor;
beforeAll(async () => {
  db = await scenarioDb();
});

describe("[US-013][US-033] bozza e consegna memoria", () => {
  test("la bozza non genera date effettive né alert; la consegna congela la baseline e passa a Gare", () => {
    const s = as("struttura.si");
    expect(() => createDraft(db, s, { title: "Nuovo servizio demo", type: "DIRECT_AWARD_MEPA", programmed: "50000.00", annual: { "2026": "10000.00", "2027": "30000.00" }, memoryDue: "2026-11-02" })).toThrow(/riparto/);
    const { code } = createDraft(db, s, { title: "Nuovo servizio demo", type: "DIRECT_AWARD_MEPA", programmed: "50000.00", annual: { "2026": "10000.00", "2027": "40000.00" }, memoryDue: "2026-11-02" });
    let d = procedureDetail(db, s, code);
    expect(d.evaluation.status).toBe("DRAFT");
    expect(d.evaluation.health).toBe("NEUTRAL");
    expect(d.timeline.every((m) => m.actual === null)).toBe(true);
    expect(d.versions.some((v: any) => v.is_baseline)).toBe(false);
    expect(listProcedures(db, s, { status: "DRAFT" }).items.map((i) => i.code)).toEqual([code]);
    expect(() => createDraft(db, as("gare"), { title: "x".repeat(6), type: "OPEN", programmed: "1.00", annual: { "2026": "1.00" }, memoryDue: "2026-11-02" })).toThrow(/Struttura/);
    submitMemory(db, s, code, "2026-10-01", "Prot. DEMO 123");
    d = procedureDetail(db, s, code);
    expect(d.evaluation.status).toBe("PRELIMINARY_REVIEW");
    expect(d.versions.filter((v: any) => v.is_baseline).length).toBe(1);
    expect(d.timeline.find((m) => m.active)?.owner).toBe("PROCUREMENT");
    expect(() => submitMemory(db, s, code, "2026-10-01", null)).toThrow(/non è in bozza/);
  });
});

describe("[US-101] soglie configurabili", () => {
  test("finestra di attenzione a 15 giorni rende ambra P-012 (scadenza fra 11 giorni)", () => {
    expect(() => updateEngineSettings(db, as("gare"), { attentionWindowDays: 15 }, undefined)).toThrow(/non consentita/);
    updateEngineSettings(db, as("admin"), { attentionWindowDays: 15 }, ["2026-06-29"]);
    expect(procedureDetail(db, as("dirigente"), "P-012").evaluation.health).toBe("AMBER");
    updateEngineSettings(db, as("admin"), { attentionWindowDays: 10 }, []);
    expect(procedureDetail(db, as("dirigente"), "P-012").evaluation.health).toBe("GREEN");
    expect((db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='CONFIG_UPDATE'").get() as any).n).toBe(2);
  });
});

describe("[US-102] utenti, ruoli e ambiti", () => {
  test("nuovo utente di struttura, disattivazione senza cancellazione, audit dei permessi", () => {
    upsertUser(db, as("admin"), { login: "struttura.form", name: "Struttura Formazione", role: "STRUCTURE_USER", structureScope: "FORMAZIONE", active: true });
    const u = as("struttura.form");
    expect(listProcedures(db, u, {}).items.map((i) => i.code)).toEqual(["P-007"]);
    upsertUser(db, as("admin"), { login: "struttura.form", name: "Struttura Formazione", role: "STRUCTURE_USER", structureScope: "FORMAZIONE", active: false });
    expect(() => as("struttura.form")).toThrow(/Credenziali/);
    expect((db.prepare("SELECT COUNT(*) n FROM users WHERE login='struttura.form'").get() as any).n).toBe(1);
    expect((db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='PERMISSION_CHANGE'").get() as any).n).toBe(2);
  });
});
