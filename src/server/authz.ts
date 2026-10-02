import { DomainError } from "@/application/errors";
import type { Role } from "@/domain/model";
import type { Db } from "@/infrastructure/db/connection";
import type { Actor } from "./auth";

/** Matrice dei permessi (guida §7.3). L'ambito object-level si verifica con canSeeProcedure. */
export type Action =
  | "procedure.view"
  | "procedure.draft"
  | "milestone.update"
  | "simulation.create"
  | "simulation.decide"
  | "simulation.override"
  | "contract.edit"
  | "sal.plan"
  | "sal.submit"
  | "sal.verify"
  | "sal.accept"
  | "finance.record"
  | "budget.edit"
  | "alert.handle"
  | "alert.suspend"
  | "validation.decide"
  | "documents.import"
  | "export"
  | "audit.read"
  | "admin"
  | "assistant";

const M: Record<Action, Role[]> = {
  "procedure.view": ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "SUPPLIER", "EXECUTIVE", "VALIDATOR", "ADMIN"],
  "procedure.draft": ["STRUCTURE_USER", "ADMIN"],
  "milestone.update": ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "SUPPLIER", "VALIDATOR"],
  "simulation.create": ["PROCUREMENT_OFFICER", "FINANCE_OFFICER"],
  "simulation.decide": ["EXECUTIVE", "VALIDATOR"],
  "simulation.override": ["EXECUTIVE"],
  "contract.edit": ["PROCUREMENT_OFFICER"],
  "sal.plan": ["STRUCTURE_USER", "PROCUREMENT_OFFICER"],
  "sal.submit": ["STRUCTURE_USER", "SUPPLIER"],
  "sal.verify": ["STRUCTURE_USER", "VALIDATOR"],
  "sal.accept": ["PROCUREMENT_OFFICER", "VALIDATOR"],
  "finance.record": ["FINANCE_OFFICER"],
  "budget.edit": ["FINANCE_OFFICER"],
  "alert.handle": ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "VALIDATOR"],
  "alert.suspend": ["PROCUREMENT_OFFICER", "EXECUTIVE"],
  "validation.decide": ["VALIDATOR"],
  "documents.import": ["VALIDATOR", "ADMIN"],
  export: ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "EXECUTIVE", "VALIDATOR", "ADMIN"],
  "audit.read": ["EXECUTIVE", "VALIDATOR", "ADMIN"],
  admin: ["ADMIN"],
  assistant: ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "EXECUTIVE", "VALIDATOR", "ADMIN"],
};

export function can(actor: Actor, action: Action): boolean {
  return M[action].includes(actor.role);
}

export function require(actor: Actor | null, action: Action): Actor {
  if (!actor) throw new DomainError("UNAUTHENTICATED", "Accesso richiesto", 401);
  if (!can(actor, action)) throw new DomainError("FORBIDDEN", "Operazione non consentita per il ruolo attivo", 403);
  return actor;
}

/** Filtro SQL di visibilità sulle procedure (alias "p"). */
export function scopeSql(actor: Actor): { sql: string; params: unknown[] } {
  if (actor.role === "SUPPLIER") {
    // Contraente oppure operatore individuato prima del contratto (DEC-107)
    return { sql: "(p.operator_code = ? OR p.id IN (SELECT procedure_id FROM contracts WHERE supplier_code = ?))", params: [actor.supplierCode ?? "__none__", actor.supplierCode ?? "__none__"] };
  }
  if (actor.role === "STRUCTURE_USER" && actor.structureScope !== "*") return { sql: "p.structure_code = ?", params: [actor.structureScope] };
  return { sql: "1 = 1", params: [] };
}

/** Controllo object-level: 404 non rivelerebbe l'esistenza, ma la guida chiede 403 senza dati (T-017). */
export function requireProcedure(db: Db, actor: Actor, code: string): { id: number; code: string; structure_code: string } {
  const p = db.prepare("SELECT id, code, structure_code FROM procedures WHERE code = ?").get(code) as { id: number; code: string; structure_code: string } | undefined;
  if (!p) throw new DomainError("NOT_FOUND", "Procedura non trovata", 404);
  const s = scopeSql(actor);
  const ok = db.prepare(`SELECT 1 FROM procedures p WHERE p.id = ? AND ${s.sql}`).get(p.id, ...s.params);
  if (!ok) throw new DomainError("FORBIDDEN", "Procedura fuori dal tuo ambito", 403);
  return p;
}

export const OWNER_ROLE: Record<string, string[]> = {
  STRUCTURE: ["STRUCTURE_USER"],
  PROCUREMENT: ["PROCUREMENT_OFFICER"],
  FINANCE: ["FINANCE_OFFICER"],
  SUPPLIER: ["SUPPLIER"],
};

/** Chi può completare il passo: owner del passo (il fornitore solo se è l'operatore della pratica) o validatore. */
export function canCompleteStep(actor: Actor, owner: string, operatorCode: string | null): boolean {
  if (owner === "SUPPLIER") return actor.role === "SUPPLIER" && !!operatorCode && actor.supplierCode === operatorCode;
  return actor.role === "VALIDATOR" || !!OWNER_ROLE[owner]?.includes(actor.role);
}

export const ROLE_LABEL: Record<Role, string> = {
  STRUCTURE_USER: "Struttura richiedente",
  PROCUREMENT_OFFICER: "Ufficio Gare",
  FINANCE_OFFICER: "Amministrazione",
  SUPPLIER: "Fornitore",
  EXECUTIVE: "Direttore Generale",
  VALIDATOR: "Validatore",
  ADMIN: "Amministratore",
};
