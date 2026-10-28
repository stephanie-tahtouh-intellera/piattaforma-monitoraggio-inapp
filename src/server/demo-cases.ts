import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { documentFile } from "@/application/documents";
import { systemNowIso } from "@/infrastructure/clock";
import type { Db } from "@/infrastructure/db/connection";
import { createDraft } from "./admin-commands";
import type { Actor } from "./auth";
import { createSimulation, submitSimulation } from "./commands";

/** Attore del seed: stessi controlli RBAC degli utenti, nessuna sessione. */
async function seedActor(db: Db, login: string): Promise<Actor> {
  const u = (await db.prepare("SELECT id, login, name, role, structure_scope, supplier_code FROM users WHERE login = ?").get(login)) as
    | { id: number; login: string; name: string; role: Actor["role"]; structure_scope: string; supplier_code: string | null }
    | undefined;
  if (!u) throw new Error(`Utente demo mancante: ${login}`);
  return { userId: u.id, login: u.login, name: u.name, role: u.role, structureScope: u.structure_scope, supplierCode: u.supplier_code, impersonatedBy: null, sessionHash: "seed" };
}

/**
 * Azioni iniziali dei casi dimostrativi (DEC-105), eseguite con i comandi applicativi
 * così che stato, versioni e audit siano identici a quelli prodotti dalla UI:
 * - bozza BZ-001 della Struttura Sistemi informativi: la procedura che il percorso demo porta dal piano alla stipula;
 * - CD-05: simulazione con criticità bloccanti inviata dall'Amministrazione → override dell'Ufficio Gare (DEC-110);
 * - CD-06: simulazione senza criticità inviata dall'Amministrazione → approvazione dell'Ufficio Gare (DEC-110).
 */
export async function applyDemoActions(db: Db): Promise<void> {
  const struttura = await seedActor(db, "struttura.si");
  const gare = await seedActor(db, "gare");
  const amministrazione = await seedActor(db, "amministrazione");
  void gare;
  const draft = await createDraft(db, struttura, {
    title: "Rinnovo licenze e supporto della piattaforma di business intelligence",
    type: "DIRECT_AWARD_MEPA",
    instrument: "MEPA",
    programmed: "85400.00",
    annual: { "2026": "25620.00", "2027": "59780.00" },
    memoryDue: "2026-10-16",
  });
  // Procedura guida del percorso demo: fascicolo con memoria e documento tecnico, completezza documentale non tracciata
  await db.prepare("UPDATE procedures SET dataset = 'casi-demo', documents_tracked = 0 WHERE code = ?").run(draft.code);
  const pid = ((await db.prepare("SELECT id FROM procedures WHERE code = ?").get(draft.code)) as { id: number }).id;
  for (const [type, file, title] of [
    ["MEMORIA", "memoria.pdf", "Memoria per il Direttore Generale – BZ-001"],
    ["DOCUMENTO_TECNICO", "documento_tecnico.pdf", "Documento tecnico – BZ-001"],
  ] as const) {
    const full = documentFile(`casi:BZ-001/${file}`);
    const buf = readFileSync(full);
    await db
      .prepare(
        `INSERT INTO documents (procedure_id, file_path, file_name, sha256, size_bytes, doc_type, title, uploaded_by, uploaded_at, association_method, association_confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'struttura.si', ?, 'UPLOAD', '1.00')`,
      )
      .run(pid, `casi:BZ-001/${file}`, file, createHash("sha256").update(buf).digest("hex"), statSync(full).size, type, title, systemNowIso());
  }
  const plans: { code: string; by: Actor; source: string; date: string; cause: string; notes: string }[] = [
    {
      code: "CD-05",
      by: amministrazione,
      source: "AWARD",
      date: "2026-12-14",
      cause: "MILESTONE_OVERDUE",
      notes: "Verifica dell'anomalia delle offerte: la commissione stima la proposta di aggiudicazione a metà dicembre.",
    },
    {
      code: "CD-06",
      by: amministrazione,
      source: "AWARD",
      date: "2026-10-15",
      cause: "MILESTONE_OVERDUE",
      notes: "Il fornitore della convenzione ha chiesto la proroga per l'attivazione del nuovo listino.",
    },
  ];
  for (const s of plans) {
    const sim = await createSimulation(db, s.by, s.code, { source: s.source, candidateDate: s.date, kind: "MANUAL", cause: s.cause, notes: s.notes });
    await submitSimulation(db, s.by, sim.simulation_id);
  }
}
