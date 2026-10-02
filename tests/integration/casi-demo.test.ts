import { beforeAll, describe, expect, test } from "vitest";
import { bootstrap } from "@/application/bootstrap";
import { openDb, setDbForTests, type Db } from "@/infrastructure/db/connection";
import { login } from "@/server/auth";
import { listProcedures, procedureDetail, validationQueue } from "@/server/queries";
import { clock } from "../helpers/db";

let db: Db;
const actor = (l: string) => login(db, l, "Demo2026!").actor;

beforeAll(async () => {
  db = openDb(":memory:");
  await bootstrap(db, clock, { dataset: "inapp" });
  setDbForTests(db);
}, 120000);

describe("[DEC-105] casi dimostrativi: ogni attore della guida ha un'attività", () => {
  test("i casi sono caricati accanto al portafoglio reale e marcati", () => {
    const rows = db.prepare("SELECT code, dataset FROM procedures WHERE dataset = 'casi-demo' ORDER BY code").all() as { code: string }[];
    expect(rows.map((r) => r.code)).toEqual(["BZ-001", "CD-01", "CD-02", "CD-03", "CD-04", "CD-05", "CD-06"]);
    expect((db.prepare("SELECT COUNT(*) n FROM procedures WHERE dataset = 'inapp'").get() as { n: number }).n).toBe(82);
  });

  test("Struttura: vede solo la propria struttura, una bozza da consegnare e un SAL da verificare", () => {
    const r = listProcedures(db, actor("struttura.si"), {});
    expect(r.items.map((p) => p.code).sort()).toEqual(["BZ-001", "CD-01", "CD-02"]);
    const bz = procedureDetail(db, actor("struttura.si"), "BZ-001");
    expect(bz.evaluation.status).toBe("DRAFT");
    const cd2 = procedureDetail(db, actor("struttura.si"), "CD-02");
    expect(cd2.sals.find((s) => s.seq === 2)?.state).toBe("SUBMITTED");
  });

  test("Fornitore: vede i propri contratti e ha un SAL da presentare", () => {
    const r = listProcedures(db, actor("fornitore.alfa"), {});
    expect(r.items.map((p) => p.code).sort()).toEqual(["CD-02", "CD-03"]);
    const cd3 = procedureDetail(db, actor("fornitore.alfa"), "CD-03");
    expect(cd3.supplierView).toBe(true);
    expect(cd3.sals.map((s) => s.state)).toEqual(["ACCEPTED", "PLANNED"]);
  });

  test("Amministrazione: un SAL da fatturare e un pagamento in scadenza", () => {
    const a = actor("amministrazione");
    expect(procedureDetail(db, a, "CD-03").sals[0]!.state).toBe("ACCEPTED");
    const cd4 = procedureDetail(db, a, "CD-04");
    expect(cd4.sals[0]!.state).toBe("LIQUIDATED");
    expect(cd4.sals[0]!.payable).toBe("48800.00");
  });

  test("Ufficio Gare e Direttore: simulazione con criticità bloccante in attesa di override", () => {
    const d = procedureDetail(db, actor("dirigente"), "CD-05");
    expect(d.evaluation.rescheduleRequired).toBe(true);
    const s = (d.simulations as any[]).find((x) => x.created_by === "gare");
    expect(s.status).toBe("SUBMITTED");
    expect(s.blocking).toBe(1);
    expect(s.result.criticalities.some((c: any) => c.code === "BUDGET_OVERFLOW")).toBe(true);
  });

  test("Validatore: simulazione senza criticità da approvare e proposte di estrazione in coda", () => {
    const d = procedureDetail(db, actor("validatore"), "CD-06");
    const s = (d.simulations as any[]).find((x) => x.created_by === "gare");
    expect(s.status).toBe("SUBMITTED");
    expect(s.blocking).toBe(0);
    const q = validationQueue(db, actor("validatore")) as any;
    const items = (q.items ?? q) as any[];
    expect(items.some((v) => v.kind === "CONFLICT" && v.field === "contract.gross")).toBe(true);
    expect(items.filter((v) => v.kind === "ASSOCIATION").length).toBe(5);
  });

  test("i documenti dei casi sono apribili", () => {
    const docs = db.prepare("SELECT file_path, size_bytes FROM documents WHERE file_path LIKE 'casi:%'").all() as { size_bytes: number }[];
    expect(docs.length).toBe(8);
    expect(docs.every((d) => d.size_bytes > 0)).toBe(true);
  });
});

describe("[DEC-105] assistente sul dataset reale", () => {
  test("gli esempi citano procedure esistenti e ottengono risposta", async () => {
    const { ask, examplesFor } = await import("@/server/assistant");
    const a = actor("dirigente");
    for (const q of examplesFor(db)) expect(ask(db, a, q).intent, q).not.toBe("UNSUPPORTED");
  });
});
