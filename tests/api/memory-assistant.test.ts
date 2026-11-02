import { beforeAll, describe, expect, test } from "vitest";
import { memoryAssistantProvider, setMemoryAssistantProvider } from "@/application/memory-assistant";
import { systemNowIso } from "@/infrastructure/clock";
import type { Db } from "@/infrastructure/db/connection";
import { login, type Actor } from "@/server/auth";
import { createDraft, proposeMemoryText, submitMemory } from "@/server/admin-commands";
import { scenarioDb } from "../helpers/db";

let db: Db;
const as = async (l: string): Promise<Actor> => (await login(db, l, "Demo2026!")).actor;
beforeAll(async () => {
  db = await scenarioDb();
});

describe("[DEC-111] assistente alla memoria", () => {
  test("spento di default; attivato propone solo testo alla Struttura, per la bozza, e lascia traccia nell'audit", async () => {
    const s = await as("struttura.si");
    const { code } = await createDraft(db, s, { title: "Servizio di assistenza applicativa", type: "DIRECT_AWARD_MEPA", programmed: "5000.00", annual: { "2026": "5000.00" }, memoryDue: "2026-11-02" });
    expect(await memoryAssistantProvider(db)).toBe("disabled");
    await expect(proposeMemoryText(db, s, code)).rejects.toThrow(/non è attivo/);

    await setMemoryAssistantProvider(db, "template", "admin", systemNowIso());
    expect(await memoryAssistantProvider(db)).toBe("template");
    const r = await proposeMemoryText(db, s, code);
    expect(r.provider).toBe("template");
    expect(r.text).toContain("OGGETTO: Servizio di assistenza applicativa");
    expect(r.notice).toMatch(/importi, date né stati/);
    // non scrive nulla sulla procedura e registra l'uso senza il contenuto
    const audit = (await db.prepare("SELECT after_json FROM audit_events WHERE action = 'MEMORY_TEXT_PROPOSED'").all()) as { after_json: string }[];
    expect(audit).toHaveLength(1);
    expect(JSON.parse(audit[0]!.after_json)).toEqual({ provider: "template" });

    // solo la Struttura richiedente
    await expect(proposeMemoryText(db, await as("gare"), code)).rejects.toThrow();
    // dopo la consegna la procedura non è più in bozza
    await submitMemory(db, s, code, "2026-10-01", null);
    await expect(proposeMemoryText(db, s, code)).rejects.toThrow(/non è più in bozza|bozza/);

    // un valore sconosciuto in configurazione non attiva nulla
    await db.prepare("UPDATE config SET value_json = '\"qualcosa\"' WHERE key = 'llm.provider'").run();
    expect(await memoryAssistantProvider(db)).toBe("disabled");
  });
});
