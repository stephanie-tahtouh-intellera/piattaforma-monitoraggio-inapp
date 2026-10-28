import { beforeAll, describe, expect, test } from "vitest";
import { runChecks } from "@/application/run-checks";
import { readDataset, seedDataset } from "@/application/seed-loader";
import { centsToString } from "@/contracts/format";
import { missingTriggers, type Db } from "@/infrastructure/db/connection";
import { verifyAuditChain } from "@/infrastructure/audit";
import { clock, scenarioDb } from "../helpers/db";
import { loadOracle, root } from "../helpers/scenarios";
import path from "node:path";

const oracle = loadOracle();
let db: Db;
beforeAll(async () => {
  db = await scenarioDb();
});

const count = async (sql: string, ...p: unknown[]) => ((await db.prepare(sql).get(...p)) as { n: number }).n;

describe("[ORACLE][T-001] dataset scenarios su SQLite", () => {
  test("12 procedure caricate", async () => {
    expect(await count("SELECT COUNT(*) AS n FROM procedures")).toBe(12);
  });

  test("snapshot = oracle per ogni procedura", async () => {
    for (const [code, exp] of Object.entries<any>(oracle.procedures)) {
      const s = (await db.prepare("SELECT s.* FROM procedure_snapshot s JOIN procedures p ON p.id = s.procedure_id WHERE p.code = ?").get(code)) as any;
      expect(s.status, code).toBe(exp.status);
      expect(s.health, code).toBe(exp.health);
      expect(s.reschedule_required === 1, code).toBe(exp.reschedule_required);
      expect(centsToString(s.paid_cents), code).toBe(exp.amounts.paid);
      expect(centsToString(s.residual_cents), code).toBe(exp.amounts.residual);
      expect(centsToString(s.at_risk_cents), code).toBe(exp.amounts.at_risk);
      expect(s.next_deadline_date ?? null, code).toBe(exp.next_deadline?.date ?? null);
    }
  });

  test("[T-004][T-005] alert aperti e notifiche (17 in-app / 19 e-mail)", async () => {
    const rows = (await db
      .prepare("SELECT p.code, a.rule, a.target, a.current_level AS level, a.severity FROM alerts a JOIN procedures p ON p.id = a.procedure_id WHERE a.kind='ALERT' AND a.status='OPEN' ORDER BY p.code, a.id")
      .all()) as any[];
    const expected = Object.entries<any>(oracle.procedures).flatMap(([code, e]) => e.open_alerts.map((a: any) => ({ code, ...a })));
    expect(rows).toEqual(expected);
    expect(await count("SELECT COUNT(*) AS n FROM alert_notifications WHERE channel='IN_APP'")).toBe(oracle.notifications.in_app);
    expect(await count("SELECT COUNT(*) AS n FROM alert_notifications WHERE channel='EMAIL'")).toBe(oracle.notifications.email);
    expect(await count("SELECT COUNT(*) AS n FROM outbox")).toBe(oracle.notifications.email);
    const p001 = (await db.prepare("SELECT recipient, subject FROM outbox WHERE subject LIKE '%P-001%'").all()) as any[];
    expect(p001).toEqual([{ recipient: "struttura.si@demo.invalid", subject: "[Piattaforma Demo] Memoria in scadenza tra 5 giorni — P-001" }]);
  });

  test("anomalie attese", async () => {
    const rows = await db.prepare("SELECT p.code, a.rule, a.target, a.severity FROM alerts a JOIN procedures p ON p.id = a.procedure_id WHERE a.kind='ANOMALY' AND a.status='OPEN' ORDER BY p.code").all();
    const expected = Object.entries<any>(oracle.procedures).flatMap(([code, e]) => e.anomalies.map((a: any) => ({ code, ...a })));
    expect(rows).toEqual(expected);
  });

  test("[DEC-041] simulazioni automatiche DRAFT con alternativa più rapida", async () => {
    const sims = await db.prepare("SELECT p.code, s.candidate_date, s.status, (s.result_json::json ->> 'amount_shifted') AS shifted FROM simulations s JOIN procedures p ON p.id = s.procedure_id ORDER BY p.code").all();
    expect(sims).toEqual([
      { code: "P-002", candidate_date: "2026-10-12", status: "DRAFT", shifted: "0.00" },
      { code: "P-005", candidate_date: "2026-10-12", status: "DRAFT", shifted: "0.00" },
      { code: "P-008", candidate_date: "2026-10-12", status: "DRAFT", shifted: "0.00" },
    ]);
  });

  test("[US-061] P-011 annullata: rilascio di 75.000 generato dal sistema", async () => {
    const r = (await db.prepare("SELECT m.amount_cents FROM financial_movements m JOIN procedures p ON p.id=m.procedure_id WHERE p.code='P-011' AND m.type='RELEASE'").all()) as any[];
    expect(r.map((x) => centsToString(x.amount_cents))).toEqual(["75000.00"]);
  });

  test("[T-002][NFR-004] reimport e run_checks idempotenti", async () => {
    const before = {
      p: await count("SELECT COUNT(*) AS n FROM procedures"),
      a: await count("SELECT COUNT(*) AS n FROM alerts"),
      n: await count("SELECT COUNT(*) AS n FROM alert_notifications"),
      o: await count("SELECT COUNT(*) AS n FROM outbox"),
      s: await count("SELECT COUNT(*) AS n FROM simulations"),
    };
    const rep = await seedDataset(db, readDataset(path.join(root, "seed/scenarios/procedures.json")), clock, null);
    expect(rep.inserted).toBe(0);
    expect(rep.skipped).toBe(12);
    await runChecks(db, clock);
    await runChecks(db, clock);
    expect({
      p: await count("SELECT COUNT(*) AS n FROM procedures"),
      a: await count("SELECT COUNT(*) AS n FROM alerts"),
      n: await count("SELECT COUNT(*) AS n FROM alert_notifications"),
      o: await count("SELECT COUNT(*) AS n FROM outbox"),
      s: await count("SELECT COUNT(*) AS n FROM simulations"),
    }).toEqual(before);
  });

  test("[BR-019][NFR-008] audit e movimenti append-only, catena integra, trigger presenti", async () => {
    expect(await missingTriggers(db)).toEqual([]);
    await expect(db.prepare("UPDATE audit_events SET actor = 'x'").run()).rejects.toThrow(/AUDIT_APPEND_ONLY/);
    await expect(db.prepare("DELETE FROM audit_events").run()).rejects.toThrow(/AUDIT_APPEND_ONLY/);
    await expect(db.prepare("DELETE FROM financial_movements").run()).rejects.toThrow(/MOVEMENT_APPEND_ONLY/);
    await expect(db.prepare("UPDATE procedure_versions SET programmed_cents = 1").run()).rejects.toThrow(/VERSION_IMMUTABLE/);
    expect((await verifyAuditChain(db)).ok).toBe(true);
  });

  test("[NFR-005] nessun importo REAL nello schema e CHECK sugli importi", async () => {
    // Postgres (DEC-115): gli importi sono BIGINT, non REAL/NUMERIC/DECIMAL/FLOAT — un valore
    // frazionario viene arrotondato dal cast implicito prima ancora che un CHECK possa vederlo,
    // quindi la garanzia "niente centesimi frazionari" è ora del tipo di colonna, non di un CHECK.
    const cols = (await db.prepare("SELECT table_name AS t, column_name AS c, data_type AS type FROM information_schema.columns WHERE table_schema = 'public'").all()) as any[];
    expect(cols.filter((c) => /real|numeric|decimal|double/i.test(c.type) && /_cents$/.test(c.c))).toEqual([]);
    await expect(db.prepare("UPDATE procedures SET programmed_cents = -1 WHERE code='P-001'").run()).rejects.toThrow(/check/i);
  });
});
