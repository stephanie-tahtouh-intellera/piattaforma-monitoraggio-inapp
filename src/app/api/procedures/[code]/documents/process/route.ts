import { processPendingDocuments } from "@/application/documents";
import { require as requireAction, requireProcedure } from "@/server/authz";
import { route } from "@/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Elabora i documenti in attesa della sola procedura (DEC-143). Il pulsante del fascicolo
 * passava da /api/documents/process, che elabora l'intero portafoglio: con l'OCR delle
 * scansioni la richiesta superava il limite di tempo della funzione (errore 504).
 */
export const POST = route(async ({ db, actor, params }) => {
  const a = actor!;
  requireAction(a, "documents.import");
  const p = await requireProcedure(db, a, params.code!);
  return processPendingDocuments(db, a.login, p.id);
});
