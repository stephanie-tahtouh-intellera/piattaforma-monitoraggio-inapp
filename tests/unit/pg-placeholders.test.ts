import { describe, expect, it } from "vitest";
import { toPgSql } from "@/infrastructure/db/connection";

/**
 * I segnaposto `?` diventano `$n` solo fuori dalle stringhe letterali. Un apostrofo
 * dentro un commento SQL faceva credere al convertitore di essere dentro una stringa,
 * e i `?` che seguivano restavano `?`: la dashboard filtrata rispondeva 500 con un
 * errore di sintassi di Postgres a righe di distanza dalla causa (DEC-136).
 */
describe("toPgSql", () => {
  it("numera i segnaposto nell'ordine", () => {
    const { text, values } = toPgSql("SELECT 1 FROM t WHERE a = ? AND b = ?", ["x", "y"]);
    expect(text).toBe("SELECT 1 FROM t WHERE a = $1 AND b = $2");
    expect(values).toEqual(["x", "y"]);
  });

  it("non tocca i `?` dentro una stringa letterale", () => {
    const { text, values } = toPgSql("SELECT '?' AS q FROM t WHERE a = ?", ["x"]);
    expect(text).toBe("SELECT '?' AS q FROM t WHERE a = $1");
    expect(values).toEqual(["x"]);
  });

  it("un apostrofo in un commento di riga non apre una stringa", () => {
    const sql = "SELECT 1\n-- l'importo viaggia in centesimi\nFROM t WHERE a = ? GROUP BY b";
    const { text, values } = toPgSql(sql, ["x"]);
    expect(text).toContain("WHERE a = $1 GROUP BY b");
    expect(values).toEqual(["x"]);
  });

  it("un apostrofo in un commento a blocco non apre una stringa", () => {
    const { text } = toPgSql("SELECT 1 /* l'importo */ FROM t WHERE a = ?", ["x"]);
    expect(text).toBe("SELECT 1 /* l'importo */ FROM t WHERE a = $1");
  });

  it("i parametri con nome diventano $n", () => {
    const { text, values } = toPgSql("SELECT 1 FROM t WHERE a = @uno AND b = @due", [{ uno: 1, due: 2 }]);
    expect(text).toBe("SELECT 1 FROM t WHERE a = $1 AND b = $2");
    expect(values).toEqual([1, 2]);
  });
});
