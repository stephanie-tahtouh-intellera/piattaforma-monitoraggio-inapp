import { describe, expect, test } from "vitest";
import { projectFromOperation } from "@/domain/project";

describe("[DEC-111] progetto della gara", () => {
  test("il progetto è l'Operazione / Attività del workbook", () => {
    expect(projectFromOperation("Operazione 1 – Attività 5")).toEqual({ code: "OP01-A5", name: "Operazione 1 – Attività 5" });
    expect(projectFromOperation("Operazione 12 – Attività 3.2")).toEqual({ code: "OP12-A3.2", name: "Operazione 12 – Attività 3.2" });
    expect(projectFromOperation("  Operazione 4 - Attività 18 ")?.code).toBe("OP04-A18");
  });

  test("senza operazione riconoscibile non c'è progetto", () => {
    expect(projectFromOperation(null)).toBeNull();
    expect(projectFromOperation(undefined)).toBeNull();
    expect(projectFromOperation("")).toBeNull();
    expect(projectFromOperation("Sistemi informativi")).toBeNull();
  });
});
