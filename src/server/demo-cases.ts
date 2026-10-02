import type { Db } from "@/infrastructure/db/connection";
import { createDraft } from "./admin-commands";
import type { Actor } from "./auth";
import { createSimulation, submitSimulation } from "./commands";

/** Attore del seed: stessi controlli RBAC degli utenti, nessuna sessione. */
function seedActor(db: Db, login: string): Actor {
  const u = db.prepare("SELECT id, login, name, role, structure_scope, supplier_code FROM users WHERE login = ?").get(login) as
    | { id: number; login: string; name: string; role: Actor["role"]; structure_scope: string; supplier_code: string | null }
    | undefined;
  if (!u) throw new Error(`Utente demo mancante: ${login}`);
  return { userId: u.id, login: u.login, name: u.name, role: u.role, structureScope: u.structure_scope, supplierCode: u.supplier_code, impersonatedBy: null, sessionHash: "seed" };
}

/**
 * Azioni iniziali dei casi dimostrativi (DEC-105), eseguite con i comandi applicativi
 * così che stato, versioni e audit siano identici a quelli prodotti dalla UI:
 * - bozza della Struttura Sistemi informativi (consegna della memoria nella guida);
 * - CD-05: simulazione con criticità bloccanti inviata dall'Ufficio Gare → override del Direttore Generale;
 * - CD-06: simulazione senza criticità inviata dall'Ufficio Gare → approvazione del Validatore.
 */
export function applyDemoActions(db: Db): void {
  const struttura = seedActor(db, "struttura.si");
  const gare = seedActor(db, "gare");
  const draft = createDraft(db, struttura, {
    title: "Rinnovo licenze e supporto della piattaforma di business intelligence",
    type: "DIRECT_AWARD_MEPA",
    instrument: "MEPA",
    programmed: "85400.00",
    annual: { "2026": "25620.00", "2027": "59780.00" },
    memoryDue: "2026-10-16",
  });
  db.prepare("UPDATE procedures SET dataset = 'casi-demo' WHERE code = ?").run(draft.code);
  const plans: { code: string; source: string; date: string; cause: string; notes: string }[] = [
    {
      code: "CD-05",
      source: "AWARD",
      date: "2026-12-14",
      cause: "MILESTONE_OVERDUE",
      notes: "Verifica dell'anomalia delle offerte: la commissione stima la proposta di aggiudicazione a metà dicembre.",
    },
    {
      code: "CD-06",
      source: "AWARD",
      date: "2026-10-15",
      cause: "MILESTONE_OVERDUE",
      notes: "Il fornitore della convenzione ha chiesto la proroga per l'attivazione del nuovo listino.",
    },
  ];
  for (const s of plans) {
    const sim = createSimulation(db, gare, s.code, { source: s.source, candidateDate: s.date, kind: "MANUAL", cause: s.cause, notes: s.notes });
    submitSimulation(db, gare, sim.simulation_id);
  }
}
