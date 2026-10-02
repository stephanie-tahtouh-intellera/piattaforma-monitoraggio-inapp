import { describe, expect, test } from "vitest";
import { bootstrap } from "@/application/bootstrap";
import { parseIter } from "@/infrastructure/import/inapp-workbook";
import { openDb } from "@/infrastructure/db/connection";
import { clock } from "../helpers/db";

describe("[US-010][DEC-071] import del workbook reale INAPP", () => {
  test("parser dell'iter (Q10, Q16)", () => {
    expect(parseIter("memoria del 28/11/23\ndeterminazione di indizione n.427 del 29/12/2023\ndetermina di aggiudicazione n. 215 del 10/07/24\nContratto del 16/09/24")).toEqual({
      MEMORY: "2023-11-28", INDIZIONE: "2023-12-29", AWARD: "2024-07-10", CONTRACT: "2024-09-16",
    });
    expect(parseIter("Memoria dell'8/04/26  // Det. Indizione n 126 del 28/04/2026").INDIZIONE).toBe("2026-04-28");
  });

  test("82 procedure importate, report, documenti reali associati per CIG", async () => {
    const db = openDb(":memory:");
    await bootstrap(db, clock, { dataset: "inapp" });
    const n = (db.prepare("SELECT COUNT(*) AS n FROM procedures WHERE dataset = 'inapp'").get() as { n: number }).n;
    expect(n).toBe(82);
    const rep = JSON.parse((db.prepare("SELECT summary_json FROM import_reports").get() as { summary_json: string }).summary_json);
    expect(rep.rowsRead).toBe(82);
    expect(rep.cancelled).toBe(2);
    const docs = db.prepare("SELECT p.code, d.file_name, d.association_method FROM documents d JOIN procedures p ON p.id=d.procedure_id WHERE p.dataset = 'inapp' ORDER BY d.file_name").all() as any[];
    expect(docs.length).toBe(6);
    expect(new Set(docs.map((d) => d.code)).size).toBe(1);
    const health = db.prepare("SELECT health, COUNT(*) AS n FROM procedure_snapshot GROUP BY health").all();
    console.log("procedura del fascicolo:", docs[0].code, "health:", JSON.stringify(health));
    const snap = db.prepare("SELECT COUNT(*) AS n FROM procedure_snapshot s JOIN procedures p ON p.id = s.procedure_id WHERE p.dataset = 'inapp'").get() as { n: number };
    expect(snap.n).toBe(82);
  }, 120000);
});
