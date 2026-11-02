import { beforeAll, describe, expect, test } from "vitest";
import { hundredthsToString, ribassoHundredths } from "@/domain/gara-kpi";
import { Money } from "@/domain/money";
import type { Db } from "@/infrastructure/db/connection";
import { login, type Actor } from "@/server/auth";
import { garaKpiList, listProcedures } from "@/server/queries";
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

  test("il ribasso di ogni gara aggiudicata è (base − aggiudicato) / base, e il programmato coincide con quello del portafoglio", async () => {
    const dg = await as("dirigente");
    const r = await garaKpiList(db, dg, {});
    const list = new Map((await listProcedures(db, dg, { size: 100 })).items.map((i) => [i.code, i.programmed]));
    let awarded = 0;
    for (const it of r.items) {
      expect(it.programmed).toBe(list.get(it.code));
      if (it.base && it.awardedNet) {
        awarded++;
        const h = ribassoHundredths(Money.parse(it.base), Money.parse(it.awardedNet));
        expect(it.ribasso).toBe(h === null ? null : hundredthsToString(h));
      } else expect(it.ribasso).toBeNull();
    }
    expect(r.totals.awardedCount).toBe(awarded);
    // le procedure del dataset di collaudo non hanno il quadro economico: la base è sempre ricavata dal programmato
    expect(r.items.every((i) => i.baseDerived)).toBe(true);
  });
});
