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

const count = (sql: string, ...p: unknown[]) => (db.prepare(sql).get(...p) as { n: number }).n;

describe("[ORACLE][T-001] dataset scenarios su SQLite", () => {
  test("12 procedure caricate", () => {
    expect(count("SELECT COUNT(*) AS n FROM procedures")).toBe(12);
  });

  test("snapshot = oracle per ogni procedura", () => {
    for (const [code, exp] of Object.entries<any>(oracle.procedures)) {
      const s = db.prepare("SELECT s.* FROM procedure_snapshot s JOIN procedures p ON p.id = s.procedure_id WHERE p.code = ?").get(code) as any;
      expect(s.status, code).toBe(exp.status);
      expect(s.health, code).toBe(exp.health);
      expect(s.reschedule_required === 1, code).toBe(exp.reschedule_required);
      expect(centsToString(s.paid_cents), code).toBe(exp.amounts.paid);
      expect(centsToString(s.residual_cents), code).toBe(exp.amounts.residual);
      expect(centsToString(s.at_risk_cents), code).toBe(exp.amounts.at_risk);
      expect(s.next_deadline_date ?? null, code).toBe(exp.next_deadline?.date ?? null);
    }
  });

  test("[T-004][T-005] alert aperti e notifiche (17 in-app / 19 e-mail)", () => {
    const rows = db
      .prepare("SELECT p.code, a.rule, a.target, a.current_level AS level, a.severity FROM alerts a JOIN procedures p ON p.id = a.procedure_id WHERE a.kind='ALERT' AND a.status='OPEN' ORDER BY p.code, a.id")
      .all() as any[];
    const expected = Object.entries<any>(oracle.procedures).flatMap(([code, e]) => e.open_alerts.map((a: any) => ({ code, ...a })));
    expect(rows).toEqual(expected);
    expect(count("SELECT COUNT(*) AS n FROM alert_notifications WHERE channel='IN_APP'")).toBe(oracle.notifications.in_app);
    expect(count("SELECT COUNT(*) AS n FROM alert_notifications WHERE channel='EMAIL'")).toBe(oracle.notifications.email);
    expect(count("SELECT COUNT(*) AS n FROM outbox")).toBe(oracle.notifications.email);
    const p001 = db.prepare("SELECT recipient, subject FROM outbox WHERE subject LIKE '%P-001%'").all() as any[];
    expect(p001).toEqual([{ recipient: "struttura.si@demo.invalid", subject: "[INAPP DEMO] Memoria in scadenza tra 5 giorni — P-001" }]);
  });

  test("anomalie attese", () => {
    const rows = db.prepare("SELECT p.code, a.rule, a.target, a.severity FROM alerts a JOIN procedures p ON p.id = a.procedure_id WHERE a.kind='ANOMALY' AND a.status='OPEN' ORDER BY p.code").all();
    const expected = Object.entries<any>(oracle.procedures).flatMap(([code, e]) => e.anomalies.map((a: any) => ({ code, ...a })));
    expect(rows).toEqual(expected);
  });

  test("[DEC-041] simulazioni automatiche DRAFT con alternativa più rapida", () => {
    const sims = db.prepare("SELECT p.code, s.candidate_date, s.status, json_extract(s.result_json,'$.amount_shifted') AS shifted FROM simulations s JOIN procedures p ON p.id = s.procedure_id ORDER BY p.code").all();
    expect(sims).toEqual([
      { code: "P-002", candidate_date: "2026-10-12", status: "DRAFT", shifted: "0.00" },
      { code: "P-005", candidate_date: "2026-10-12", status: "DRAFT", shifted: "0.00" },
      { code: "P-008", candidate_date: "2026-10-12", status: "DRAFT", shifted: "0.00" },
    ]);
  });

  test("[US-061] P-011 annullata: rilascio di 75.000 generato dal sistema", () => {
    const r = db.prepare("SELECT m.amount_cents FROM financial_movements m JOIN procedures p ON p.id=m.procedure_id WHERE p.code='P-011' AND m.type='RELEASE'").all() as any[];
    expect(r.map((x) => centsToString(x.amount_cents))).toEqual(["75000.00"]);
  });

  test("[T-002][NFR-004] reimport e run_checks idempotenti", () => {
    const before = {
      p: count("SELECT COUNT(*) AS n FROM procedures"),
      a: count("SELECT COUNT(*) AS n FROM alerts"),
      n: count("SELECT COUNT(*) AS n FROM alert_notifications"),
      o: count("SELECT COUNT(*) AS n FROM outbox"),
      s: count("SELECT COUNT(*) AS n FROM simulations"),
    };
    const rep = seedDataset(db, readDataset(path.join(root, "seed/scenarios/procedures.json")), clock, null);
    expect(rep.inserted).toBe(0);
    expect(rep.skipped).toBe(12);
    runChecks(db, clock);
    runChecks(db, clock);
    expect({
      p: count("SELECT COUNT(*) AS n FROM procedures"),
      a: count("SELECT COUNT(*) AS n FROM alerts"),
      n: count("SELECT COUNT(*) AS n FROM alert_notifications"),
      o: count("SELECT COUNT(*) AS n FROM outbox"),
      s: count("SELECT COUNT(*) AS n FROM simulations"),
    }).toEqual(before);
  });

  test("[BR-019][NFR-008] audit e movimenti append-only, catena integra, trigger presenti", () => {
    expect(missingTriggers(db)).toEqual([]);
    expect(() => db.prepare("UPDATE audit_events SET actor = 'x'").run()).toThrow(/AUDIT_APPEND_ONLY/);
    expect(() => db.prepare("DELETE FROM audit_events").run()).toThrow(/AUDIT_APPEND_ONLY/);
    expect(() => db.prepare("DELETE FROM financial_movements").run()).toThrow(/MOVEMENT_APPEND_ONLY/);
    expect(() => db.prepare("UPDATE procedure_versions SET programmed_cents = 1").run()).toThrow(/VERSION_IMMUTABLE/);
    expect(verifyAuditChain(db).ok).toBe(true);
  });

  test("[NFR-005] nessun importo REAL nello schema e CHECK sugli importi", () => {
    const cols = db.prepare("SELECT m.name AS t, p.name AS c, p.type FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table'").all() as any[];
    expect(cols.filter((c) => /REAL|NUMERIC|DECIMAL|FLOAT/i.test(c.type))).toEqual([]);
    expect(() => db.prepare("UPDATE procedures SET programmed_cents = 1.5 WHERE code='P-001'").run()).toThrow(/CHECK/);
  });
});
