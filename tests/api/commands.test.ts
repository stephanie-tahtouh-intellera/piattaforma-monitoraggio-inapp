import { beforeEach, describe, expect, test } from "vitest";
import { centsToString } from "@/contracts/format";
import type { Db } from "@/infrastructure/db/connection";
import { login, type Actor } from "@/server/auth";
import { canCompleteStep, requireProcedure } from "@/server/authz";
import {
  approveSimulation,
  cancelProcedure,
  createSimulation,
  classifyDocument,
  handleAlert,
  registerPayment,
  rejectSimulation,
  submitSimulation,
} from "@/server/commands";
import { listProcedures, procedureDetail, dashboard } from "@/server/queries";
import { scenarioDb } from "../helpers/db";

let db: Db;
const as = (l: string): Actor => login(db, l, "Demo2026!").actor;
beforeEach(async () => {
  db = await scenarioDb();
});

describe("[US-002][US-003] autenticazione e permessi", () => {
  test("credenziali errate → 401 e audit LOGIN_FAILED", () => {
    expect(() => login(db, "gare", "sbagliata")).toThrow(/Credenziali/);
    expect((db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='LOGIN_FAILED'").get() as any).n).toBe(1);
  });
  test("[T-017] il fornitore vede solo il proprio contratto e riceve 403 altrove", () => {
    const f = as("fornitore.alfa");
    expect(listProcedures(db, f, {}).items.map((i) => i.code)).toEqual(["P-004"]);
    expect(() => requireProcedure(db, f, "P-010")).toThrow(/ambito/);
    expect(() => procedureDetail(db, f, "P-010")).toThrow(/ambito/);
    const d = procedureDetail(db, f, "P-004");
    expect(d.movements).toEqual([]);
    expect(d.alerts).toEqual([]);
  });
  test("la Struttura vede solo la propria struttura e non registra pagamenti", () => {
    const s = as("struttura.si");
    expect(listProcedures(db, s, {}).items.map((i) => i.code).sort()).toEqual(["P-001", "P-004", "P-005"]);
    expect(() => registerPayment(db, s, "P-004", 2, "10.00", "2026-10-01", null)).toThrow(/non consentita/);
  });
  test("[T-003] filtro ROSSO + annualità 2027", () => {
    const r = listProcedures(db, as("dirigente"), { health: "RED", year: "2027", sort: "code" });
    expect(r.items.map((i) => i.code)).toEqual(["P-002", "P-005", "P-008", "P-010"]);
  });
  test("[T-025] KPI dashboard = oracle", () => {
    const k = dashboard(db, as("dirigente")).kpi;
    expect(k).toMatchObject({ proceduresTotal: 12, proceduresLate: 4, toReschedule: 3, criticalAlerts: 4, programmed: "3639050.00", contracted: "792650.00", paid: "87250.00" });
    expect(k.atRisk.total).toBe("612000.00");
  });
});

describe("[US-064] pagamenti", () => {
  test("[T-024] pagamento oltre il liquidato rifiutato con dettagli", () => {
    const fin = as("amministrazione");
    try {
      registerPayment(db, fin, "P-009", 1, "305000.01", "2026-10-01", null);
      throw new Error("non doveva passare");
    } catch (e: any) {
      expect(e.code).toBe("FINANCIAL_INVARIANT_VIOLATION");
      expect(e.details).toEqual({ available: "305000.00", requested: "305000.01" });
    }
  });
  test("[T-012] pagamento parziale riduce il residuo e non chiude il SAL", () => {
    const fin = as("amministrazione");
    registerPayment(db, fin, "P-009", 1, "100000.00", "2026-10-01", "mandato DEMO 1");
    const d = procedureDetail(db, fin, "P-009");
    expect(d.evaluation.residual).toBe("205000.00");
    expect(d.sals[0]!.state).toBe("PARTIALLY_PAID");
    expect(d.sals[0]!.payable).toBe("205000.00");
  });
  test("[T-011] P-004: piano 20/50/30, pagato 47.600, residuo 190.400", () => {
    const d = procedureDetail(db, as("gare"), "P-004");
    expect(d.sals.map((s) => [s.pct, s.amount])).toEqual([["20.00", "47600.00"], ["50.00", "119000.00"], ["30.00", "71400.00"]]);
    expect(d.evaluation.paid).toBe("47600.00");
    expect(d.evaluation.residual).toBe("190400.00");
  });
});

describe("[US-054] approvazione riprogrammazione", () => {
  test("[T-006][T-007] simulazione P-002 salvata senza modificare i dati correnti", () => {
    const before = procedureDetail(db, as("gare"), "P-002");
    const r = createSimulation(db, as("gare"), "P-002", { source: "MEMORY_SUBMISSION", candidateDate: "2026-11-16", kind: "MANUAL", cause: "MEMORY_OVERDUE" });
    expect(r.amount_shifted).toBe("150000.00");
    expect(r.criticalities).toEqual([expect.objectContaining({ code: "BUDGET_OVERFLOW", year: 2027, amount: "80000.00" })]);
    const after = procedureDetail(db, as("gare"), "P-002");
    expect(after.timeline).toEqual(before.timeline);
    expect(after.evaluation.annualNeed).toEqual(before.evaluation.annualNeed);
  });

  test("[T-009] approvazione: nuova versione, baseline intatta, flag chiuso, audit", () => {
    const sim = db.prepare("SELECT code FROM simulations WHERE created_by='system' AND procedure_id=(SELECT id FROM procedures WHERE code='P-002')").get() as { code: string };
    expect(() => approveSimulation(db, as("dirigente"), sim.code, "")).toThrow(/Motivazione/);
    approveSimulation(db, as("dirigente"), sim.code, "Memoria attesa entro il 12/10");
    const d = procedureDetail(db, as("dirigente"), "P-002");
    expect(d.versions.map((v) => v.version_no)).toEqual([1, 2]);
    const mem = d.timeline.find((t) => t.code === "MEMORY_SUBMISSION")!;
    expect(mem.baseline).toBe("2026-09-25");
    expect(mem.forecast).toBe("2026-10-12");
    expect(d.evaluation.rescheduleRequired).toBe(false);
    // memoria al 12/10 = +11 gg: fuori dalla finestra di attenzione (10 gg) → GREEN
    expect(d.evaluation.health).toBe("GREEN");
    const old = db.prepare("SELECT status FROM alerts a JOIN procedures p ON p.id=a.procedure_id WHERE p.code='P-002' AND a.rule='MILESTONE_DEADLINE' AND a.due_date='2026-09-25'").get() as any;
    expect(old.status).toBe("AUTO_CLOSED");
    expect((db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='SIMULATION_APPROVE'").get() as any).n).toBe(1);
  });

  test("[DEC-042] quattro occhi e override delle criticità bloccanti", () => {
    const gare = as("gare");
    const r = createSimulation(db, gare, "P-002", { source: "MEMORY_SUBMISSION", candidateDate: "2026-11-16", kind: "MANUAL", cause: "MEMORY_OVERDUE" });
    submitSimulation(db, gare, r.simulation_id);
    expect(() => approveSimulation(db, as("amministrazione"), r.simulation_id, "ok", true)).toThrow(/non consentita/);
    expect(() => approveSimulation(db, as("dirigente"), r.simulation_id, "ok")).toThrow(/override/);
    approveSimulation(db, as("dirigente"), r.simulation_id, "Accettato overflow con variazione di bilancio", true);
    const d = procedureDetail(db, as("dirigente"), "P-002");
    expect(d.evaluation.annualNeed).toEqual({ "2026": "50000.00", "2027": "430000.00" });
    expect(d.evaluation.overflows).toEqual([{ year: 2027, amount: "80000.00" }]);
    expect(d.evaluation.atRisk.uncovered).toBe("80000.00");
  });

  test("[T-010] rifiuto motivato: piano invariato, proposta conservata", () => {
    const r = createSimulation(db, as("amministrazione"), "P-008", { source: "AWARD", candidateDate: "2026-11-20", kind: "MANUAL", cause: "MILESTONE_OVERDUE" });
    expect(r.criticalities[0]?.amount).toBe("100000.00");
    rejectSimulation(db, as("dirigente"), r.simulation_id, "Overflow non sostenibile");
    const s = db.prepare("SELECT status, decision_reason FROM simulations WHERE code = ?").get(r.simulation_id);
    expect(s).toEqual({ status: "REJECTED", decision_reason: "Overflow non sostenibile" });
    expect(procedureDetail(db, as("dirigente"), "P-008").versions.length).toBe(1);
  });

  test("[STALE] approvazione su versione cambiata", () => {
    const a = createSimulation(db, as("gare"), "P-005", { source: "CONTRACT_SIGNED", candidateDate: "2026-11-12", kind: "MANUAL", cause: "MILESTONE_OVERDUE" });
    const b = createSimulation(db, as("gare"), "P-005", { source: "CONTRACT_SIGNED", candidateDate: "2026-10-20", kind: "MANUAL", cause: "MILESTONE_OVERDUE" });
    approveSimulation(db, as("dirigente"), a.simulation_id, "ok");
    expect(() => approveSimulation(db, as("dirigente"), b.simulation_id, "ok")).toThrow(/stato SUPERSEDED/);
  });
});

describe("alert, validazione, annullamento", () => {
  test("[US-043] presa in carico e risoluzione con nota", () => {
    const id = (db.prepare("SELECT a.id FROM alerts a JOIN procedures p ON p.id=a.procedure_id WHERE p.code='P-001' AND a.kind='ALERT'").get() as any).id;
    const s = as("struttura.si");
    handleAlert(db, s, id, "acknowledge", null, null);
    expect(() => handleAlert(db, s, id, "resolve", "", null)).toThrow(/Nota/);
    handleAlert(db, s, id, "resolve", "Memoria in firma", null);
    expect((db.prepare("SELECT status FROM alerts WHERE id=?").get(id) as any).status).toBe("RESOLVED");
  });
  test("[T-018] correzione della classificazione di un documento: prima/dopo, autore, motivazione, ruoli (DEC-109)", () => {
    const doc = db.prepare("SELECT d.id, d.doc_type, p.code FROM documents d JOIN procedures p ON p.id = d.procedure_id WHERE d.doc_type IS NOT NULL ORDER BY d.id LIMIT 1").get() as { id: number; doc_type: string; code: string };
    const next = doc.doc_type === "ADDENDUM" ? "CONTRATTO" : "ADDENDUM";
    expect(() => classifyDocument(db, as("struttura.si"), doc.id, next, null, "x")).toThrow(/non consentita/);
    expect(() => classifyDocument(db, as("gare"), doc.id, next, null, "")).toThrow(/Motivazione/);
    expect(() => classifyDocument(db, as("gare"), doc.id, "NON_ESISTE", null, "x")).toThrow(/Tipo di documento/);
    expect(() => classifyDocument(db, as("gare"), doc.id, doc.doc_type, null, "x")).toThrow(/Nessuna modifica/);
    classifyDocument(db, as("gare"), doc.id, next, null, "L'atto è un'altra tipologia");
    const row = db.prepare("SELECT doc_type, subtype, association_method FROM documents WHERE id = ?").get(doc.id) as any;
    expect(row).toEqual({ doc_type: next, subtype: null, association_method: "MANUAL" });
    const a = db.prepare("SELECT actor, before_json, after_json, reason FROM audit_events WHERE action='DOCUMENT_CLASSIFY'").get() as any;
    expect(a.actor).toBe("gare");
    expect(JSON.parse(a.before_json)).toEqual({ docType: doc.doc_type, procedure: doc.code });
    expect(JSON.parse(a.after_json)).toEqual({ docType: next, procedure: doc.code });
    expect(a.reason).toMatch(/tipologia/);
    classifyDocument(db, as("admin"), doc.id, doc.doc_type, null, "Ripristino");
    expect((db.prepare("SELECT doc_type FROM documents WHERE id = ?").get(doc.id) as any).doc_type).toBe(doc.doc_type);
  });
  test("[DEC-109] il passo del ruolo di corsia può essere registrato dall'amministratore, non dal fornitore altrui", () => {
    expect(canCompleteStep(as("admin"), "PROCUREMENT", null)).toBe(true);
    expect(canCompleteStep(as("admin"), "SUPPLIER", null)).toBe(false);
    expect(canCompleteStep(as("struttura.si"), "PROCUREMENT", null)).toBe(false);
  });
  test("[BR-020] annullamento rilascia solo le prenotazioni non impegnate", () => {
    const r = cancelProcedure(db, as("dirigente"), "P-004", "test");
    expect(r.release).toBe("0.00");
    const s = db.prepare("SELECT s.health, s.status FROM procedure_snapshot s JOIN procedures p ON p.id=s.procedure_id WHERE p.code='P-004'").get();
    expect(s).toEqual({ health: "NEUTRAL", status: "CANCELLED" });
    expect(centsToString((db.prepare("SELECT COALESCE(SUM(amount_cents),0) s FROM financial_movements m JOIN procedures p ON p.id=m.procedure_id WHERE p.code='P-004' AND type='COMMITMENT'").get() as any).s)).toBe("238000.00");
  });
});
