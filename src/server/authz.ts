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
  | "contract.edit"
  | "sal.plan"
  | "sal.submit"
  | "sal.verify"
  | "sal.accept"
  | "finance.record"
  | "budget.edit"
  | "alert.handle"
  | "alert.suspend"
  | "document.classify"
  | "documents.import"
  | "export"
  | "audit.read"
  | "admin"
  | "assistant";

const M: Record<Action, Role[]> = {
  "procedure.view": ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "SUPPLIER", "EXECUTIVE", "ADMIN"],
  "procedure.draft": ["STRUCTURE_USER", "ADMIN"],
  "milestone.update": ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "SUPPLIER", "ADMIN"],
  "simulation.create": ["PROCUREMENT_OFFICER", "FINANCE_OFFICER"],
  "simulation.decide": ["PROCUREMENT_OFFICER"],
  "contract.edit": ["PROCUREMENT_OFFICER"],
  "sal.plan": ["STRUCTURE_USER", "PROCUREMENT_OFFICER"],
  "sal.submit": ["STRUCTURE_USER", "SUPPLIER"],
  "sal.verify": ["STRUCTURE_USER"],
  "sal.accept": ["PROCUREMENT_OFFICER"],
  "finance.record": ["FINANCE_OFFICER"],
  "budget.edit": ["FINANCE_OFFICER"],
  "alert.handle": ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER"],
  "alert.suspend": ["PROCUREMENT_OFFICER", "EXECUTIVE"],
  "document.classify": ["PROCUREMENT_OFFICER", "ADMIN"],
  "documents.import": ["PROCUREMENT_OFFICER", "ADMIN"],
  export: ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "EXECUTIVE", "ADMIN"],
  "audit.read": ["EXECUTIVE", "ADMIN"],
  admin: ["ADMIN"],
  assistant: ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "EXECUTIVE", "ADMIN"],
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
export async function requireProcedure(db: Db, actor: Actor, code: string): Promise<{ id: number; code: string; structure_code: string }> {
  const p = (await db.prepare("SELECT id, code, structure_code FROM procedures WHERE code = ?").get(code)) as
    | { id: number; code: string; structure_code: string }
    | undefined;
  if (!p) throw new DomainError("NOT_FOUND", "Procedura non trovata", 404);
  const s = scopeSql(actor);
  const ok = await db.prepare(`SELECT 1 FROM procedures p WHERE p.id = ? AND ${s.sql}`).get(p.id, ...s.params);
  if (!ok) throw new DomainError("FORBIDDEN", "Procedura fuori dal tuo ambito", 403);
  return p;
}

export const OWNER_ROLE: Record<string, string[]> = {
  STRUCTURE: ["STRUCTURE_USER"],
  PROCUREMENT: ["PROCUREMENT_OFFICER"],
  FINANCE: ["FINANCE_OFFICER"],
  SUPPLIER: ["SUPPLIER"],
};

/** Chi può completare il passo: owner del passo (il fornitore solo se è l'operatore della pratica) o amministratore (passi in demo per conto dell'owner). */
export function canCompleteStep(actor: Actor, owner: string, operatorCode: string | null): boolean {
  if (owner === "SUPPLIER") return actor.role === "SUPPLIER" && !!operatorCode && actor.supplierCode === operatorCode;
  return actor.role === "ADMIN" || !!OWNER_ROLE[owner]?.includes(actor.role);
}

export const ROLE_LABEL: Record<Role, string> = {
  STRUCTURE_USER: "Struttura richiedente",
  PROCUREMENT_OFFICER: "Ufficio Gare",
  FINANCE_OFFICER: "Amministrazione",
  SUPPLIER: "Fornitore",
  EXECUTIVE: "Direttore Generale",
  ADMIN: "Amministratore",
};
