import { describe, expect, test } from "vitest";
import type { Role } from "@/domain/model";
import type { Actor } from "@/server/auth";
import { can, type Action } from "@/server/authz";

const actorOf = (role: Role): Actor => ({
  userId: 1,
  login: "test",
  name: "Test",
  role,
  structureScope: "*",
  supplierCode: null,
  impersonatedBy: null,
  sessionHash: "x",
});

/** Azioni che modificano lo stato: il Direttore Generale non ne ha nessuna (DEC-122). */
const WRITE_ACTIONS: Action[] = [
  "procedure.draft",
  "milestone.update",
  "simulation.create",
  "simulation.decide",
  "contract.edit",
  "sal.plan",
  "sal.submit",
  "sal.verify",
  "sal.accept",
  "finance.record",
  "budget.edit",
  "alert.handle",
  "alert.suspend",
  "document.classify",
  "documents.import",
  "admin",
];

describe("[DEC-122] il Direttore Generale è un ruolo di sola consultazione", () => {
  const dg = actorOf("EXECUTIVE");

  test("non può compiere nessuna azione che modifica lo stato, né decidere", () => {
    for (const action of WRITE_ACTIONS) {
      expect(can(dg, action), `EXECUTIVE non deve poter fare ${action}`).toBe(false);
    }
  });

  test("conserva tutta la consultazione: portafoglio, audit, esportazioni e assistente", () => {
    expect(can(dg, "procedure.view")).toBe(true);
    expect(can(dg, "audit.read")).toBe(true);
    expect(can(dg, "export")).toBe(true);
    expect(can(dg, "assistant")).toBe(true);
  });

  test("la sospensione dell'escalation resta all'Ufficio Gare", () => {
    expect(can(actorOf("PROCUREMENT_OFFICER"), "alert.suspend")).toBe(true);
    expect(can(dg, "alert.suspend")).toBe(false);
  });
});
