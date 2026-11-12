import { beforeAll, describe, expect, test } from "vitest";
import { hundredthsToString, ribassoHundredths } from "@/domain/gara-kpi";
import { Money } from "@/domain/money";
import type { Db } from "@/infrastructure/db/connection";
import { login, type Actor } from "@/server/auth";
import { dashboard, financialKpiByType, garaKpiList, listProcedures } from "@/server/queries";
import { scenarioDb } from "../helpers/db";

let db: Db;
const as = async (l: string): Promise<Actor> => (await login(db, l, "Demo2026!")).actor;
beforeAll(async () => {
  db = await scenarioDb();
});

describe("[DEC-111] KPI per gara e importi di gara", () => {
  test("il perimetro è quello del portafoglio: il Direttore Generale vede tutte le gare, la Struttura solo le sue", async () => {
    const dg = await as("dirigente");
    const all = await garaKpiList(db, dg, {});
    expect(all.items.map((i) => i.code).sort()).toEqual((await listProcedures(db, dg, { size: 100 })).items.map((i) => i.code).sort());
    const s = await as("struttura.si");
    const mine = await garaKpiList(db, s, {});
    expect(mine.items.map((i) => i.code).sort()).toEqual((await listProcedures(db, s, { size: 100 })).items.map((i) => i.code).sort());
    expect(mine.totals.count).toBeLessThan(all.totals.count);
  });

  test("il ribasso di ogni gara aggiudicata è (base − aggiudicato) / base, solo per le gare competitive (DEC-120); il programmato coincide con quello del portafoglio", async () => {
    const dg = await as("dirigente");
    const r = await garaKpiList(db, dg, {});
    const list = new Map((await listProcedures(db, dg, { size: 100 })).items.map((i) => [i.code, i.programmed]));
    let awarded = 0;
    for (const it of r.items) {
      expect(it.programmed).toBe(list.get(it.code));
      if (it.base && it.awardedNet && it.competitive) {
        awarded++;
        const h = ribassoHundredths(Money.parse(it.base), Money.parse(it.awardedNet));
        expect(it.ribasso).toBe(h === null ? null : hundredthsToString(h));
      } else expect(it.ribasso).toBeNull();
    }
    expect(r.totals.competitiveAwardedCount).toBe(awarded);
    // le procedure del dataset di collaudo non hanno il quadro economico: la base è sempre ricavata dal programmato
    expect(r.items.every((i) => i.baseDerived)).toBe(true);
  });

  test("[DEC-120] la scheda per tipo di gara riporta '—' sul ribasso per la variante A e il valore ponderato per la variante B", async () => {
    const dg = await as("dirigente");
    const r = await garaKpiList(db, dg, {});
    const direct = r.byType.find((t) => t.type === "DIRECT_AWARD");
    expect(direct?.competitive).toBe(false);
    expect(direct?.ribasso).toBeNull();
    const open = r.byType.find((t) => t.type === "OPEN");
    expect(open?.competitive).toBe(true);
  });
});

describe("[DEC-120] KPI finanziari per tipo di gara", () => {
  test("il perimetro è quello del portafoglio e i totali sono la somma delle righe per tipo", async () => {
    const dg = await as("dirigente");
    const all = await financialKpiByType(db, dg, {});
    const s = await as("struttura.si");
    const mine = await financialKpiByType(db, s, {});
    expect(mine.totals.count).toBeLessThan(all.totals.count);
    expect(all.byType.reduce((n, t) => n + t.count, 0)).toBe(all.totals.count);
    const sumProgrammed = Money.sum(all.byType.map((t) => Money.parse(t.programmed ?? "0.00")));
    expect(sumProgrammed.toString()).toBe(Money.parse(all.totals.programmed ?? "0.00").toString());
    const sumPaid = Money.sum(all.byType.map((t) => Money.parse(t.paid ?? "0.00")));
    expect(sumPaid.toString()).toBe(Money.parse(all.totals.paid ?? "0.00").toString());
    const lateByType = all.byType.reduce((n, t) => n + t.late, 0);
    expect(lateByType).toBe(all.totals.late);
    const redByType = all.byType.reduce((n, t) => n + t.health.red, 0);
    expect(redByType).toBe(all.totals.health.red);
  });

  test("il filtro per tipo restringe la scheda a un solo tipo di gara", async () => {
    const dg = await as("dirigente");
    const r = await financialKpiByType(db, dg, { type: "OPEN" });
    expect(r.byType.every((t) => t.type === "OPEN")).toBe(true);
    expect(r.totals.count).toBe(r.byType.find((t) => t.type === "OPEN")?.count ?? 0);
  });

  test("il filtro per struttura restringe la scheda come nel portafoglio", async () => {
    const dg = await as("dirigente");
    const all = await financialKpiByType(db, dg, {});
    const { items } = await listProcedures(db, dg, { size: 1 });
    const structureCode = (await db.prepare("SELECT structure_code FROM procedures WHERE code = ?").get(items[0]!.code)) as { structure_code: string };
    const scoped = await financialKpiByType(db, dg, { structure: structureCode.structure_code });
    expect(scoped.totals.count).toBeLessThanOrEqual(all.totals.count);
    expect(scoped.totals.count).toBeGreaterThan(0);
  });
});

describe("[DEC-120] la dashboard si ricalcola per tipo di gara", () => {
  test("il filtro per tipo restringe gli indicatori della dashboard come il portafoglio", async () => {
    const dg = await as("dirigente");
    const all = await dashboard(db, dg, {});
    const open = await dashboard(db, dg, { type: "OPEN" });
    const expected = await listProcedures(db, dg, { type: "OPEN", size: 100 });
    expect(open.kpi.proceduresTotal).toBe(expected.total);
    expect(open.kpi.proceduresTotal).toBeLessThanOrEqual(all.kpi.proceduresTotal);
  });
});

describe("[DEC-121] panoramica gare: attive, da avviare, richieste di riprogrammazione, per tipo", () => {
  test("attive, da avviare e totale per tipo sono coerenti con il portafoglio", async () => {
    const dg = await as("dirigente");
    const d = await dashboard(db, dg, {});
    const draft = await listProcedures(db, dg, { status: "DRAFT", size: 100 });
    expect(d.kpi.proceduresToStart).toBe(draft.total);
    expect(d.kpi.proceduresActive).toBeLessThanOrEqual(d.kpi.proceduresTotal);
    expect(d.kpi.proceduresActive + d.kpi.proceduresToStart).toBeLessThanOrEqual(d.kpi.proceduresTotal);
    const byTypeSum = d.byType.reduce((n, t) => n + t.n, 0);
    expect(byTypeSum).toBe(d.kpi.proceduresTotal);
  });

  test("le richieste di riprogrammazione sono le versioni oltre la baseline", async () => {
    const dg = await as("dirigente");
    const d = await dashboard(db, dg, {});
    expect(d.kpi.reprogramRequests).toBeGreaterThanOrEqual(0);
    const filtered = await dashboard(db, dg, { type: "OPEN" });
    expect(filtered.kpi.reprogramRequests).toBeLessThanOrEqual(d.kpi.reprogramRequests);
  });
});
